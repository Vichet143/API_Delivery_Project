const supabase = require("../db/supabase")

exports.createUser = async (transporter) => {
  return await supabase.from("transporters").insert(transporter)
}

exports.findByEmail = async (email) => {
  return await supabase.from("transporters").select("*").eq("email", email).single()
}

exports.findById = async (id) => {
  return await supabase
    .from("transporters")
    .select("transporter_id, firstname, lastname, email")
    .eq("transporter_id", id)
    .single();
};

