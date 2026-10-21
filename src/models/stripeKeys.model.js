const pool = require("../../db/conn");
const { nanoid } = require("nanoid");

const createStripeKeys = async (tenant_id, secret_key, webhook_key) => {
  const id = nanoid(11);

  const query = `
    INSERT INTO stripe_keys (
      id,
      tenant_id,
      secret_key_encrypted,
      webhook_secret_encrypted
    )
    VALUES (
      $1,
      $2,
      encode(pgp_sym_encrypt($3, $4), 'base64'),
      encode(pgp_sym_encrypt($5, $6), 'base64')
    )
    RETURNING id, tenant_id
  `;

  const result = await pool.query(query, [
    id,
    tenant_id,
    secret_key,
    process.env.STRIPE_ENCRYPTION_KEY,
    webhook_key,
    process.env.WEBHOOK_ENCRYPTION_KEY,
  ]);

  return result.rows[0];
};

module.exports = { createStripeKeys };
