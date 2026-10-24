const exrpress = require("express");
const router = exrpress.Router();
const userController = require("../controllers/user.controller");
const authenticateToken = require("../middleware/authToken");

router.post("/login", userController.loginUserController);
router.post(
  "/new_user",
  authenticateToken,
  userController.createUserController,
);

router.post("/refresh", userController.refreshAccessTokenController);

router.get(
  "/my_details",
  authenticateToken,
  userController.getUserByIdController,
);

router.put(
  "/change-password",
  authenticateToken,
  userController.updatePasswordController,
);

module.exports = router;
