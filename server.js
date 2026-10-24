const express = require("express");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

const tenantRoute = require("./src/routes/tenant.route");
const userRoute = require("./src/routes/user.route");
const stripeKeyRoutes = require("./src/routes/stripeKey.routes");
const webhookRoutes = require("./src/routes/webhook.route");
const verificationRoute = require("./src/routes/verification.route");
const paymentEventsRoutes = require("./src/routes/paymentEvents.routes");

app.use("/v1/api/webhooks", webhookRoutes);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Working" });
});

app.use("/v1/api/tenant", tenantRoute);
app.use("/v1/api/user", userRoute);
app.use("/api/v1/stripe-keys", stripeKeyRoutes);
app.use("/api/v1/verification", verificationRoute);
app.use("/v1/api/payment-events", paymentEventsRoutes);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
