const {
  createWebhookEvent,
  getTenantWebhooks,
  getWebhookById,
  updateWebhookEventById,
} = require("../models/webhookEvent.model");

const { createPaymentEvent } = require("../models/paymentEvents.model");

const receiveWebhook = async (req, res) => {
  try {
    const event = req.stripeEvent;

    console.log(event);

    if (!event) {
      return res.status(400).json({
        message: "Verified Stripe event not found",
      });
    }
    const result = await createWebhookEvent({
      tenant_id: req.tenant_id,
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event,
    });

    let paymentEventCreated = false;

    if (event.type.startsWith("payment_intent.")) {
      const payment = event.data?.object;
      let payment_status = payment?.status ?? null;
      if (event.type === "payment_intent.payment_failed") {
        payment_status = "failed";
      } else if (event.type === "payment_intent.canceled") {
        payment_status = "canceled";
      } else if (event.type === "payment_intent.succeeded") {
        payment_status = "succeeded";
      }

      const paymentResult = await createPaymentEvent({
        tenant_id: req.tenant_id,
        stripe_event_id: event.id,
        payment_intent_id: payment.id,
        event_type: event.type,
        amount: payment.amount ?? null,
        currency: payment.currency ?? null,
        payment_status,
        metadata: payment.metadata ?? null,
      });
      paymentEventCreated = Boolean(paymentResult);
    }

    if (result) {
      await updateWebhookEventById(result.id);
    }

    return res.status(200).json({
      received: true,
      duplicate: !result,
      paymentEventCreated: paymentEventCreated,
      ...(result && { event_id: result.id }),
    });
  } catch (err) {
    console.error("Webhook storage error:", err);

    return res.status(500).json({
      message: "Webhook event could not be stored",
    });
  }
};

const getTenantWebhooksController = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const result = await getTenantWebhooks(tenant_id);
    return res.status(200).json({
      success: true,
      webhooks: result,
    });
  } catch (err) {
    console.error("Webhook storage error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const getWebhookByIdController = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const event_id = req.params.event_id;
    const result = await getWebhookById(event_id, tenant_id);
    return res.status(200).json({
      success: true,
      webhook: result,
    });
  } catch (err) {
    console.error("Webhook storage error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  receiveWebhook,
  getTenantWebhooksController,
  getWebhookByIdController,
};
