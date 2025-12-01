const supabase = require("../db/supabase");

const PaymentModel = {
  async payment({ user_id, username, delivery_id, provider, amount, status, transaction_id, paid_at }) {
    const { data, error } = await supabase
      .from("payments")
      .insert({ user_id, username, delivery_id, provider, amount, status, transaction_id, paid_at })
      .select();
    return { data, error };
  }
}

module.exports = PaymentModel;