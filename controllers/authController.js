const supabase = require("../db/supabase");
const { getalluser } = require("../modals/userModal");
const { hashPassword, comparePassword } = require("../utils/hash");
const jwt = require("jsonwebtoken");
const UserModel = require("../modals/userModal");
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
      .insert([{ firstname, lastname, email, password: hashed, role, status: "active" }])
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

    if (user.status === "banned") {
      return res.status(403).json({
        message: "Your account has been banned. Please contact admin."
      });
    }

    // Compare password
    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) return res.status(401).json({ message: "Wrong password" });

    if (allUser.status === "ban" || allUser.status === "banned") {
      console.log("🚫 Banned account attempt:", email);

      // Log security event
      await supabase
        .from("security_logs")
        .insert([{
          user_id: allUser.user_id,
          email: email,
          action: 'login_attempt_banned',
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }]);

      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact administrator.",
        code: "ACCOUNT_SUSPENDED"
      });
    }

    // Sign JWT
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not defined");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: allUser.role,   // ✅ FIX HERE
        email: user.email,
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
        email: user.email,
        lastname: user.lastname,
        role: allUser.role,   // ✅ FIX HERE
        status: allUser.status
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
    const users = await UserModel.getAllUser();
    return res.status(200).json({ success: true, users });
  } catch (err) {
    console.error("Error in getAllUsers controller:", err);
    return res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = Number(req.params.id);

    console.log("🔍 ========== DEBUG START ==========");
    console.log("📱 Request to update user ID:", userId, "Status:", status);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // STEP 1: Check if user exists
    console.log("🔍 STEP 1: Checking if user exists...");
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, firstname, lastname, status")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("❌ Error checking user:", userError);
      console.error("Error details:", {
        message: userError.message,
        code: userError.code,
        details: userError.details
      });
      throw userError;
    }

    console.log("📊 User data:", user);

    if (!user) {
      console.log("❌ User not found in database");
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found in database`
      });
    }

    console.log("✅ User found:", user.email);

    // STEP 2: Try to update users table directly
    console.log("🔍 STEP 2: Attempting to update users table...");
    console.log("SQL equivalent: UPDATE users SET status = ? WHERE id = ?", status, userId);

    const { data: usersUpdate, error: usersError } = await supabase
      .from("users")
      .update({
        status: status,
      })
      .eq("id", userId)
      .select("id, email, status"); // Only select needed fields

    console.log("📊 Users update result:", {
      data: usersUpdate,
      error: usersError,
      count: usersUpdate?.length || 0
    });

    if (usersError) {
      console.error("❌ Error updating users table:", usersError);
      console.error("Full error object:", JSON.stringify(usersError, null, 2));
      throw usersError;
    }

    if (!usersUpdate || usersUpdate.length === 0) {
      console.error("❌ No rows updated in users table!");

      // Let's check why - maybe RLS is blocking
      console.log("🔍 Checking if RLS might be blocking...");

      // Try a simpler update without select
      const { count, error: simpleError } = await supabase
        .from("users")
        .update({ status: status })
        .eq("id", userId);

      console.log("Simple update result:", { count, error: simpleError });

      throw new Error(`Failed to update users table. No rows affected. User ID: ${userId}`);
    }

    console.log("✅ Users table updated successfully:", usersUpdate[0]);

    // STEP 3: Update all_users table
    console.log("🔍 STEP 3: Updating all_users table...");
    const { data: allUsersUpdate, error: allUsersError } = await supabase
      .from("all_users")
      .update({
        status: status,
      })
      .eq("email", user.email)
      .select();

    console.log("📊 All_users update result:", {
      data: allUsersUpdate,
      error: allUsersError,
      count: allUsersUpdate?.length || 0
    });

    if (allUsersError) {
      console.error("⚠️ Error updating all_users:", allUsersError);
      // Don't throw - users table was updated successfully
    }

    // STEP 4: Verify the update
    console.log("🔍 STEP 4: Verifying update...");
    const { data: verifyUser } = await supabase
      .from("users")
      .select("id, email, status")
      .eq("id", userId)
      .single();

    console.log("📊 Verification result:", verifyUser);
    console.log("✅ ========== DEBUG END ==========");

    return res.json({
      success: true,
      message: `User status updated to ${status}`,
      data: {
        user: usersUpdate[0],
        all_user: allUsersUpdate ? allUsersUpdate[0] : null
      },
      verification: verifyUser
    });

  } catch (err) {
    console.error("❌❌❌ CRITICAL ERROR in updateUserStatus:");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Full error:", err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
      debug: process.env.NODE_ENV === 'development' ? {
        error_type: err.constructor.name,
        full_error: err.toString()
      } : undefined
    });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { firstname, lastname, email} = req.body;
    const userId = Number(req.params.id);

    console.log("🔍 ========== DEBUG START ==========");
    console.log("📱 Request to update user ID:", userId);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // STEP 1: Check if user exists
    console.log("🔍 STEP 1: Checking if user exists...");
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, firstname, lastname")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("❌ Error checking user:", userError);
      console.error("Error details:", {
        message: userError.message,
        code: userError.code,
        details: userError.details
      });
      throw userError;
    }

    console.log("📊 User data:", user);

    if (!user) {
      console.log("❌ User not found in database");
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found in database`
      });
    }

    console.log("✅ User found:", user.email);

    // STEP 2: Try to update users table directly
    console.log("🔍 STEP 2: Attempting to update users table...");
    console.log("SQL equivalent: UPDATE users SET firstname = ?, lastname = ?, email = ? WHERE id = ?", firstname, lastname, email, userId);

    const { data: usersUpdate, error: usersError } = await supabase
      .from("users")
      .update({
        firstname: firstname,
        lastname: lastname,
        email: email,
      })
      .eq("id", userId)
      .select("id, email, firstname, lastname"); // Only select needed fields

    console.log("📊 Users update result:", {
      data: usersUpdate,
      error: usersError,
      count: usersUpdate?.length || 0
    });

    if (usersError) {
      console.error("❌ Error updating users table:", usersError);
      console.error("Full error object:", JSON.stringify(usersError, null, 2));
      throw usersError;
    }

    if (!usersUpdate || usersUpdate.length === 0) {
      console.error("❌ No rows updated in users table!");

      // Let's check why - maybe RLS is blocking
      console.log("🔍 Checking if RLS might be blocking...");

      // Try a simpler update without select
      const { count, error: simpleError } = await supabase
        .from("users")
        .update({ firstname: firstname, lastname: lastname, email: email })
        .eq("id", userId);

      console.log("Simple update result:", { count, error: simpleError });

      throw new Error(`Failed to update users table. No rows affected. User ID: ${userId}`);
    }

    console.log("✅ Users table updated successfully:", usersUpdate[0]);

    // STEP 3: Update all_users table
    console.log("🔍 STEP 3: Updating all_users table...");
    const { data: allUsersUpdate, error: allUsersError } = await supabase
      .from("all_users")
      .update({
        firstname: firstname,
        lastname: lastname,
        email: email,
      })
      .eq("email", user.email)
      .select();

    console.log("📊 All_users update result:", {
      data: allUsersUpdate,
      error: allUsersError,
      count: allUsersUpdate?.length || 0
    });

    if (allUsersError) {
      console.error("⚠️ Error updating all_users:", allUsersError);
      // Don't throw - users table was updated successfully
    }

    // STEP 4: Verify the update
    console.log("🔍 STEP 4: Verifying update...");
    const { data: verifyUser } = await supabase
      .from("users")
      .select("id, email, status")
      .eq("id", userId)
      .single();

    console.log("📊 Verification result:", verifyUser);
    console.log("✅ ========== DEBUG END ==========");

    return res.json({
      success: true,
      message: `User profile updated successfully`,
      data: {
        user: usersUpdate[0],
        all_user: allUsersUpdate ? allUsersUpdate[0] : null
      },
      verification: verifyUser
    });

  } catch (err) {
    console.error("❌❌❌ CRITICAL ERROR in updateUserStatus:");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Full error:", err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
      debug: process.env.NODE_ENV === 'development' ? {
        error_type: err.constructor.name,
        full_error: err.toString()
      } : undefined
    });
  }
};



