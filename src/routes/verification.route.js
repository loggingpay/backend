const express = require("express");
const router = express.Router();

const {
  verifyEmailController,
} = require("../controllers/verification.controller");

router.get("/verify", verifyEmailController);

module.exports = router;
