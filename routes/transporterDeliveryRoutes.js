// routes/transporterDeliveryRoutes.js
const router = require("express").Router();
const { acceptDelivery, updateDeliveryStatus } = require("../controllers/createDeliveryController");

// Transporter accepts a delivery
router.post("/accept", acceptDelivery);

// Transporter updates status
router.patch("/status", updateDeliveryStatus);

router.get("/test", (req, res) => {
  console.log("Test route hit");
  res.send("Transporter route working");
});

module.exports = router;
