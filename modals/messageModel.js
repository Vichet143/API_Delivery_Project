const supabase = require("../db/supabase");

exports.createMessage = async ({
  conversation_id,
  sender_role,
  sender_id,
  message
}) => {
  return await supabase
    .from("messages")
    .insert([{ conversation_id, sender_role, sender_id, message }])
    .select()
    .single();
};

exports.getMessagesByConversation = async (conversation_id) => {
  return await supabase
    .from('messages')
    .select(`
      *,
      conversations!inner(
        *,
        createdeliveries!conversations_delivery_id_fkey(*)
      )
    `)
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true });
};
