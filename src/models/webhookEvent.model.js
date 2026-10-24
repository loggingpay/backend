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

const getTenantWebhooks = async ({
  tenant_id,
  user_id,
  event_type,
  from,
  to,
  page = 1,
  limit = 50,
}) => {
  const conditions = [
    "webhook_events.tenant_id = $1",
    `EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = $2
        AND users.tenant_id = webhook_events.tenant_id
    )`,
  ];

  const values = [tenant_id, user_id];

  if (event_type) {
    values.push(event_type);
    conditions.push(`event_type = $${values.length}`);
  }

  if (from) {
    values.push(from);
    conditions.push(`received_at >= $${values.length}::date`);
  }

  if (to) {
    values.push(to);
    conditions.push(
      `received_at < ($${values.length}::date + INTERVAL '1 day')`,
    );
  }

  const whereClause = conditions.join(" AND ");

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM webhook_events
    WHERE ${whereClause}
  `;

  const countResult = await pool.query(countQuery, values);
  const total = countResult.rows[0].total;

  const offset = (page - 1) * limit;
  const dataValues = [...values, limit, offset];

  const dataQuery = `
    SELECT
      id,
      stripe_event_id,
      event_type,
      received_at,
      processing_status,
      processed_at
    FROM webhook_events
    WHERE ${whereClause}
    ORDER BY received_at DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const dataResult = await pool.query(dataQuery, dataValues);

  return {
    webhooks: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
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

const updateWebhookEventById = async (id) => {
  const updateQuery = `UPDATE webhook_events SET processing_status = $1, processed_at = NOW() where id = $2 RETURNING id, processing_status, processed_at`;
  const result = await pool.query(updateQuery, ["processed", id]);
  return result.rows[0] || null;
};

module.exports = {
  createWebhookEvent,
  getTenantWebhooks,
  getWebhookById,
  updateWebhookEventById,
};
