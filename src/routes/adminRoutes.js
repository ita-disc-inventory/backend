const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.put("/approve/:order_id", adminController.approveOrder);
router.put("/deny/:order_id", adminController.denyOrder);
router.put("/tracking/:order_id", adminController.addTrackingNumber);
router.put("/arrived/:order_id", adminController.orderArrived);
router.put("/ready/:order_id", adminController.orderReady);
router.put("/budget/:program_id", adminController.updateBudget);
router.put("/revert/:order_id", adminController.revertOrder);
router.get("/weekly", adminController.getWeeklyOrders);

// New routes for user management
router.get("/users", adminController.getAllUsers);
router.put("/users/:user_id", adminController.updateUser);

module.exports = router;
