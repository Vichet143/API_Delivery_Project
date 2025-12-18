const supabase = require("../db/supabase");
const { getalluser } = require("../modals/userModal");
const { hashPassword, comparePassword } = require("../utils/hash");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // make sure .env is loaded

// ===================
// REGISTER
// ===================
exports.register = async (req, res) => {
  try {
    const { firstname, lastname, email, password, role } = req.body;

    if (!firstname || !lastname || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["user", "admin", "driver"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Check if email already exists
    const { data: existingUser, error: findError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle(); // safe, returns null if not found

    if (findError) {
      console.error("Database error during email check:", findError);
      return res.status(500).json({ message: "Database error", error: findError });
    }

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const hashed = await hashPassword(password);

    // Insert new user
    const { data, error } = await supabase
      .from("users")
      .insert([{ firstname, lastname, email, password: hashed, role }])
      .select(); // optional: return inserted user

    if (error) {
      console.error("Database error during user registration:", error);
      return res.status(500).json({ message: "Failed to register user", error });
    }

    // Insert into all_users
    // Insert into all_users
    await supabase.from("all_users").insert([{
      user_id: data[0].id,   // <-- captured from Supabase insert
      firstname,
      lastname,
      email,
      role,
      source_table: "users"
    }]);


    res.json({ message: "User registered successfully", user: data[0] });
  } catch (err) {
    console.error("Unexpected error in register:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// ===================
// LOGIN
// ===================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt for email:", email);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Fetch user metadata from all_users
    const { data: allUser, error: metaError } = await supabase
      .from("all_users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (metaError) {
      console.error("Database error fetching all_users:", metaError);
      return res.status(500).json({ message: "Database error", error: metaError });
    }

    if (!allUser) return res.status(401).json({ message: "Email not found" });

    const sourceTable = allUser.source_table;

    // Fetch full user with password from the original table
    const { data: user, error: userError } = await supabase
      .from(sourceTable)
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (userError || !user) {
      console.error("Error fetching user from source table:", userError);
      return res.status(500).json({ message: "Database error fetching user" });
    }

    // Compare password
    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) return res.status(401).json({ message: "Wrong password" });

    // Sign JWT
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not defined");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: allUser.role,   // ✅ FIX HERE
        firstname: user.firstname,
        lastname: user.lastname,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );


    const { id, firstname, lastname, role } = user;
    res.json({
      message: "Login success",
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        role: allUser.role,   // ✅ FIX HERE
      },
      token,
    });

  } catch (err) {
    console.error("Unexpected error in login:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await getalluser();
    return res.status(200).json({ success: true, users });
  } catch (err) {
    console.error("Error in getAllUsers controller:", err);
    return res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};


