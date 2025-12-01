const chartuserModal = require("../modals/chatuserModal");
const jwt = require("jsonwebtoken");

const createChatMessage = async (req, res) => {
  try {
    // 1️⃣ Get token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // 2️⃣ Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // 3️⃣ Extract user info
    const user_id = decoded.id; // convert to BIGINT
    if (!user_id) {
      return res.status(400).json({ message: "Invalid token: user_id missing" });
    }

    const username = [decoded.firstname, decoded.lastname]
      .filter(Boolean)
      .join(" ") || "Unknown";

    // 4️⃣ Get message from request body
    const { message } = req.body;
    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Message content is required" });
    }

    // 5️⃣ Current timestamp
    const date = new Date().toISOString();

    // 6️⃣ Insert into Supabase
    const { data, error } = await chartuserModal.create({
      user_id,
      username,
      message,
      date,
    });

    if (error) {
      return res.status(400).json({ message: "Error creating chat message", error });
    }

    return res.status(201).json({ message: "Chat message created", data });
  } catch (err) {
    console.error("Error in createChatMessage:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

module.exports = createChatMessage;
