const jwt = require("jsonwebtoken");
const DeliveryModel = require("../modals/createdelivery");
const supabase = require("../db/supabase");

const createDelivery = async (req, res) => {
  try {

    // 1. Log the body to verify data is arriving from Vue
    console.log("BACKEND RECEIVED BODY:", req.body);

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
      pickup_lat,      // <--- ADDED
      pickup_lng,      // <--- ADDED
      receiver_name,
      receiver_contact,
      destination_address,
      destination_lat, // <--- ADDED
      destination_lng, // <--- ADDED
      type_of_items,
      itemsize,
      weight,
      type_of_delivery,
      total_amount,
      payment_type
    } = req.body;

    if (
      !pick_up_address ||
      !pickup_lat || !pickup_lng || // <--- ADDED
      !receiver_name ||
      !receiver_contact ||
      !destination_address ||
      !destination_lat || !destination_lng || // <--- ADDED
      !type_of_items ||
      !itemsize ||
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
      pickup_lat,      // <--- ADDED
      pickup_lng,      // <--- ADDED
      receiver_name,
      receiver_contact,
      destination_address,
      destination_lat, // <--- ADDED
      destination_lng, // <--- ADDED
      type_of_items,
      itemsize,
      weight,
      type_of_delivery,
      payment_type,
      total_amount
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

const acceptDelivery = async (req, res) => {
  try {
    const { delivery_id } = req.body; // ✅ get from body
    if (!delivery_id)
      return res.status(400).json({ message: "delivery_id is required" });

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const transporter_id = decoded.id;
    const transporter_name = `${decoded.firstname} ${decoded.lastname}`.trim();

    const { data, error } = await DeliveryModel.assignToTransporter(
      delivery_id,
      transporter_id,
      transporter_name
    );

    if (error) return res.status(400).json({ message: error.message });
    if (!data?.inserted)
      return res.status(404).json({ message: "Already accepted or not found" });

    res.json({ message: "Delivery accepted", delivery: data.inserted });


  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const transporter_id = decoded.id;

    const { delivery_id, status } = req.body;

    if (!delivery_id || !status) {
      return res.status(400).json({ message: "delivery_id and status are required" });
    }

    const updatePayload = {
      status,
      updated_at: new Date(),
      delivered_at: status === "delivered" ? new Date() : null
    };

    const { data, error } = await supabase
      .from("createdeliveries")
      .update(updatePayload)
      .eq("delivery_id", delivery_id)
      .eq("transporter_id", transporter_id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: "Update failed", error });
    }

    if (!data) {
      return res.status(403).json({
        message: "You cannot update this delivery. It was not accepted by you."
      });
    }

    return res.json({
      message: "Status updated successfully",
      delivery: data
    });

  } catch (err) {
    console.error("updateDeliveryStatus error:", err);
    return res.status(500).json({ message: "Internal error", error: err.message });
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
const getDeliveriesByTransporter = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const transporter_id = decoded.id;

    // Call model properly
    const { data, error } = await DeliveryModel.findByTransporter(transporter_id);

    if (error) return res.status(400).json({ message: error.message });

    return res.json({
      success: true,
      deliveries: data
    });

  } catch (err) {
    console.error("Error in getDeliveriesByTransporter:", err);
    return res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

const getAllDelivery = async (req, res) => {
  try {
    const deliveries = await DeliveryModel.findAll();

    return res.json({
      success: true,
      deliveries
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getDeliveriesById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await DeliveryModel.findById(id);

    if (error) return res.status(400).json({ message: error.message });

    return res.json({
      success: true,
      delivery: data
    });

  } catch (err) {
    console.error("Error in getDeliveriesById:", err);
    return res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};



module.exports = { createDelivery, getallcreatedeliveries, getDeliveriesByToken, acceptDelivery, updateDeliveryStatus, getAllDelivery, getDeliveriesById, getDeliveriesByTransporter };
