const supabase = require("../db/supabase");

exports.createConversation = async ({ delivery_id, user_id, transporter_id }) => {
  return await supabase
    .from("conversations")
    .insert([{ delivery_id, user_id, transporter_id }])
    .select()
    .single();
};

exports.getByDeliveryId = async (delivery_id) => {
  // Get conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('delivery_id', delivery_id)
    .single();

  if (convError) return { data: null, error: convError };

  // Get delivery info separately
  const { data: delivery, error: delError } = await supabase
    .from('createdeliveries')
    .select('*')
    .eq('delivery_id', delivery_id)
    .single();

  // Combine the data
  return {
    data: {
      ...conversation,
      delivery: delivery
    },
    error: delError
  };
};

