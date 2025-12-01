const supabase = require("../db/supabase");

const DeliveryModel = {
  // Create a new delivery
  async create({
    user_id,
    username,
    pick_up_address,
    receiver_name,
    receiver_contact,
    destination_address,
    type_of_items,
    itemsize,
    weight,
    type_of_delivery,
    total_amount,
    payment_type,
  }) {
    const { data, error } = await supabase
      .from("createdeliveries")
      .insert({
        user_id,
        username,
        pick_up_address,
        receiver_name,
        receiver_contact,
        destination_address,
        type_of_items,
        itemsize,
        weight,
        type_of_delivery,
        total_amount,
        payment_type,
      })
      .select();
    return { data, error };
  },

  // Get all deliveries
  async findAll() {
    const { data, error } = await supabase
      .from("createdeliveries")
      .select("*");
    return { data, error };
  },

  // Get deliveries by token user
  async findByUser(user_id) {
    const { data, error } = await supabase
      .from("createdeliveries")
      .select("*")
      .eq("user_id", user_id)
      .order("date", { ascending: false });

    return { data, error };
  },

  // Update delivery status
  async updateStatus(user_id, status) {
    const { data, error } = await supabase
      .from("createdeliveries")
      .update({ status, delivered_at: status === "delivered" ? new Date() : null })
      .eq("user_id", user_id)
      .select();
    return { data, error };
  },
};

module.exports = DeliveryModel;
