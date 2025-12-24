const router = require("express").Router()
const { register, login, getAllUsers, updateUserStatus, updateUserProfile,getAllUser } = require("../controllers/authController")

router.post("/register", register);
router.post("/login", login);
router.get("/getalluser", getAllUsers);
router.patch("/updatestatus/:id", updateUserStatus);
router.patch("/updateprofile/:id", updateUserProfile);

module.exports = router
