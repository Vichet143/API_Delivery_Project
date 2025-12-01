const PaymentModel = require("../modals/paymentModal");
const supabase = require("../db/supabase");
const jwt = require("jsonwebtoken");

const processPayment = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = decoded.id;
    const username = [decoded.firstname, decoded.lastname].filter(Boolean).join(" ");

    // Fetch the latest delivery for this user
    const { data: deliveryData, error: deliveryError } = await supabase
      .from("createdeliveries")
      .select("delivery_id")
      .eq("user_id", user_id)
      .order("delivery_id", { ascending: false })
      .limit(1);

    if (deliveryError) {
      return res.status(500).json({ message: "Error fetching delivery", error: deliveryError });
    }

    if (!deliveryData || deliveryData.length === 0) {
      return res.status(400).json({ message: "No delivery found for this user" });
    }

    const delivery_id = deliveryData[0].delivery_id;

    // Get payment info from request body
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    // Generate KHQR transaction ID
    const transaction_id = "KHQR-" + Date.now() + "-" + Math.random().toString(16).substring(2, 8).toUpperCase();

    // Create pending KHQR payment record
    const { data: paymentData, error: paymentError } = await PaymentModel.payment({
      user_id,
      username,
      delivery_id,
      provider: "KHQR",
      amount: amount,
      status: "pending",
      transaction_id,
      paid_at: null
    });

    if (paymentError) {
      return res.status(400).json({ message: "Error creating payment record", error: paymentError });
    }

    // Generate QR code data
    const qrData = generateKHQRPayload(amount, transaction_id);

    return res.status(200).json({
      message: "KHQR payment initiated successfully",
      payment_id: paymentData[0].payment_id,
      delivery_id,
      amount: amount,
      transaction_id,
      status: "pending",
      qr_data: qrData,
      qr_string: qrData.raw_string,
      instructions: "Scan this QR code with your KHQR-supported banking app"
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Generate proper KHQR payload
const generateKHQRPayload = (amount, transaction_id) => {
  const merchantAccount = process.env.KHQR_MERCHANT_ACCOUNT || "123456789";
  const merchantName = process.env.KHQR_MERCHANT_NAME || "Your Business";
  const merchantCity = process.env.KHQR_MERCHANT_CITY || "Phnom Penh";

  // Standard KHQR payload structure
  const payload = {
    merchant_account: merchantAccount,
    merchant_name: merchantName,
    merchant_city: merchantCity,
    amount: amount,
    currency: "KHR",
    transaction_id: transaction_id,
    reference: transaction_id
  };

  // Generate raw QR string for frontend
  const rawString = `0002010102122937${merchantAccount.length.toString().padStart(2, '0')}${merchantAccount}530376454${amount}5802KH59${merchantName.length.toString().padStart(2, '0')}${merchantName}60${merchantCity.length.toString().padStart(2, '0')}${merchantCity}62110511${transaction_id}6304`;

  return {
    ...payload,
    raw_string: rawString
  };
};

// Handle KHQR callback (webhook from bank/KHQR service)
const handleKHQRCallback = async (req, res) => {
  try {
    const {
      transaction_id,
      status,
      amount,
      bank_name,
      payment_date
    } = req.body;

    if (!transaction_id || !status) {
      return res.status(400).json({ message: "Transaction ID and status are required" });
    }

    // Update payment status based on KHQR callback
    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .update({
        status: status.toLowerCase(),
        paid_at: status.toLowerCase() === "paid" ? new Date() : null
      })
      .eq("transaction_id", transaction_id)
      .select();

    if (paymentError) {
      return res.status(400).json({ message: "Error updating payment", error: paymentError });
    }

    if (!paymentData || paymentData.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Update delivery status if payment is successful
    if (status.toLowerCase() === "paid" && paymentData[0].delivery_id) {
      await supabase
        .from("createdeliveries")
        .update({ payment_status: "paid" })
        .eq("delivery_id", paymentData[0].delivery_id);
    }

    return res.status(200).json({
      message: "KHQR callback processed successfully",
      data: paymentData[0]
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Check payment status
const checkPaymentStatus = async (req, res) => {
  try {
    const { transaction_id } = req.params;

    if (!transaction_id) {
      return res.status(400).json({ message: "Transaction ID is required" });
    }

    const { data: paymentData, error } = await supabase
      .from("payments")
      .select("*")
      .eq("transaction_id", transaction_id)
      .single();

    if (error) {
      return res.status(404).json({ message: "Payment not found", error });
    }

    return res.status(200).json({
      message: "Payment status retrieved successfully",
      data: paymentData
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

module.exports = {
  processPayment,
  handleKHQRCallback,
  checkPaymentStatus
};