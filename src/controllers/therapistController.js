const supabase = require('../config/supabase');

const therapistController = {
  async postNewOrder(req, res) {
    try {
      // check if item id exists in items table
      const { data: items, error: checkItemError } = await supabase.from('items').select().eq('order_link', req.body.order_link);
      if (checkItemError) {
        console.error('Error checking item:', checkItemError);
        return res.status(400).json({ error: checkItemError.message });
      }

      let itemId;
      if (items.length === 0) {
        // insert item to items table
        const { data, error: insertItemError } = await supabase.from('items').insert([
          {
            order_link: req.body.order_link,
            price_per_unit: req.body.price_per_unit
          },
        ]).select();
        if (insertItemError) {
          console.error('Error inserting new item to items table:', insertItemError);
          return res.status(400).json({ error: insertItemError.message });
        }
        // get item id
        itemId = data[0].item_id;
      }
      else {
        itemId = items[0].item_id;
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
          order_description: req.body.order_description,
          item_id: itemId,
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

  async updateSpecialization(req, res) {
    try {
      const { error } = await supabase.from('users').update({ specialization: req.body.specialization }).eq('id', req.params.user_id);
      if (error) {
        console.error('Error updating specialization:', error);
        return res.status(400).json({ error: error.message });
      }
      res.status(200).json({
        message: 'specialization updated successfully',
      });
    } catch (error) {
      res.status(500).json(error.message);
    }
  },


};

module.exports = therapistController;
