// routes/transporterDeliveryRoutes.js
const router = require("express").Router();

// Add getDriverStats to the import list
const { acceptDelivery, updateDeliveryStatus, getDriverStats } = require("../controllers/createDeliveryController");

// Import your authentication middleware (Check the path is correct for your project)
const authenticate = require("../middleware/createdeliveryMiddleware");

// Transporter accepts a delivery
router.post("/accept", authenticate, acceptDelivery);

// Transporter updates status
router.patch("/status", authenticate, updateDeliveryStatus);

// Route for the Dashboard stats
router.get("/stats", authenticate, getDriverStats);

router.get("/test", (req, res) => {
  console.log("Test route hit");
  res.send("Transporter route working");
});

module.exports = router;
