const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const auth = require("../middleware/chatMiddleware");

// Create conversation
router.post(
  "/conversation",
  auth(["user", "admin"]),
  chatController.createConversation
);

// Get conversation by delivery_id
router.get(
  "/conversation/:delivery_id",
  auth(["user", "transporter", "admin"]),
  chatController.getConversationByDeliveryId
);

// Send message
router.post(
  "/message",
  auth(["user", "transporter", "admin"]),
  chatController.sendMessage
);

// Get messages
router.get(
  "/message/:conversation_id",
  auth(["user", "transporter", "admin"]),
  chatController.getMessages
);

module.exports = router;
