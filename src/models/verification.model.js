const pool = require("../../db/conn");
const { nanoid } = require("nanoid");
const crypto = require("crypto");

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const hashVerificationToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const createVerificationToken = async (user_id) => {
  const id = nanoid(12);
  const token = generateVerificationToken();
  const tokenHash = hashVerificationToken(token);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Purane active tokens ko revoke karein
    await client.query(
      `
      UPDATE verification_emails
      SET revoked_status = TRUE
      WHERE user_id = $1
        AND revoked_status = FALSE
        AND used_at IS NULL;
      `,
      [user_id],
    );

    // 2. Naya verification token insert karein
    const insertQuery = `
      INSERT INTO verification_emails (
        id,
        user_id,
        verification_token,
        sent_at,
        expires_at,
        revoked_status
      )
      VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '24 hours', FALSE)
      RETURNING id, user_id, sent_at, expires_at;
    `;

    const result = await client.query(insertQuery, [id, user_id, tokenHash]);

    await client.query("COMMIT");

    return {
      verification: result.rows[0],
      token,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const verifyEmailToken = async (token) => {
  const tokenHash = hashVerificationToken(token);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
      UPDATE verification_emails
      SET used_at = NOW(),
          revoked_status = TRUE
      WHERE verification_token = $1
        AND revoked_status = FALSE
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING id, user_id;
    `;

    const result = await client.query(query, [tokenHash]);

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createVerificationToken,
  verifyEmailToken,
};
