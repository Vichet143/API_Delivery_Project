const router = require("express").Router();
const { registerTransporter, loginTransporter, getTransporterProfile, updateTransporterStatus, updateTransporterProfile, getAllTransporter } = require("../controllers/transporterController");

router.post("/registertransporter", registerTransporter);
router.post("/logintransporter", loginTransporter);
router.get("/transporterprofile/:id", getTransporterProfile);
router.patch("/updatetransporterstatus/:id", updateTransporterStatus);
router.patch("/updatetransporterprofile/:id", updateTransporterProfile);
router.get("/getalltransporter", getAllTransporter);




module.exports = router;
