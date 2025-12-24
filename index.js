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
const chatRoutes = require("./routes/chatRoutes")
const { Server } = require('socket.io');
const http = require('http');

const app = express()
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(cors({
  origin: "http://localhost:5173", // your frontend
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
const server = http.createServer(app);

const io = new Server(server, {
  // Optional: CORS configuration if your client is served from a different origin
  cors: {
    origin: "http://localhost:5173", // Replace with your client's origin
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});


app.use("/auth", authRoutes)
app.use("/transporter", transporterRoutes);
app.use("/user", userRoutes)
app.use("", ratingRoutes)
app.use("", createDeliveryRoutes)
app.use("", paymentRoutes)
app.use("", chatuserRoutes)
app.use("/transporter", transporterDeliveryRoutes)
app.use("", chatRoutes)

// import("./routes/ratingRouter.js").then((ratingRoutes) => {
//   app.use("", ratingRoutes.default);
// });


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server running on port " + port);
});
