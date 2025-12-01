const { processPayment, handleKHQRCallback, checkPaymentStatus } = require("../controllers/paymentController");
const router = require("express").Router();
const paymentMiddleware = require("../middleware/paymentMiddleware");

// Only KHQR payment route
router.post("/payment", paymentMiddleware, processPayment);
router.post("/khqr/callback", handleKHQRCallback); // Webhook from bank
router.get("/status/:transaction_id", paymentMiddleware, checkPaymentStatus);

module.exports = router;