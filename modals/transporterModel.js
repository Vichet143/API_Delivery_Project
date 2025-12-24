const supabase = require("../db/supabase");
const { get } = require("../routes/transporterRoutes");

const transporterModel = {
  async create({ firstname, lastname, email, password, vehicle_type, license_plate }) {
    const { data, error } = await supabase
      .from("transporters")
      .insert({ firstname, lastname, email, password, vehicle_type, license_plate })
      .select()
      .single();
    return { data, error };
  },
  async findByEmail(email) {      
    const { data, error } = await supabase
      .from("transporters")
      .select("*")
      .eq("email", email)
      .single();
    return { data, error };
  },  

  async findById(id) {      
    const { data, error } = await supabase
      .from("transporters")
      .select("id, firstname, lastname, email, role, vehicle_type, license_plate")
      .eq("id", id)
      .single();
    return { data, error };
  },
  async getAllTransporters() {
    const { data, error } = await supabase.from("transporters").select("*");
    if (error) throw error;
    return data;
  },
};

module.exports = transporterModel;

