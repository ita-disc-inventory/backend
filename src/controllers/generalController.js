const supabase = require('../config/supabase');

// const { v4: uuidv4 } = require('uuid');
const generalController = {
  async getOrders(req, res) {
    try {
      const { data, error } = await supabase.from('orders').select('*');
      if (error) {
        console.error('Error getting items:', error);
        return res.status(400).json({ error: error.message });
      }
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  async getBudget(req, res) {
    try {
      const { data, error } = await supabase.from('programs').select('*');
      if (error) {
        console.error('Error getting programs:', error);
        return res.status(400).json({ error: error.message });
      }

      res.status(200).json(data);
      
    }
    catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = generalController;
