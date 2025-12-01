const router = require("express").Router();
const { addRating, getAllRatings } = require("../controllers/ratingController");
const ratingMiddleware = require("../middleware/ratingMiddleware");
// POST => add a rating
router.post("/rating", ratingMiddleware, addRating);

// GET => get all ratings
router.get("/rating",getAllRatings);

module.exports = router;
