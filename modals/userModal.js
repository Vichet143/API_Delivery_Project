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
    const { data, error } = await supabase.from("all_users").select("*");
    if (error) throw error;
    return data;
  },
};

module.exports = UserModel;
