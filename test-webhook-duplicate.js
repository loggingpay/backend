const Stripe = require("stripe");
const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const webhookId = "DBy5-Y9Ed-Dguk";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function main() {
  const event = {
    id: `evt_test_${crypto.randomUUID().replace(/-/g, "")}`,
    object: "event",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_test_duplicate",
        object: "payment_intent",
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    created: Math.floor(Date.now() / 1000),
    api_version: "2025-03-31.basil",
  };

  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });

  const url = `http://localhost:5000/v1/api/webhooks/${webhookId}`;

  for (let i = 1; i <= 2; i++) {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": signature,
      },
      validateStatus: () => true,
    });

    console.log(`Request ${i}:`, response.status, response.data);
  }

  console.log("Same event ID used twice:", event.id);
}

main().catch(console.error);
