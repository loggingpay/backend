const pool = require("../../db/conn");
const { nanoid } = require("nanoid");
const bcrypt = require("bcryptjs");

// creating new user
const createUser = async (
  f_name,
  l_name,
  email,
  password,
  tenant_id,
  created_by,
) => {
  const normalizeEmail = email.trim().toLowerCase();
  const searchUser = `SELECT id FROM users WHERE email_hash = encode(hmac($1,$2,'sha256'), 'hex')`;
  const searchQuery = await pool.query(searchUser, [
    normalizeEmail,
    process.env.EMAIL_HASH_KEY,
  ]);
  if (searchQuery.rows.length > 0) {
    return "User already exists with this email";
  }
  const id = nanoid(11);
  const passwordHash = await bcrypt.hash(password, 12);
  const insertUser = `INSERT INTO users(id, f_name, l_name, email_hash,email_encrypted, password_hash, tenant_id, created_by) 
    VALUES(
    $1,
    $2,
    $3,
    encode(hmac($4, $5, 'sha256'), 'hex'),
    encode(pgp_sym_encrypt($4, $6), 'base64'),
    $7,
    $8,
    $9) 
    RETURNING id`;
  const insertQuery = await pool.query(insertUser, [
    id,
    f_name,
    l_name,
    normalizeEmail,
    process.env.EMAIL_HASH_KEY,
    process.env.EMAIL_ENCRYPTED_KEY,
    passwordHash,
    tenant_id,
    created_by,
  ]);

  return {
    message: "User Created Successfully",
    id: insertQuery.rows[0].id,
  };
};

// login existing user
const loginUser = async (email, password) => {
  const normalizeEmail = email.trim().toLowerCase();
  const selectUser = `SELECT id, tenant_id, password_hash FROM users 
    WHERE 
    email_hash =  encode(
    hmac($1,$2, 'sha256'), 'hex')`;

  const result = await pool.query(selectUser, [
    normalizeEmail,
    process.env.EMAIL_HASH_KEY,
  ]);
  if (result.rows.length == 0) {
    return "Invalid Email or Password";
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return "Invalid Email or Password";
  }

  return {
    id: user.id,
    tenant_id: user.tenant_id,
  };
};

//get user details by id

const getUserById = async (id) => {
  const getUserQuery = "SELECT id, f_name, l_name from users where id=$1";
  const result = await pool.query(getUserQuery, [id]);
  if (result.rows.length === 0) {
    return "User not found";
  }
  return result.rows[0];
};

const updatePassword = async (id, password) => {
  const getUser = "SELECT id FROM users WHERE id = $1";
  const getUserResult = await pool.query(getUser, [id]);

  if (getUserResult.rows.length === 0) {
    return "User not found";
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const updateUserQuery = `
    UPDATE users
    SET password_hash = $1,
        updated_at = NOW()
    WHERE id = $2
  `;

  await pool.query(updateUserQuery, [passwordHash, id]);

  return "Password updated successfully";
};

module.exports = { createUser, loginUser, getUserById, updatePassword };
