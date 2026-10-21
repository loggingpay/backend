const express = require("express");
const router = express.Router();

const webhookSignatureMiddleware = require("../middleware/webhookSignature.middleware");
const authenticateToken = require("../middleware/authToken");

const {
  receiveWebhook,
  getTenantWebhooksController,
  getWebhookByIdController,
} = require("../controllers/webhookEvent.controller");

router.post(
  "/:webhook_id",
  express.raw({ type: "application/json" }),
  webhookSignatureMiddleware,
  receiveWebhook,
);

router.get("/", authenticateToken, getTenantWebhooksController);

router.get("/:event_id", authenticateToken, getWebhookByIdController);

module.exports = router;
