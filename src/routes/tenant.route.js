const exrpress = require("express");
const router = exrpress.Router();
const tenantController = require("../controllers/tenant.controller");

router.post("/new_tenant", tenantController.createTenantController);

module.exports = router;
