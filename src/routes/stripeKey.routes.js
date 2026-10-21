const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authToken");
const {
  createStripeKeysController,
} = require("../controllers/stripeKey.controller");

router.post("/add", authenticateToken, createStripeKeysController);

module.exports = router;
