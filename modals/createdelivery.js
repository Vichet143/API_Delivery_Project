const supabase = require("../db/supabase");

const DeliveryModel = {
  create: async (delivery) => {
    const { data, error } = await supabase
      .from("createdeliveries")
      .insert([delivery])
      .select();
    return { data, error };
  },

  findAll: async () => {
    const { data, error } = await supabase.from("createdeliveries").select("*");
    return { data, error };
  },

  findByUser: async (user_id) => {
    const { data, error } = await supabase
      .from("createdeliveries")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });
    return { data, error };
  },

  assignToTransporter: async (delivery_id, transporter_id, transporter_name) => {
    try {
      // Fetch delivery
      const { data: deliveryData, error: fetchError } = await supabase
        .from("createdeliveries")
        .select("*")
        .eq("delivery_id", delivery_id)
        .single();

      if (fetchError) return { data: null, error: fetchError };
      if (!deliveryData) return { data: null, error: new Error("Delivery not found") };

      // Prevent multiple acceptance
      if (deliveryData.status === "accepted") {
        return { data: null, error: new Error("Delivery has already been accepted") };
      }

      // Insert into transporter_deliveries
      const { data: inserted, error: insertError } = await supabase
        .from("transporter_deliveries")
        .insert([{
          delivery_id,
          transporter_id,
          transporter_name,
          user_id: deliveryData.user_id,
          username: deliveryData.username,
          pick_up_address: deliveryData.pick_up_address,
          receiver_name: deliveryData.receiver_name,
          receiver_contact: deliveryData.receiver_contact,
          destination_address: deliveryData.destination_address,
          type_of_items: deliveryData.type_of_items,
          itemsize: deliveryData.itemsize,
          weight: deliveryData.weight,
          type_of_delivery: deliveryData.type_of_delivery,
          payment_type: deliveryData.payment_type,
          total_amount: deliveryData.total_amount,
          status: "accepted",
          accepted_at: new Date(),
          updated_at: new Date()
        }])
        .select()
        .single();

      if (insertError) return { data: null, error: insertError };

      // Update createdeliveries status
      const { data: updated, error: updateError } = await supabase
        .from("createdeliveries")
        .update({
          status: "accepted",
          transporter_id,
          transporter_name,
          updated_at: new Date()
        })
        .eq("delivery_id", delivery_id)
        .select()
        .single();

      if (updateError) return { data: null, error: updateError };

      return { data: { inserted, updated }, error: null };

    } catch (err) {
      console.error("AssignToTransporter exception:", err);
      return { data: null, error: err };
    }
  },

  updateStatus: async (delivery_id, transporter_id, status) => {
    const { data, error } = await supabase
      .from("createdeliveries")
      .update({
        status,
        updated_at: new Date(),
        delivered_at: status === "delivered" ? new Date() : null
      })
      .eq("delivery_id", delivery_id)
      .eq("transporter_id", transporter_id)
      .select();
    return { data, error };
  }
};

module.exports = DeliveryModel;
