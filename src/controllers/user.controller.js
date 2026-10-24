const {
  createUser,
  loginUser,
  getUserById,
  updatePassword,
} = require("../models/users.model");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../../db/conn");
const { nanoid } = require("nanoid");
const { createVerificationToken } = require("../models/verification.model");
const { sendVerificationEmail } = require("../services/email.service");

const createUserController = async (req, res) => {
  try {
    const { f_name, l_name, email, password, tenantid, created_by } = req.body;

    if (!f_name || !l_name || !email || !password || !tenantid) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (tenantid !== req.user.tenant_id) {
      return res.status(403).json({
        message: "You are not authorized",
      });
    }

    const user = await createUser(
      f_name,
      l_name,
      email,
      password,
      tenantid,
      created_by || null,
    );

    if (typeof user === "string") {
      return res.status(400).json({
        message: user,
      });
    }

    const verification = await createVerificationToken(user.id);
    await sendVerificationEmail(email, verification.token);

    return res.status(201).json({
      message: "User created successfully",
      user_id: user.id,
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// login user
const loginUserController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required to login!",
      });
    }

    const user = await loginUser(email, password);

    if (typeof user === "string") {
      return res.status(401).json({
        message: user,
      });
    }

    // check if the user is active or not
    if (user.status === "inactive") {
      return res.status(403).json({
        message: "Your account is inactive, please contact support!",
      });
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        tenant_id: user.tenant_id,
      },
      process.env.JWT_KEY,
      { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign({ sub: user.id }, process.env.REFRESH_TOKEN, {
      expiresIn: "7d",
    });

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
      [nanoid(11), user.id, tokenHash, expiresAt],
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    console.error("Login error:", err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

//specific user id
const getUserByIdController = async (req, res) => {
  try {
    const id = req.user.id;
    const result = await getUserById(id);

    if (!result) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: result,
    });
  } catch (err) {
    console.error("Get user error:", err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

//update user password
const updatePasswordController = async (req, res) => {
  try {
    const id = req.user.id;
    const { password } = req.body;

    const result = await updatePassword(id, password);

    return res.status(200).json({ message: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const refreshAccessTokenController = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token missing. Please log in again.",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);
    } catch (err) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      return res.status(401).json({
        message: "Refresh token expired or invalid. Please log in again.",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const tokenResult = await pool.query(
      `SELECT id
       FROM refresh_tokens
       WHERE user_id = $1
         AND token_hash = $2
         AND expires_at > NOW()
       LIMIT 1`,
      [decoded.sub, tokenHash],
    );

    if (tokenResult.rows.length === 0) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      return res.status(401).json({
        message: "Refresh token is no longer valid. Please log in again.",
      });
    }

    const userResult = await pool.query(
      `SELECT id, tenant_id, status
       FROM users
       WHERE id = $1`,
      [decoded.sub],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        message: "User not found. Please log in again.",
      });
    }

    const user = userResult.rows[0];

    if (user.status === "inactive") {
      return res.status(403).json({
        message: "Your account is inactive.",
      });
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        tenant_id: user.tenant_id,
      },
      process.env.JWT_KEY,
      { expiresIn: "15m" },
    );

    return res.status(200).json({
      message: "Access token refreshed successfully",
      accessToken,
    });
  } catch (err) {
    console.error("Refresh token error:", err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createUserController,
  loginUserController,
  getUserByIdController,
  refreshAccessTokenController,
  updatePasswordController,
};
