const {
  createWebhookEvent,
  getTenantWebhooks,
  getWebhookById,
} = require("../models/webhookEvent.model");

const receiveWebhook = async (req, res) => {
  try {
    const event = req.stripeEvent;

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

    if (!result) {
      return res.status(200).json({
        received: true,
        duplicate: true,
      });
    }

    return res.status(200).json({
      received: true,
      duplicate: false,
      event_id: result.id,
    });
  } catch (err) {
    console.error("Webhook storage error:", err.message);

    return res.status(500).json({
      message: "Webhook event could not be stored",
    });
  }
};

const getTenantWebhooksController = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const user_id = req.user.id;
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
    const user_id = req.user.id;
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
