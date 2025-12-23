const router = require("express").Router();
const { registerTransporter, loginTransporter, getTransporterProfile } = require("../controllers/transporterController");

router.post("/registertransporter", registerTransporter);
router.post("/logintransporter", loginTransporter);
router.get("/transporterprofile/:id", getTransporterProfile);




module.exports = router;
