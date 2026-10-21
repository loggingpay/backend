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

    const accessToken = jwt.sign(
      {
        userId: user.id,
        tenant_id: user.tenant_id,
      },
      process.env.JWT_KEY,
      { expiresIn: "1h" },
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

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const getUserByIdController = async (req, res) => {
  try {
    const id = req.user.id;
    const result = await getUserById(id);

    if (!result) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (id != result.id) {
      return res.status(403).json({
        message: "Unauthorized",
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

module.exports = {
  createUserController,
  loginUserController,
  getUserByIdController,
  updatePasswordController,
};
