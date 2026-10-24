const express = require("express");
const router = express.Router();

const {
  getPaymentEventsController,
  getPaymentEventSummaryController,
  getPaymentEventAnalyticsController,
} = require("../controllers/paymentEvents.controller");

const authenticateToken = require("../middleware/authToken");

router.get("/", authenticateToken, getPaymentEventsController);
router.get("/summary", authenticateToken, getPaymentEventSummaryController);
router.get("/analytics", authenticateToken, getPaymentEventAnalyticsController);

module.exports = router;
