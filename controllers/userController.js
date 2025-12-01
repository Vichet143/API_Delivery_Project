const supabase = require("../db/supabase")

exports.getProfile = async (req, res) => {
  const { id } = req.user

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error in getProfile:", error);
    return res.status(400).json({ error });
  }
  res.json(data);
}
