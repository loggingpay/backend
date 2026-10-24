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
  payment_method,
  payment_method_id,
}) => {
  const id = nanoid(12);

  const query = `
    INSERT INTO payment_events (
      id, tenant_id, stripe_event_id, payment_intent_id,
      event_type, amount, currency, payment_status, metadata,payment_method,payment_method_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
    payment_method ?? null,
    payment_method_id ?? null,
  ]);

  return result.rows[0] || null;
};

const getPaymentEventDetails = async ({
  tenant_id,
  event_type,
  currency,
  from,
  to,
  page = 1,
  limit = 50,
}) => {
  const conditions = [
    "pe.tenant_id = $1",
    "pe.event_type IN ('payment_intent.succeeded','payment_intent.payment_failed')",
  ];

  const values = [tenant_id];

  if (event_type) {
    values.push(event_type);
    conditions.push(`pe.event_type = $${values.length}`);
  }

  if (currency) {
    values.push(currency);
    conditions.push(`pe.currency = $${values.length}`);
  }

  if (from) {
    values.push(from);
    conditions.push(`pe.created_at >= $${values.length}::date`);
  }

  if (to) {
    values.push(to);
    conditions.push(
      `pe.created_at < ($${values.length}::date + INTERVAL '1 day')`,
    );
  }

  const whereClause = conditions.join(" AND ");
  const countQuery = `
  SELECT COUNT(*)::int AS total
  FROM payment_events pe
  WHERE ${whereClause}
`;

  const countResult = await pool.query(countQuery, values);
  const total = countResult.rows[0].total;
  const offset = (page - 1) * limit;

  const dataValues = [...values, limit, offset];

  const dataQuery = `
  SELECT
    pe.id,
    pe.stripe_event_id,
    pe.payment_intent_id,
    pe.event_type,
    pe.amount,
    pe.currency,
    pe.payment_status,
    pe.metadata,
    pe.created_at,

    CASE
      WHEN pe.event_type = 'payment_intent.payment_failed'
      THEN COALESCE(
        we.payload->'data'->'object'->'last_payment_error'->>'decline_code',
        we.payload->'data'->'object'->'last_payment_error'->>'code',
        'Unknown'
      )
      ELSE NULL
    END AS failure_reason

  FROM payment_events pe

  LEFT JOIN webhook_events we
    ON we.tenant_id = pe.tenant_id
    AND we.stripe_event_id = pe.stripe_event_id

  WHERE ${whereClause}

  ORDER BY pe.created_at DESC
  LIMIT $${values.length + 1}
  OFFSET $${values.length + 2}
`;

  const dataResult = await pool.query(dataQuery, dataValues);

  return {
    events: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getPaymentEventSummary = async ({ from, to, tenant_id }) => {
  const conditions = [
    "tenant_id = $1",
    "event_type IN ('payment_intent.succeeded', 'payment_intent.payment_failed')",
  ];

  const values = [tenant_id];

  if (from) {
    values.push(from);
    conditions.push(`created_at >= $${values.length}::date`);
  }

  if (to) {
    values.push(to);
    conditions.push(
      `created_at < ($${values.length}::date + INTERVAL '1 day')`,
    );
  }

  const query = `
    SELECT
      COUNT(*)::int AS total_events,

      COUNT(*) FILTER (
        WHERE event_type = 'payment_intent.succeeded'
      )::int AS successful_events,

      COUNT(*) FILTER (
        WHERE event_type = 'payment_intent.payment_failed'
      )::int AS failed_events,

      COALESCE(
        SUM(amount) FILTER (
          WHERE event_type = 'payment_intent.succeeded'
        ),
        0
      ) AS total_successful_amount,

      ROUND(
        COUNT(*) FILTER (
          WHERE event_type = 'payment_intent.succeeded'
        ) * 100.0 / NULLIF(COUNT(*), 0),
        2
      ) AS success_rate

    FROM payment_events
    WHERE ${conditions.join(" AND ")}
  `;

  const result = await pool.query(query, values);

  return result.rows[0];
};

const getPaymentEventAnalytics = async ({ tenant_id, from, to }) => {
  const values = [tenant_id, from, to];

  const dailyQuery = `
  WITH dates AS (
    SELECT generate_series(
      $2::date,
      $3::date,
      INTERVAL '1 day'
    )::date AS day
  )
  SELECT
    TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
    COUNT(pe.id)::int AS total_events,
    COUNT(pe.id) FILTER (
      WHERE pe.event_type = 'payment_intent.succeeded'
    )::int AS successful_events,
    COUNT(pe.id) FILTER (
      WHERE pe.event_type = 'payment_intent.payment_failed'
    )::int AS failed_events
  FROM dates d
  LEFT JOIN payment_events pe
    ON pe.tenant_id = $1
    AND pe.created_at >= d.day
    AND pe.created_at < d.day + INTERVAL '1 day'
    AND pe.event_type IN (
      'payment_intent.succeeded',
      'payment_intent.payment_failed'
    )
  GROUP BY d.day
  ORDER BY d.day;
`;

  const amountsQuery = `
  SELECT
    TO_CHAR(pe.created_at, 'YYYY-MM-DD') AS date,
    pe.currency,
    COALESCE(
      SUM(pe.amount) FILTER (
        WHERE pe.event_type = 'payment_intent.succeeded'
      ), 0
    ) AS successful_amount,
    COALESCE(
      SUM(pe.amount) FILTER (
        WHERE pe.event_type = 'payment_intent.payment_failed'
      ), 0
    ) AS failed_amount
  FROM payment_events pe
  WHERE pe.tenant_id = $1
    AND pe.created_at >= $2::date
    AND pe.created_at < ($3::date + INTERVAL '1 day')
    AND pe.event_type IN (
      'payment_intent.succeeded',
      'payment_intent.payment_failed'
    )
  GROUP BY
    TO_CHAR(pe.created_at, 'YYYY-MM-DD'),
    pe.currency
  ORDER BY
    TO_CHAR(pe.created_at, 'YYYY-MM-DD'),
    pe.currency;
`;

  const eventTypesQuery = `
    SELECT
      event_type,
      COUNT(*)::int AS count
    FROM payment_events
    WHERE tenant_id = $1
      AND created_at >= $2::date
      AND created_at < ($3::date + INTERVAL '1 day')
    GROUP BY event_type
    ORDER BY count DESC;
  `;

  const failureReasonsQuery = `
    SELECT
  COALESCE(
    we.payload->'data'->'object'->'last_payment_error'->>'decline_code',
    we.payload->'data'->'object'->'last_payment_error'->>'code',
    'Unknown'
  ) AS failure_reason,
  COUNT(*)::int AS count
FROM payment_events pe
JOIN webhook_events we
  ON we.tenant_id = pe.tenant_id
  AND we.stripe_event_id = pe.stripe_event_id
WHERE pe.tenant_id = $1
  AND pe.created_at >= $2::date
  AND pe.created_at < ($3::date + INTERVAL '1 day')
  AND pe.event_type = 'payment_intent.payment_failed'
GROUP BY failure_reason
ORDER BY count DESC;
  `;

  const [dailyResult, eventTypesResult, failureReasonsResult] =
    await Promise.all([
      pool.query(dailyQuery, values),
      pool.query(eventTypesQuery, values),
      pool.query(failureReasonsQuery, values),
    ]);

  return {
    daily: dailyResult.rows,
    event_types: eventTypesResult.rows,
    failure_reasons: failureReasonsResult.rows,
  };
};

module.exports = {
  createPaymentEvent,
  getPaymentEventDetails,
  getPaymentEventSummary,
  getPaymentEventAnalytics,
};
