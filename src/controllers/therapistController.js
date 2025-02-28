const supabase = require('../config/supabase');

const therapistController = {
  async postNewOrder(req, res) {
    try {
      // check if item id exists in items table
      const { data: items, error: checkItemError } = await supabase.from('items').select().eq('item_id', req.body.item_id);
      if (checkItemError) {
        console.error('Error checking item:', checkItemError);
        return res.status(400).json({ error: checkItemError.message });
      }
      if (items.length === 0) {
        // insert item to items table
        const { error: insertItemError } = await supabase.from('items').insert([
          {
            item_id: req.body.item_id,
            order_link: req.body.order_link,
            description: req.body.description,
            price_per_unit: req.body.price_per_unit
          },
        ]);
        if (insertItemError) {
          console.error('Error inserting new item to items table:', insertItemError);
          return res.status(400).json({ error: insertItemError.message });
        }
      }

      const { error } = await supabase.from('orders').insert([
        {
          request_date: req.body.request_date,
          priority_level: req.body.priority_level,
          quantity: req.body.quantity,
          total_cost: req.body.total_cost,
          status: "pending",
          program_id: req.body.program_id,
          requestor_id: req.body.requestor_id,
          item_id: req.body.item_id,
        },
      ]);
      if (error) {
        console.error('Error inserting new order to orders table:', error);
        return res.status(400).json({ error: error.message });
      }
      

      // update program budget in programs table
      const { data: programs, error: checkProgramError } = await supabase.from('programs').select().eq('program_id', req.body.program_id);
      if (checkProgramError) {
        console.error('Error checking program:', checkProgramError);
        return res.status(400).json({ error: checkProgramError.message });
      }

      if (programs.length === 0) {
        return res.status(400).json({ error: 'Program not found' });
      }

      const program = programs[0];
      const newBudget = program.program_budget - req.body.total_cost;
      const { error: updateProgramError } = await supabase.from('programs').update({ program_budget: newBudget }).eq('program_id', req.body.program_id);
      if (updateProgramError) {
        console.error('Error updating program budget:', updateProgramError);
        return res.status(400).json({ error: updateProgramError.message });
      }

      res.status(200).json({
        message: 'order created successfully',
      });
    } catch (error) {
      res.status(500).json(error.message);
    }
  },

  async deleteOrder(req, res) {
    try {
      // set order status to cancelled
      const { error: updateError } = await supabase.from('orders').update({ status: 'cancelled' }).eq('order_id', req.params.order_id);
      if (updateError) {
        console.error('Error deleting order:', updateError);
        return res.status(400).json({ error: updateError.message });
      }
      res.status(200).json({
        message: 'order deleted successfully',
      });
    } catch (error) {
      res.status(500).json(error.message);
    }
  },


};

module.exports = therapistController;
