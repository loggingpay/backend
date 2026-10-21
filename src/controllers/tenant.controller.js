const { createTenant } = require("../models/tenant.model");
const { createUser } = require("../models/users.model");
const { createVerificationToken } = require("../models/verification.model");

const { sendVerificationEmail } = require("../services/email.service");

const createTenantController = async (req, res) => {
  try {
    const { name, f_name, l_name, email, password } = req.body;
    if (!name || !f_name || !l_name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }
    const tenant = await createTenant(name);

    if (typeof tenant === "string") {
      return res.status(409).json({
        message: tenant,
      });
    }

    const user = await createUser(
      f_name,
      l_name,
      email,
      password,
      tenant.id,
      null,
    );

    if (typeof user === "string") {
      return res.status(400).json({
        message: user,
      });
    }

    const verification = await createVerificationToken(user.id);
    await sendVerificationEmail(email, verification.token);

    return res.status(201).json({
      message:
        "Tenant and User Account is created. Please verify your email to activate your account.",
      id: tenant.id,
      slug: tenant.slug,
      user_id: user.id,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
};

module.exports = { createTenantController };
