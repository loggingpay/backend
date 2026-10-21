const express = require("express");
const app = express();
require("dotenv").config();
const tenantRoute = require("./src/routes/tenant.route");
const userRoute = require("./src/routes/user.route");
const stripeKeyRoutes = require("./src/routes/stripeKey.routes");

// webhook
// router.post(
//   "/:webhook_id",
//   express.raw({ type: "application/json" }),
//   webhookSignatureMiddleware,
//   webhookController,
// );

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Working" });
});

app.use("/v1/api/tenant", tenantRoute);
app.use("/v1/api/user", userRoute);
app.use("/api/v1/stripe-keys", stripeKeyRoutes);

const port = process.env.PORT || 5000;
-+app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
