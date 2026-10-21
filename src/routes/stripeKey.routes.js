const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authToken");
const {
  createStripeKeysController,
  updateWebhookController,
} = require("../controllers/stripeKey.controller");

router.post("/add", authenticateToken, createStripeKeysController);
router.put("/update-webhook", authenticateToken, updateWebhookController);

module.exports = router;
