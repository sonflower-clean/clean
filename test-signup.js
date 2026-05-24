require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function test() {
  const { data, error } = await supabase.auth.signUp({
    email: 'testuser123@clean.local',
    password: 'password1234'
  });
  console.log("Error:", error?.message);
}
test();
