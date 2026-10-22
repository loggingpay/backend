const pool = require("../../db/conn");
const { nanoid } = require("nanoid");

const createPaymentEvent = async ({
  tenant_id,
  stripe_event_id,
  payment_intent_id,
  event_type,
  amount,
  currency,
  payment_status,
  metadata,
}) => {
  const id = nanoid(12);

  const query = `
    INSERT INTO payment_events (
      id, tenant_id, stripe_event_id, payment_intent_id,
      event_type, amount, currency, payment_status, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (tenant_id, stripe_event_id) DO NOTHING
    RETURNING *
  `;

  const result = await pool.query(query, [
    id,
    tenant_id,
    stripe_event_id,
    payment_intent_id ?? null,
    event_type,
    amount ?? null,
    currency ?? null,
    payment_status ?? null,
    metadata == null ? null : JSON.stringify(metadata),
  ]);

  return result.rows[0] || null;
};

module.exports = { createPaymentEvent };
