const jwt = require("jsonwebtoken");
const DeliveryModel = require("../modals/createdelivery");

const createDelivery = async (req, res) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = decoded.id;
    const username = [decoded.firstname, decoded.lastname].filter(Boolean).join(" ");

    // Validate body
    const {
      pick_up_address,
      receiver_name,
      receiver_contact,
      destination_address,
      type_of_items,
      itemsize,
      weight,
      type_of_delivery,
      total_amount,
      payment_type
    } = req.body;

    if (
      !pick_up_address ||
      !receiver_name ||
      !receiver_contact ||
      !destination_address ||
      !type_of_items ||
      !itemsize||
      !weight ||
      !type_of_delivery ||
      !payment_type ||
      !total_amount
    ) {
      return res.status(400).json({ message: "All delivery fields are required" });
    }

    // Insert into DB with default status = "pending"
    const { data, error } = await DeliveryModel.create({
      user_id,
      username,
      pick_up_address,
      receiver_name,
      receiver_contact,
      destination_address,
      type_of_items,
      itemsize,
      weight,
      type_of_delivery,
      payment_type,
      total_amount,
      status: "pending"
    });

    if (error) return res.status(400).json({ message: error.message });

    return res.status(201).json({
      message: "Delivery created successfully",
      data
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

const getallcreatedeliveries = async (req, res) => {
  try {
    const { data, error } = await DeliveryModel.findAll();
    if (error) return res.status(400).json({ message: error.message }); 
    res.json({ success: true, deliveries: data });
  } catch (err) {
    console.error("Error in getallcreatedeliveries:", err);
    res.status(500).json({ message: err.message || "Internal Server Error", error: err });
  }
};

const getDeliveriesByToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = decoded.id;

    // Call model properly
    const { data, error } = await DeliveryModel.findByUser(user_id);

    if (error) return res.status(400).json({ message: error.message });

    return res.json({
      success: true,
      deliveries: data
    });

  } catch (err) {
    console.error("Error in getDeliveriesByToken:", err);
    return res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};


module.exports = { createDelivery, getallcreatedeliveries, getDeliveriesByToken };
