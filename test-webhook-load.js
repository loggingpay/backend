const Stripe = require("stripe");
const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("Missing Stripe environment variables in .env");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const webhookId = "DBy5-Y9Ed-Dguk";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const url = `http://localhost:5000/v1/api/webhooks/${webhookId}`;

const TOTAL_REQUESTS = 1000;
const CONCURRENCY = 25;

const results = [];
let nextRequest = 0;

function createEvent() {
  return {
    id: `evt_load_${crypto.randomUUID().replace(/-/g, "")}`,
    object: "event",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: `pi_load_${crypto.randomUUID().replace(/-/g, "")}`,
        object: "payment_intent",
        amount: 1000,
        amount_received: 1000,
        currency: "usd",
        status: "succeeded",
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    created: Math.floor(Date.now() / 1000),
    api_version: "2025-03-31.basil",
  };
}

async function sendOne() {
  const event = createEvent();
  const payload = JSON.stringify(event);

  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });

  const start = performance.now();

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": signature,
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    results.push({
      status: response.status,
      latency: performance.now() - start,
    });
  } catch (error) {
    results.push({
      status: "ERROR",
      latency: performance.now() - start,
      message: error.message,
    });
  }
}

async function worker() {
  while (true) {
    const index = nextRequest++;
    if (index >= TOTAL_REQUESTS) return;
    await sendOne();
  }
}

async function main() {
  console.log(`Sending ${TOTAL_REQUESTS} events`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log("Make sure your local backend is running.\n");

  const start = performance.now();

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const durationMs = performance.now() - start;
  const latencies = results.map((r) => r.latency).sort((a, b) => a - b);

  const counts = {};
  for (const result of results) {
    counts[result.status] = (counts[result.status] || 0) + 1;
  }

  const percentile = (p) =>
    latencies[
      Math.min(
        latencies.length - 1,
        Math.ceil((p / 100) * latencies.length) - 1,
      )
    ] ?? 0;

  console.log("\n--- Load Test Results ---");
  console.log("Completed:", results.length);
  console.log("HTTP status counts:", counts);
  console.log("Duration:", (durationMs / 1000).toFixed(2), "seconds");
  console.log(
    "Throughput:",
    (results.length / (durationMs / 1000)).toFixed(2),
    "requests/sec",
  );
  console.log(
    "Average latency:",
    (
      latencies.reduce((sum, n) => sum + n, 0) / (latencies.length || 1)
    ).toFixed(2),
    "ms",
  );
  console.log("P95 latency:", percentile(95).toFixed(2), "ms");
  console.log("P99 latency:", percentile(99).toFixed(2), "ms");
  console.log("Max latency:", (latencies.at(-1) ?? 0).toFixed(2), "ms");

  const errors = results.filter((r) => r.status === "ERROR" || r.status >= 500);

  console.log("Transport/server errors:", errors.length);

  if (errors.length) {
    console.log("First errors:", errors.slice(0, 5));
  }
}

main().catch(console.error);
