const supabase = require("../db/supabase");
const { hashPassword, comparePassword } = require("../utils/hash");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// ===================
// REGISTER TRANSPORTER
// ===================
exports.registerTransporter = async (req, res) => {
  try {
    const { firstname, lastname, email, password, vehicle_type, license_plate } = req.body;

    // ✅ Required fields
    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({
        message: "Firstname, lastname, email, and password are required"
      });
    }

    // Check if email exists
    const { data: existingUser, error: findError } = await supabase
      .from("transporters")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (findError) return res.status(500).json({ message: "Database error", error: findError });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert transporter
    const { data, error } = await supabase
      .from("transporters")
      .insert([{
        firstname,
        lastname,
        email,
        password: hashedPassword,
        role: "transporter",
        vehicle_type: vehicle_type || null,
        license_plate: license_plate || null
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ message: "Failed to register", error });

    // Insert into all_users
    try {
      await supabase.from("all_users").insert([{
        user_id: data.id,
        firstname,
        lastname,
        email,
        role: "transporter",
        source_table: "transporters"
      }]);
    } catch (err) {
      console.error("Error inserting into all_users:", err);
    }

    res.status(201).json({
      message: "Transporter registered successfully",
      user: {
        transporter_id: data.id,
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        role: "transporter",
        vehicle_type: data.vehicle_type,
        license_plate: data.license_plate
      }
    });

  } catch (err) {
    console.error("registerTransporter error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ===================
// LOGIN TRANSPORTER
// ===================
exports.loginTransporter = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const { data: transporter, error } = await supabase
      .from("transporters")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) return res.status(500).json({ message: "Database error", error });
    if (!transporter) return res.status(400).json({ message: "Email not found" });

    const passwordMatch = await comparePassword(password, transporter.password);
    if (!passwordMatch) return res.status(400).json({ message: "Wrong password" });

    // Prepare payload for JWT
    const payload = {
      id: transporter.id,
      role: "transporter",
      firstname: transporter.firstname,
      lastname: transporter.lastname,
      email: transporter.email
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Remove password before sending response
    delete transporter.password;

    res.json({
      message: "Login success",
      user: {
        id: transporter.id,
        firstname: transporter.firstname,
        lastname: transporter.lastname,
        email: transporter.email,
        role: transporter.role,
        vehicle_type: transporter.vehicle_type,
        license_plate: transporter.license_plate
      },
      token
    });

  } catch (err) {
    console.error("loginTransporter error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};
