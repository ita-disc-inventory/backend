const { Resend } = require("resend");
const supabase = require("../config/supabase");
const { getAllUsers } = require("./authController");

// Email sending function
const sendEmails = async (requestorEmail, emailSubject, emailBody) => {
  console.log('===== SENDING EMAIL =====');
  console.log(`To: ${requestorEmail}`);
  console.log(`Subject: ${emailSubject}`);
  console.log(`Body: ${emailBody}`);
  console.log('API Key present:', !!process.env.RESEND_API_KEY);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    console.log('Resend instance created');

    try {
      console.log('Attempting to send email...');
      const { data, error } = await resend.emails.send({
        from: "ITA Chicago <jwolfe@itachicago.org>",
        to: [requestorEmail],
        subject: `${emailSubject}`,
        html: `<p>${emailBody}</p>`,
      });

      if (error) {
        console.error('RESEND API ERROR:', error);
        return { success: false, error };
      }

      console.log('EMAIL SENT SUCCESSFULLY:', data);
      return { success: true, data };
    } catch (err) {
      console.error('UNEXPECTED EMAIL ERROR:', err);
      return { success: false, error: err };
    }
  } catch (initError) {
    console.error('ERROR INITIALIZING RESEND:', initError);
    return { success: false, error: initError };
  }
};

const adminController = {
  async approveOrder(req, res) {
    try {
      // // first get program's budget
      const order_id = req.params.order_id;
      const { data: orderCostBudget, error: getCostError } = await supabase
        .from("orders")
        .select("total_cost, program_id, programs(program_budget)")
        .eq("order_id", order_id)
        .single();

      // Check for cost and budget retrieval error

      if (getCostError) {
        console.error("Error getting cost and budget:", getCostError);
        return res.status(400).json({ error: getCostError.message });
      }
      // check if program's budget is sufficient
      if (
        orderCostBudget.programs.program_budget < orderCostBudget.total_cost
      ) {
        console.error("Insufficient budget");
        return res.status(400).json({ error: "Insufficient budget" });
      }

      // set order status to approved and update program's budget
      const newbudget =
        orderCostBudget.programs.program_budget - orderCostBudget.total_cost;
      const [{ error: orderError }, { error: budgetError }] = await Promise.all(
        [
          supabase
            .from("orders")
            .update({ status: "approved", reason_for_denial: null })
            .eq("order_id", order_id),
          supabase
            .from("programs")
            .update({ program_budget: newbudget })
            .eq("program_id", orderCostBudget.program_id),
        ]
      );

      if (orderError || budgetError) {
        console.error("Error processing request:", orderError || budgetError);
        return res
          .status(400)
          .json({ error: orderError?.message || budgetError?.message });
      }

      // get user email of requestor
      const { data: requestorData, error: requestorError } = await supabase
        .from("orders")
        .select("requestor_id, users(email), items(*)")
        .eq("order_id", order_id)
        .single();
      if (requestorError) {
        console.error("Error getting requestor data:", requestorError);
      }
      console.log("order id:", order_id);
      console.log("requestor data:", requestorData);
      const requestorEmail = requestorData.users.email;
      const itemName = requestorData.items.item_name || "<no-name-provided>";
      const itemLink = requestorData.items.order_link;
      try {
        const emailResult = await sendEmails(
          requestorEmail,
          "Order Approved",
          `Your order ${itemName} for ${itemLink} has been approved.`
        );
        console.log('Email result:', emailResult);
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

      res.status(200).json({ message: "Status updated to approved" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  async revertOrder(req, res) {
    try {
      // check if order is not cancelled
      const order_id = req.params.order_id;

      const { data: orderCostBudget, error: getCostError } = await supabase
        .from("orders")
        .select("total_cost, program_id, programs(program_budget), status")
        .eq("order_id", order_id)
        .single();
      if (getCostError) {
        console.error("Error getting cost and budget:", getCostError);
        return res.status(400).json({ error: getCostError.message });
      }
      const status = orderCostBudget.status;

      const newbudget =
        orderCostBudget.programs.program_budget + orderCostBudget.total_cost;
      if (status === "approved") {
        const [{ error: budgetError }, { error: revertError }] =
          await Promise.all([
            supabase
              .from("programs")
              .update({ program_budget: newbudget })
              .eq("program_id", orderCostBudget.program_id),
            supabase
              .from("orders")
              .update({ status: "pending", reason_for_denial: null })
              .eq("order_id", order_id),
          ]);
        if (budgetError || revertError) {
          console.error("Error reverting order:", budgetError || revertError);
          return res
            .status(400)
            .json({ error: revertError?.message || budgetError?.message });
        }
      } else if (status === "denied") {
        const { error: revertError } = await supabase
          .from("orders")
          .update({ status: "pending", reason_for_denial: null })
          .eq("order_id", order_id);
        if (revertError) {
          console.error("Error reverting order:", revertError);
          return res.status(400).json({ error: revertError.message });
        }
      }

      res.status(200).json({ message: "Status updated to pending" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  async denyOrder(req, res) {
    try {
      // check if order is not cancelled
      const order_id = req.params.order_id;
      const reason = req.body.reason_for_denial;

      // set order status to denied
      const { error } = await supabase
        .from("orders")
        .update({ status: "denied", reason_for_denial: reason })
        .eq("order_id", order_id);
      // get item name and link, user email
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("requestor_id, users(email), items(*)")
        .eq("order_id", order_id)
        .single();
      if (orderError) {
        console.error("Error getting order data:", orderError);
      }
      const requestorEmail = orderData.users.email;
      const itemName = orderData.items.item_name || "<no-name-provided>";
      const itemLink = orderData.items.order_link;
      sendEmails(
        requestorEmail,
        "Order Denied",
        `Your order ${itemName} for ${itemLink} has been denied. Reason: ${reason}`
      );

      if (error) {
        console.error("Error denying order:", error);
        return res.status(400).json({ error: error.message });
      }
      res.status(200).json({ message: "Status updated to denied" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async addTrackingNumber(req, res) {
    try {
      const { tracking_number } = req.body;
      const order_id = req.params.order_id;

      const { error } = await supabase
        .from("orders")
        .update({ tracking_number: tracking_number })
        .eq("order_id", order_id);
      if (error) {
        console.error("Error updating tracking number:", error);
        return res.status(400).json({ error: error.message });
      }
      res.status(200).json({ message: "Tracking number added successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  async orderArrived(req, res) {
    try {
      // update order status to arrived
      const order_id = req.params.order_id;
      const { error } = await supabase
        .from("orders")
        .update({ status: "arrived" })
        .eq("order_id", order_id);
      if (error) {
        console.error("Error setting order to arrived:", error);
        return res.status(400).json({ error: error.message });
      }

      res.status(200).json({ message: "Status updated to arrived" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  async orderReady(req, res) {
    try {
      // update order status to ready (for pickup)
      // check if order is not cancelled
      const order_id = req.params.order_id;

      const { error } = await supabase
        .from("orders")
        .update({ status: "ready" })
        .eq("order_id", order_id);
      if (error) {
        console.error("Error setting order to ready:", error);
        return res.status(400).json({ error: error.message });
      }

      // get item name and link, user email
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("requestor_id, users(email), items(*)")
        .eq("order_id", order_id)
        .single();
      if (orderError) {
        console.error("Error getting order data:", orderError);
      }
      const requestorEmail = orderData.users.email;
      const itemName = orderData.items.item_name || "<no-name-provided>";
      const itemLink = orderData.items.order_link;
      try {
        const emailResult = await sendEmails(
          requestorEmail,
          "Order Ready for Pickup",
          `Your order ${itemName} for ${itemLink} is ready for pickup.`
        );
        console.log('Email result:', emailResult);
      } catch (emailError) {
        console.error('Failed to send ready notification email:', emailError);
      }

      res.status(200).json({ message: "Status updated to ready" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async updateBudget(req, res) {
    try {
      const program_id = req.params.program_id;
      const { budget } = req.body;
      const { error } = await supabase
        .from("programs")
        .update({ program_budget: budget })
        .eq("program_id", program_id);
      if (error) {
        console.error("Error inserting new budget to programs table:", error);
        return res.status(400).json({ error: error.message });
      }
      res.status(200).json({ message: "Budget added successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  async getWeeklyOrders(req, res) {
    try {
      // get today's date
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 7
      );
      // const { start_date, end_date } = req.query;
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*, items(*)")
        .gte("request_date", startDate.toISOString().split("T")[0])
        .lte("request_date", today.toISOString().split("T")[0]);

      // need email... should we hardcode or fetch admin email from users table?
      const { data: adminData, error: adminError } = await supabase
        .from("users")
        .select("email")
        .eq("position_title", "admin");
      if (adminError) {
        console.error("Error fetching admin email:", adminError);
        return res.status(400).json({ error: adminError.message });
      }
      const emails = adminData.map((user) => user.email);

      // send email to admin with weekly orders
      const emailSubject = "Weekly Orders Summary";
      const emailBody = `Here are the orders from the past week:\n\n${orders.map((order) => `Order ID: ${order.order_id}, Item: ${order.items.item_name}, Request Date: ${order.request_date}`).join("\n")}`;
      // Send emails one by one and await each result
      for (const email of emails) {
        try {
          const emailResult = await sendEmails(email, emailSubject, emailBody);
          console.log(`Weekly summary email result for ${email}:`, emailResult);
        } catch (emailError) {
          console.error(`Failed to send weekly summary to ${email}:`, emailError);
        }
      }

      if (error) {
        console.error("Error fetching weekly orders:", error);
        return res.status(400).json({ error: error.message });
      }
      console.log(emails);
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getAllUsers(req, res) {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, username, firstname, lastname, position_title, specialization, created_at, approved")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        return res.status(400).json({ error: error.message });
      }

      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async updateUser(req, res) {
    try {
      const user_id = req.params.user_id;
      const updates = req.body;

      // Validate that only allowed fields are being updated
      const allowedFields = ['specialization', 'position_title', 'approved'];
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      const { data, error } = await supabase
        .from("users")
        .update(filteredUpdates)
        .eq("id", user_id)
        .select()
        .single();

      if (error) {
        console.error("Error updating user:", error);
        return res.status(400).json({ error: error.message });
      }

      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // function for sending emails is now defined outside the controller object
};

module.exports = adminController;
