const router = require("express").Router()
const { register, login, getAllUsers, updateUserStatus } = require("../controllers/authController")

router.post("/register", register)
router.post("/login", login)
router.get("/getalluser", getAllUsers)
router.patch("/updatestatus/:id", updateUserStatus)

module.exports = router
