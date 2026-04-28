import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables'); // Custom RPC if it exists
  if (error) {
    // Fallback to querying information_schema if possible
    const { data: schemaData, error: schemaError } = await supabase
      .from('pg_tables') // This might not work via PostgREST
      .select('tablename')
      .eq('schemaname', 'public');
    console.log(schemaData || schemaError);
  } else {
    console.log(data);
  }
}
listTables();
