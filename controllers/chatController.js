const Conversation = require("../modals/conversationModel");
const Message = require("../modals/messageModel");

// CREATE CONVERSATION
exports.createConversation = async (req, res) => {
  const { delivery_id, transporter_id } = req.body;
  const user_id = req.user.id;

  const { data, error } = await Conversation.createConversation({
    delivery_id,
    user_id,
    transporter_id
  });

  if (error) return res.status(400).json({ error });

  res.json(data);
};

exports.getConversationByDeliveryId = async (req, res) => {
  const { delivery_id } = req.params;

  const { data, error } = await Conversation.getByDeliveryId(delivery_id);

  if (error) {
    return res.status(404).json({
      message: "Conversation not found",
      error
    });
  }

  res.json(data);
};

// SEND MESSAGE
exports.sendMessage = async (req, res) => {
  const { conversation_id, message } = req.body;
  const sender_id = req.user?.id || req.transporter?.transporter_id;
  const sender_role = req.user?.role?.toLowerCase() || req.transporter?.role;

  console.log("Sender ID:", sender_id);
  console.log("Sender Role:", sender_role);

  if (!sender_id || !sender_role) {
    return res.status(400).json({ error: "Invalid sender_id or sender_role" });
  }

  if (!conversation_id || !message) {
    return res.status(400).json({ error: "conversation_id and message are required" });
  }


  console.log("=== DEBUG SEND MESSAGE ===");
  console.log("User from token:", req.user);
  console.log("Sender ID:", sender_id);
  console.log("Sender Role:", sender_role);
  console.log("Conversation ID:", conversation_id);
  console.log("Message:", message);
  console.log("==========================");

  if (!sender_id) {
    return res.status(400).json({ error: "Invalid sender_id" });
  }


  if (!conversation_id || !message) {
    return res.status(400).json({ error: "conversation_id and message are required" });
  }

  try {
    const { data, error } = await Message.createMessage({
      conversation_id,
      sender_id,
      sender_role,
      message
    });

    if (error) return res.status(400).json({ error });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};



// GET CHAT MESSAGES
exports.getMessages = async (req, res) => {
  const { conversation_id } = req.params;

  const { data, error } = await Message.getMessagesByConversation(conversation_id);

  if (error) return res.status(400).json({ error });

  res.json(data);
};
