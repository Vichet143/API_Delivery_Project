const router = require("express").Router();
const { registerTransporter, loginTransporter } = require("../controllers/transporterController");

router.post("/registertransporter", registerTransporter);
router.post("/logintransporter", loginTransporter);





module.exports = router;
