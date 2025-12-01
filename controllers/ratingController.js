const jwt = require("jsonwebtoken");
const { RatingModel } = require("../modals/ratingModal");

const addRating = async (req, res) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Safely extract user info
    const user_id = decoded.id;
    
    

    if (!user_id) return res.status(401).json({ message: "Invalid token: user ID missing" });

    const username = decoded.firstname + " " + decoded.lastname; // safe fallback]
    console.log(username);
    
    // Get rating text from request
    const { rating_text } = req.body;
    if (!rating_text) return res.status(400).json({ message: "Rating text is required" });

    // Save rating
    const { data, error } = await RatingModel.create({ user_id, username, rating_text });
    if (error) return res.status(400).json({ message: error.message });

    res.json({ success: true, rating: data });
  } catch (err) {
    console.error("Error in addRating:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// Get all ratings
const getAllRatings = async (req, res) => {
  try {
    const { data, error } = await RatingModel.findAll();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.json({ success: true, ratings: data });
  } catch (err) {
    console.error("Error in getAllRatings:", err);
    res.status(500).json({ message: err.message, error: err });
  }
};

module.exports = { addRating, getAllRatings };
