const express = require("express");
const router = express.Router();

const webhookSignatureMiddleware = require("../middleware/webhookSignature.middleware");
const { receiveWebhook } = require("../controllers/webhookEvent.controller");

router.post(
  "/:webhook_id",
  express.raw({ type: "application/json" }),
  webhookSignatureMiddleware,
  receiveWebhook,
);

module.exports = router;
