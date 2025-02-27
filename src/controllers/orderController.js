const supabase = require('../config/supabase');

// const { v4: uuidv4 } = require('uuid');
const orderController = {
  async getOrders(req, res) {
    try {
      const { data, error } = await supabase.from('orders').select('*');
      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = orderController;
