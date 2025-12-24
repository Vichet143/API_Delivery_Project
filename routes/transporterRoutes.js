const router = require("express").Router();
const { registerTransporter, loginTransporter, getTransporterProfile, updateTransporterStatus } = require("../controllers/transporterController");

router.post("/registertransporter", registerTransporter);
router.post("/logintransporter", loginTransporter);
router.get("/transporterprofile/:id", getTransporterProfile);
router.patch("/updatetransporterstatus/:id", updateTransporterStatus);




module.exports = router;
