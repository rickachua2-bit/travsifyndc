
import { supabaseAdmin } from "../src/integrations/supabase/client.server";

async function checkAdmins() {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role");
  
  if (error) {
    console.error("Error fetching roles:", error);
    return;
  }

  const admins = data.filter(r => r.role === 'admin');
  console.log("Admins found:", admins.length);
  if (admins.length > 0) {
      console.log("First admin ID:", admins[0].user_id);
  }
  console.log("Total roles:", data.length);
}

checkAdmins();
