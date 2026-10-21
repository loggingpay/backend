const { createStripeKeys } = require("../models/stripeKeys.model");

const createStripeKeysController = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const { secret_key, webhook_key } = req.body;

    if (!secret_key || !webhook_key) {
      return res.status(400).json({
        message: "Stripe secret key and webhook secret are required",
      });
    }

    const result = await createStripeKeys(tenant_id, secret_key, webhook_key);

    return res.status(201).json({
      message: "Stripe keys saved successfully",
      id: result.id,
      tenant_id: result.tenant_id,
    });
  } catch (err) {
    console.error("Create Stripe keys error:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        message: "Stripe keys are already configured for this tenant",
      });
    }

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createStripeKeysController,
};
