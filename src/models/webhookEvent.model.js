const pool = require("../../db/conn");
const { nanoid } = require("nanoid");

const createWebhookEvent = async ({
  tenant_id,
  stripe_event_id,
  event_type,
  payload,
}) => {
  const id = nanoid(12);

  const query = `
        INSERT INTO webhook_events (
        id,
        tenant_id,
        stripe_event_id,
        event_type,
        payload
        )
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (tenant_id, stripe_event_id) DO NOTHING
        RETURNING id, tenant_id, stripe_event_id, event_type, received_at
    `;

  const values = [
    id,
    tenant_id,
    stripe_event_id,
    event_type,
    JSON.stringify(payload),
  ];

  const result = await pool.query(query, values);

  return result.rows[0] || null;
};

module.exports = { createWebhookEvent };
