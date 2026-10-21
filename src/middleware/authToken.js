const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access token required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    req.user = {
      id: decoded.userId,
      tenant_id: decoded.tenant_id,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired access token",
    });
  }
};

module.exports = authenticateToken;
