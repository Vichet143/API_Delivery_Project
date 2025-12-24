const supabase = require("../db/supabase")

exports.createUser = async (user) => {
  return await supabase.from("users").insert(user)
}

exports.findByEmail = async (email) => {
  return await supabase.from("users").select("*").eq("email", email).single()
}

exports.findById = async (id) => {
  return await supabase.from("users").select("id, firstname,lastname, email").eq("id", id).single()
}
exports.getalluser = async () => {
  const { data, error } = await supabase.from("all_users").select("*");
  if (error) throw error;
  return data;
};

const UserModel = {
  async createUser(user) {
    return await supabase.from("all_users").insert(user).select().single();
  },

  async findByEmail(email) {
    return await supabase.from("all_users").select("*").eq("email", email).single();
  },

  async findById(id) {
    const { data, error } = await supabase
      .from("all_users")
      .select("id, firstname, lastname, email, role")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("User not found");
    return { data };
  },

  async getAllUser() {
    const { data, error } = await supabase.from("users").select("*");
    if (error) throw error;
    return data;
  },

  async updatestatususer(id, status) {
    const userId = Number(id);

    // 1️⃣ update users table
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .update({ status })
      .eq("id", userId)
      .select();

    if (usersError) throw usersError;
    if (!usersData?.length) {
      throw new Error("User not found in users");
    }

    // 2️⃣ update all_users table
    await supabase
      .from("all_users")
      .update({ status })
      .eq("user_id", userId);

    return usersData[0];
  },

  async updateStatusDirect(userId, status) {
    console.log("Direct update for user ID:", userId);

    // 1. Update users table
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .update({ status })
      .eq("id", userId)
      .select("id, email, firstname, lastname, status");

    if (usersError) {
      console.error("Users table error:", usersError);
      throw usersError;
    }

    if (!usersData || usersData.length === 0) {
      throw new Error(`No user found with ID ${userId} in users table`);
    }

    const userEmail = usersData[0].email;

    // 2. Update all_users by email
    const { error: allUsersError } = await supabase
      .from("all_users")
      .update({
        status: status,
        user_id: userId  // Ensure it's correct
      })
      .eq("email", userEmail);

    if (allUsersError) {
      console.error("All_users table error:", allUsersError);
      // Option 1: Throw error
      // throw allUsersError;

      // Option 2: Continue (users table was updated)
      console.log("Warning: all_users not updated, but users table was");
    }

    return usersData[0];
  }

};

module.exports = UserModel;
