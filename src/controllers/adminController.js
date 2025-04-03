const supabase = require("../config/supabase");

const adminController = {
  async approveOrder(req, res) {
    try {
      // check if order is not cancelled and get program's budget
      const order_id = req.params.order_id;
      const [
        { data: orders, error: checkOrderError },
        { data: orderCostBudget, error: getCostError },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select()
          .eq("order_id", order_id)
          .neq("status", "cancelled"),
        supabase
          .from("orders")
          .select("total_cost, program_id, programs(program_budget)")
          .eq("order_id", order_id)
          .single(),
      ]);

      if (orders.length === 0) {
        console.error("Order is cancelled");
        return res.status(400).json({ error: "Order is cancelled" });
      }
      if (checkOrderError) {
        console.error("An error occurred:", checkOrderError);
        return res.status(400).json({ error: checkOrderError.message });
      }

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
        ],
      );

      if (orderError || budgetError) {
        console.error("Error processing request:", orderError || budgetError);
        return res
          .status(400)
          .json({ error: orderError?.message || budgetError?.message });
      }
      res.status(200).json({ message: "Status updated to approved" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  async denyOrder(req, res) {
    try {
      // check if order is not cancelled
      const order_id = req.params.order_id;
      const reason = req.body.reason_for_denial;
      const { data: orders, error: checkOrderError } = await supabase
        .from("orders")
        .select()
        .eq("order_id", order_id)
        .neq("status", "cancelled");
      if (orders.length === 0) {
        console.error("Order is cancelled");
        return res.status(400).json({ error: "Order is cancelled" });
      }
      // set order status to denied
      const { error } = await supabase
        .from("orders")
        .update({ status: "denied", reason_for_denial: reason })
        .eq("order_id", order_id);
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
      // check if order is approved
      const { data: orders, error: checkOrderError } = await supabase
        .from("orders")
        .select()
        .eq("order_id", order_id)
        .eq("status", "approved");
      if (orders.length === 0) {
        console.error("Order is not approved");
        return res.status(400).json({ error: "Order is not approved" });
      }
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
        console.error("Error approving order:", error);
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
      const { data: orders, error: checkOrderError } = await supabase
        .from("orders")
        .select()
        .eq("order_id", order_id)
        .eq("status", "arrived");
      if (orders.length === 0) {
        console.error("Order has not arrived yet");
        return res.status(400).json({ error: "Order has not arrived yet" });
      }
      const { error } = await supabase
        .from("orders")
        .update({ status: "ready" })
        .eq("order_id", order_id);
      if (error) {
        console.error("Error approving order:", error);
        return res.status(400).json({ error: error.message });
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
};

module.exports = adminController;
