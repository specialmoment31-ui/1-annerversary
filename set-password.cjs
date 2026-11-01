const { createClient } = require("@supabase/supabase-js");
const readline = require("node:readline/promises");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  const url = await rl.question("Supabase project URL: ");
  const key = await rl.question("Private secret/service_role key: ");
  const email = await rl.question("Existing user's Gmail: ");
  const password = await rl.question("New website password: ");

  const supabase = createClient(url.trim(), key.trim(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (error) throw error;

  const user = data.users.find(
    (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
  );

  if (!user) {
    throw new Error(
      "User not found on the first page. No changes were made."
    );
  }

  const { error: updateError } =
    await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });

  if (updateError) throw updateError;

  console.log("Password updated successfully for the existing user.");
}

main()
  .catch((error) => {
    console.error("Could not update password:", error.message);
    process.exitCode = 1;
  })
  .finally(() => rl.close());