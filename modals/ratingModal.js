const supabase  = require("../db/supabase");

const RatingModel = {
  async create({ user_id, username, rating_text }) {
    const { data, error } = await supabase
      .from("ratings")
      .insert({ user_id, username, rating_text })
      .select();
    return { data, error };
  },

  async findAll() {
    const { data, error } = await supabase
      .from("ratings")
      .select("*")
      .order("timestamp", { ascending: false });
    return { data, error };
  },

  async findByUser(user_id) {
    const { data, error } = await supabase
      .from("ratings")
      .select("*")
      .eq("user_id", user_id)
      .order("timestamp", { ascending: false });
    return { data, error };
  }
};

module.exports = { RatingModel };
