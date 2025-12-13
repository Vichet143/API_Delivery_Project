const supabase = require("../db/supabase");
const { hashPassword, comparePassword } = require("../utils/hash");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// ===================
// REGISTER TRANSPORTER
// ===================
exports.registerTransporter = async (req, res) => {
  try {
    const { firstname, lastname, email, password, role } = req.body;

    if (!firstname || !lastname || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (role !== "transporter") {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Check if email exists
    const { data: existingUser, error: findError } = await supabase
      .from("transporters")
      .select("transporter_id")
      .eq("email", email)
      .maybeSingle();

    if (findError) return res.status(500).json({ message: "Database error", error: findError });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    // Hash password
    const hashed = await hashPassword(password);

    // Insert transporter
    const { data, error } = await supabase
      .from("transporters")
      .insert([{ firstname, lastname, email, password: hashed, role }])
      .select(); // Supabase will automatically handle created_at

    if (error) return res.status(500).json({ message: "Failed to register", error });

    // Insert into all_users
    await supabase.from("all_users").insert([{
      firstname, lastname, email, role: "transporter", source_table: "transporters"
    }]);

    res.json({ message: "Transporter registered successfully", transporter: data[0] });
  } catch (err) {
    console.error("Unexpected error in registerTransporter:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
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

    const payload = {
      id: transporter.transporter_id,  // int8
      firstname: transporter.firstname,
      lastname: transporter.lastname
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });


    delete transporter.password;

    res.json({ message: "Login success", transporter, token });
  } catch (err) {
    console.error("Unexpected error in loginTransporter:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};
