const express = require('express');
const router = express.Router();
const therapistController = require('../controllers/therapistController');

router.post('/order', therapistController.postNewOrder);
router.delete('/order/:order_id', therapistController.deleteOrder);


module.exports = router;