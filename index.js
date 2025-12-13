const express = require("express")
const bodyParser = require("body-parser");
const cors = require("cors");
require('dotenv').config();

const authRoutes = require("./routes/authRouters")
const userRoutes = require("./routes/userRoutes")
const createDeliveryRoutes = require("./routes/createDeliveryroute")
const ratingRoutes = require("./routes/ratingRouter");
const paymentRoutes = require("./routes/paymentRoutes");
const chatuserRoutes = require("./routes/chatuserRoutes");
const transporterRoutes = require("./routes/transporterRoutes");
const transporterDeliveryRoutes = require("./routes/transporterDeliveryRoutes")

const app = express()
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(cors({
  origin: "http://localhost:5173", // your frontend
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));


app.use("/auth", authRoutes)
app.use("/transporter", transporterRoutes);
app.use("/user", userRoutes)
app.use("", ratingRoutes)
app.use("", createDeliveryRoutes)
app.use("", paymentRoutes)
app.use("", chatuserRoutes)
app.use("/transporter", transporterDeliveryRoutes)


// import("./routes/ratingRouter.js").then((ratingRoutes) => {
//   app.use("", ratingRoutes.default);
// });


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server running on port " + port);
});

