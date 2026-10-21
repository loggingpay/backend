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

const getTenantWebhooks = async (tenant_id, user_id) => {
  const tenantWebhooks = `
    SELECT id, stripe_event_id, event_type, received_at
    FROM webhook_events
    WHERE tenant_id = $1
      AND EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = $2
          AND users.tenant_id = webhook_events.tenant_id
      )
    ORDER BY received_at DESC
  `;

  const result = await pool.query(tenantWebhooks, [tenant_id, user_id]);
  return result.rows || [];
};

const getWebhookById = async (id, tenant_id, user_id) => {
  const getWebhookQuery = `
    SELECT id, stripe_event_id, event_type, payload, processing_status, received_at
    FROM webhook_events
    WHERE id = $1
      AND tenant_id = $2
      AND EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = $3
          AND users.tenant_id = webhook_events.tenant_id
      )
  `;

  const result = await pool.query(getWebhookQuery, [id, tenant_id, user_id]);
  return result.rows[0] || null;
};

module.exports = { createWebhookEvent, getTenantWebhooks, getWebhookById };
