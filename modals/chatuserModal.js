const supabase = require("../db/supabase");

const chartuserModal = {
  async create({ user_id, username, message, date }) {
    // Validate input
    if (!user_id || !message) {
      return { data: null, error: "user_id and message are required" };
    }

    const { data, error } = await supabase
      .from("chatusers")
      .insert({ user_id, username, message, date })
      .select();

    return { data, error };
  },
};

module.exports = chartuserModal;
