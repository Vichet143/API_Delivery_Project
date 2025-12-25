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
      success: true,
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

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // 1. First fetch from all_users table
    const { data: allUser, error: allUserError } = await supabase
      .from("all_users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (allUserError) {
      console.error("Error fetching from all_users:", allUserError);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: allUserError.message
      });
    }

    // Check if user exists in all_users
    if (!allUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials" // Generic message for security
      });
    }

    // Check if account is banned BEFORE password check
    if (allUser.status === "ban" || allUser.status === "banned") {
      console.log("🚫 Banned account attempt:", email);

      // Log security event
      await supabase
        .from("security_logs")
        .insert([{
          user_id: allUser.user_id || allUser.id, // Use whichever field exists
          email: email,
          action: 'login_attempt_banned',
          ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }]);

      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact administrator.",
        code: "ACCOUNT_SUSPENDED"
      });
    }

    // 2. Fetch from source table with password
    const { data: transporter, error: transporterError } = await supabase
      .from(allUser.source_table)
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (transporterError) {
      console.error("Error fetching from source table:", transporterError);
      return res.status(500).json({
        success: false,
        message: "Database error fetching user details"
      });
    }

    if (!transporter) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // 3. Verify password
    const passwordMatch = await comparePassword(password, transporter.password);
    if (!passwordMatch) {
      // Log failed attempt
      await supabase
        .from("security_logs")
        .insert([{
          user_id: allUser.user_id || allUser.id,
          email: email,
          action: 'login_failed_password',
          ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }]);

      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // 4. Generate JWT token
    const tokenPayload = {
      id: transporter.id,
      all_user_id: allUser.id, // Include reference to all_users
      firstname: transporter.firstname,
      lastname: transporter.lastname,
      email: transporter.email,
      role: allUser.role,
      source_table: allUser.source_table,
      vehicle_type: transporter.vehicle_type,
      license_plate: transporter.license_plate
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Remove sensitive data
    const { password: _, ...transporterWithoutPassword } = transporter;

    // 6. Log successful login
    await supabase
      .from("security_logs")
      .insert([{
        user_id: allUser.user_id || allUser.id,
        email: email,
        action: 'login_success',
        ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      }]);

    // 7. Return success response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: transporter.id,
          all_user_id: allUser.id,
          firstname: transporter.firstname,
          lastname: transporter.lastname,
          email: transporter.email,
          role: allUser.role,
          vehicle_type: transporter.vehicle_type,
          license_plate: transporter.license_plate,
          status: allUser.status // Use status from all_users
        },
        token
      }
    });

  } catch (err) {
    console.error("loginTransporter error:", err);

    // Log unexpected errors
    await supabase
      .from("security_logs")
      .insert([{
        email: req.body?.email,
        action: 'login_error_system',
        ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        error_message: err.message,
        timestamp: new Date().toISOString()
      }]);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getTransporterProfile = async (req, res) => {
  try {
    const { id } = req.params;
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

exports.updateTransporterProfile = async (req, res) => {
  try {
    const { firstname, lastname, email, license_plate, vehicle_type, status } = req.body;
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
      .from("transporters")
      .select("id, email, firstname, lastname, license_plate, vehicle_type, status")
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
      console.log("❌ Transporter not found in database");
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found in database`
      });
    }

    console.log("✅ User found:", user.email);

    // STEP 2: Try to update users table directly
    console.log("🔍 STEP 2: Attempting to update users table...");
    console.log("SQL equivalent: UPDATE users SET firstname = ?, lastname = ?, email = ?, license_plate = ?, vehicle_type = ?, status = ? WHERE id = ?", firstname, lastname, email, license_plate, vehicle_type, status, userId);

    const { data: usersUpdate, error: usersError } = await supabase
      .from("transporters")
      .update({
        firstname: firstname,
        lastname: lastname,
        email: email,
        license_plate: license_plate,
        vehicle_type: vehicle_type,
        status: status
      })
      .eq("id", userId)
      .select("id, email, firstname, lastname, license_plate, vehicle_type, status"); // Only select needed fields

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
        .update({
          firstname: firstname,
          lastname: lastname,
          email: email,
          license_plate: license_plate,
          vehicle_type: vehicle_type,
          status: status  
        })
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
        license_plate: license_plate,
        vehicle_type: vehicle_type,
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
      .select("id, email, firstname, lastname")
      .eq("id", userId)
      .single();

    console.log("📊 Verification result:", verifyUser);
    console.log("✅ ========== DEBUG END ==========");

    return res.json({
      success: true,
      message: `Transporter profile updated successfully`,
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

exports.getAllTransporter = async (req, res) => {
  try {
    const transporters = await transporterModel.getAllTransporters();
    return res.status(200).json({ success: true, transporters });
  } catch (err) {
    console.error("Error in getAllTransporter controller:", err);
    return res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};