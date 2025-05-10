const supabase = require("../config/supabase");

const therapistController = {
  async postNewOrder(req, res) {
    try {
      // check if user is approved in system
      const { data: user, error: userError } = await supabase
        .from("users")
        .select()
        .eq('id', req.body.requestor_id)
        .eq("approved", true)

      if (user.length === 0) {
        console.error("User is not approved:", userError);
      }

      // check if item id exists in items table
      const { data: items, error: checkItemError } = await supabase
        .from("items")
        .select()
        .eq("order_link", req.body.order_link);
      if (checkItemError) {
        console.error("Error checking item:", checkItemError);
        return res.status(400).json({ error: checkItemError.message });
      }

      let itemId;
      if (items.length === 0) {
        // insert item to items table
        const { data, error: insertItemError } = await supabase
          .from("items")
          .insert([
            {
              order_link: req.body.order_link,
              price_per_unit: req.body.price_per_unit,
              item_name: req.body.item_name,
            },
          ])
          .select();
        if (insertItemError) {
          console.error(
            "Error inserting new item to items table:",
            insertItemError,
          );
          return res.status(400).json({ error: insertItemError.message });
        }
        // get item id
        itemId = data[0].item_id;
      } else {
        itemId = items[0].item_id;
      }

      const { error } = await supabase.from("orders").insert([
        {
          request_date: req.body.request_date,
          priority_level: req.body.priority_level,
          quantity: req.body.quantity,
          total_cost: req.body.total_cost,
          status: "pending",
          program_id: req.body.program_id,
          requestor_id: req.body.requestor_id,
          order_description: req.body.order_description,
          item_id: itemId,
        },
      ]);
      if (error) {
        console.error("Error inserting new order to orders table:", error);
        return res.status(400).json({ error: error.message });
      }

      res.status(200).json({
        message: "order created successfully",
      });
    } catch (error) {
      res.status(500).json(error.message);
    }
  },

  async deleteOrder(req, res) {
    try {
      // set order status to cancelled
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("order_id", req.params.order_id);
      if (updateError) {
        console.error("Error deleting order:", updateError);
        return res.status(400).json({ error: updateError.message });
      }
      res.status(200).json({
        message: "order deleted successfully",
      });
    } catch (error) {
      res.status(500).json(error.message);
    }
  },

  async updateSpecialization(req, res) {
    try {
      const { error } = await supabase
        .from("users")
        .update({ specialization: req.body.specialization })
        .eq("id", req.params.user_id);
      if (error) {
        console.error("Error updating specialization:", error);
        return res.status(400).json({ error: error.message });
      }
      res.status(200).json({
        message: "specialization updated successfully",
      });
    } catch (error) {
      res.status(500).json(error.message);
    }
  },
};

module.exports = therapistController;
