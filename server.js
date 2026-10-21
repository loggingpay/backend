const express = require("express");
require("dotenv").config();

const app = express();

const tenantRoute = require("./src/routes/tenant.route");
const userRoute = require("./src/routes/user.route");
const stripeKeyRoutes = require("./src/routes/stripeKey.routes");
const webhookRoutes = require("./src/routes/webhook.route");
const verificationRoute = require("./src/routes/verification.route");

app.use("/v1/api/webhooks", webhookRoutes);

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Working" });
});

app.use("/v1/api/tenant", tenantRoute);
app.use("/v1/api/user", userRoute);
app.use("/api/v1/stripe-keys", stripeKeyRoutes);
app.use("/api/v1/verification", verificationRoute);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
