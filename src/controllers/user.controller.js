const { createUser, loginUser } = require("../models/users.model");
const jwt = require("jsonwebtoken");

const createUserController = async (req, res) => {
  try {
    const { f_name, l_name, email, password, tenantid, created_by } = req.body;
    if (!f_name || !l_name || !email || !password || !tenantid) {
      return res.status(400).json({
        message: "All fields are required",
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
      error: err,
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

    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_KEY, {
      expiresIn: "1h",
    });

    return res.status(200).json({
      message: "Login successful",
      accessToken,
    });
  } catch (err) {
    console.error("Login error:", err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = { createUserController, loginUserController };
