const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.put("/approve/:order_id", adminController.approveOrder);
router.put("/deny/:order_id", adminController.denyOrder);
router.put("/tracking/:order_id", adminController.addTrackingNumber);
router.put("/arrived/:order_id", adminController.orderArrived);
router.put("/ready/:order_id", adminController.orderReady);
router.put("/budget/:program_id", adminController.updateBudget);

module.exports = router;
