const supabase = require("../db/supabase");
const { hashPassword, comparePassword } = require("../utils/hash");
const transporterModel = require("../modals/transporterModel");
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
    if (transporter.status === "ban" || transporter.status === "banned") {
      console.log("🚫 Banned account attempt:", email);

      // Log security event
      await supabase
        .from("security_logs")
        .insert([{
          user_id: transporter.user_id,
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

    // Prepare payload for JWT
    

    const token = jwt.sign(
      {
        id: transporter.id,
        firstname: transporter.firstname,
        lastname: transporter.lastname,
        email: transporter.email,
        role: transporter.role,
        vehicle_type: transporter.vehicle_type,
        license_plate: transporter.license_plate
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );


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
        license_plate: transporter.license_plate,
        status: transporter.status
      },
      token
    });

  } catch (err) {
    console.error("loginTransporter error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

exports.getTransporterProfile = async (req, res) => {
  try {
    const {id} = req.params;
    const { data, error } = await transporterModel.findById(id);

    if (error) return res.status(500).json({ message: "Database error", error });
    if (!data) return res.status(404).json({ message: "Transporter not found" });

    res.json({
      message: "Transporter profile fetched successfully",
      transporter: data
    });

  } catch (err) {
    console.error("getTransporterProfile error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

exports.updateTransporterStatus = async (req, res) => {
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
      .from("transporters")
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

    console.log("📊 transporter data:", user);

    if (!user) {
      console.log("❌ User not found in database");
      return res.status(404).json({
        success: false,
        message: `Transporter with ID ${userId} not found in database`
      });
    }

    console.log("✅ transporter found:", user.email);
    // STEP 2: Try to update users table directly
    console.log("🔍 STEP 2: Attempting to update users table...");
    console.log("SQL equivalent: UPDATE users SET status = ? WHERE id = ?", status, userId);

    const { data: usersUpdate, error: usersError } = await supabase
      .from("transporters")
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
        .from("transporters")
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
      .from("transporters")
      .select("id, email, status")
      .eq("id", userId)
      .single();

    console.log("📊 Verification result:", verifyUser);
    console.log("✅ ========== DEBUG END ==========");

    return res.json({
      success: true,
      message: `Transporter status updated to ${status}`,
      data: {
        transporter: usersUpdate[0],
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
