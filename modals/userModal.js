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
