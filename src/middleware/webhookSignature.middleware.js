const Stripe = require("stripe");
const { getWebhookSecret } = require("../models/stripeKey.model");

const webhookSignatureMiddleware = async (req, res, next) => {
  try {
    const { webhook_id } = req.params;
    const signature = req.headers["stripe-signature"];

    if (!webhook_id || !signature) {
      return res.status(400).json({
        message: "Webhook ID or Stripe signature missing",
      });
    }

    const webhookSecret = await getWebhookSecret(webhook_id);

    if (!webhookSecret) {
      return res.status(404).json({
        message: "Webhook configuration not found",
      });
    }

    const stripe = new Stripe(process.env.STRIPE_API_KEY);

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret,
    );

    req.stripeEvent = event;

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
