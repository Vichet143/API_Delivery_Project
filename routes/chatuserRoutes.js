const router = require("express").Router();
const chatuserMiddleware = require("../middleware/chatuserMiddleware");
const createChatMessage = require("../controllers/chatuserController");

router.post("/chatuser", chatuserMiddleware, createChatMessage);

module.exports = router;
