const exrpress = require("express");
const router = exrpress.Router();
const userController = require("../controllers/user.controller");

router.post("/new_user", userController.createUserController);
router.post("/login", userController.loginUserController);

module.exports = router;
