const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SERVICE_ROLE_KEY // service role key
)

module.exports = supabaseAdmin
