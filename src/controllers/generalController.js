const supabase = require("../config/supabase");
const { getAllUsers } = require("./authController");

// const { v4: uuidv4 } = require('uuid');
const generalController = {
  async getOrders(req, res) {
    try {
      // get all orders, join with users, programs, items
      const { data, error } = await supabase
        .from("orders")
        .select(
          "*, users(firstname,lastname, specialization), programs(program_title), items(*)",
        )
        .order("request_date", { ascending: false });
      if (error) {
        console.error("Error getting items:", error);
        return res.status(400).json({ error: error.message });
      }
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  async getBudget(req, res) {
    try {
      const { data, error } = await supabase.from("programs").select("*");
      if (error) {
        console.error("Error getting programs:", error);
        return res.status(400).json({ error: error.message });
      }

      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = generalController;
