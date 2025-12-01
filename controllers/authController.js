const supabase = require("../db/supabase");
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

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Database error during login:", error);
      return res.status(500).json({ message: "Database error", error });
    }

    if (!user) {
      return res.status(400).json({ message: "Email not found" });
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not defined");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        firstname: user.firstname,
        lastname: user.lastname
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );


    delete user.password; // remove password before sending response

    res.json({
      message: "Login success",
      user,
      token
    });
  } catch (err) {
    console.error("Unexpected error in login:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};
