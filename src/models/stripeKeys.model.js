const pool = require("../../db/conn");
const { nanoid, customAlphabet } = require("nanoid");

const generateWebhookId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  12,
);

const createStripeKeys = async (tenant_id, secret_key, webhook_key) => {
  const id = nanoid(11);
  const rawWebhookId = generateWebhookId();
  const webhook_id = `${rawWebhookId.slice(0, 4)}-${rawWebhookId.slice(4, 8)}-${rawWebhookId.slice(8, 12)}`;
  const query = `
    INSERT INTO stripe_keys (
      id,
      tenant_id,
      secret_key_encrypted,
      webhook_secret_encrypted,
      webhook_id
    )
    VALUES (
      $1,
      $2,
      encode(pgp_sym_encrypt($3, $4), 'base64'),
      encode(pgp_sym_encrypt($5, $6), 'base64'),
      $7
    )
    RETURNING id, tenant_id, webhook_id
  `;

  const result = await pool.query(query, [
    id,
    tenant_id,
    secret_key,
    process.env.STRIPE_ENCRYPTION_KEY,
    webhook_key,
    process.env.WEBHOOK_ENCRYPTION_KEY,
    webhook_id,
  ]);

  return result.rows[0];
};

const updateWebhook = async (tenant_id, secret_key, webhook_key) => {
  const query = `
    UPDATE stripe_keys
    SET
      secret_key_encrypted = encode(pgp_sym_encrypt($2, $3), 'base64'),
      webhook_secret_encrypted = encode(pgp_sym_encrypt($4, $5), 'base64')
    WHERE tenant_id = $1
  `;
  const result = await pool.query(query, [
    tenant_id,
    secret_key,
    process.env.STRIPE_ENCRYPTION_KEY,
    webhook_key,
    process.env.WEBHOOK_ENCRYPTION_KEY,
  ]);
  return result.rows[0];
};

const getWebhookConfig = async (webhook_id) => {
  const query = `
    SELECT
      tenant_id,
      pgp_sym_decrypt(
        decode(webhook_secret_encrypted, 'base64'),
        $2
      ) AS webhook_secret
    FROM stripe_keys
    WHERE webhook_id = $1
  `;

  const result = await pool.query(query, [
    webhook_id,
    process.env.WEBHOOK_ENCRYPTION_KEY,
  ]);

  return result.rows[0] || null;
};

module.exports = { createStripeKeys, getWebhookConfig, updateWebhook };
