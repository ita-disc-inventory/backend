const express = require("express");
const router = express.Router();
const generalController = require("../controllers/generalController");

router.get("/orders", generalController.getOrders);
router.get("/budget", generalController.getBudget);
module.exports = router;
