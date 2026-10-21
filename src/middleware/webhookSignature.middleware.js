const Stripe = require("stripe");
const { getWebhookConfig } = require("../models/stripeKeys.model");

const webhookSignatureMiddleware = async (req, res, next) => {
  try {
    const { webhook_id } = req.params;
    const signature = req.headers["stripe-signature"];

    if (!webhook_id || !signature) {
      return res.status(400).json({
        message: "Webhook ID or Stripe signature missing",
      });
    }

    const config = await getWebhookConfig(webhook_id);

    if (!config) {
      return res.status(404).json({
        message: "Webhook configuration not found",
      });
    }

    const event = Stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.webhook_secret,
    );

    req.stripeEvent = event;
    req.tenant_id = config.tenant_id;

    next();
  } catch (err) {
    if (err.type === "StripeSignatureVerificationError") {
      return res.status(400).json({
        message: "Invalid webhook signature",
      });
    }

    console.error("Webhook verification error:", err.message);

    return res.status(400).json({
      message: "Webhook verification failed",
    });
  }
};

module.exports = webhookSignatureMiddleware;
