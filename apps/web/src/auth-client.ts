import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export const getAuthClient = () => {
  if (client !== undefined) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) { client = null; return client; }
  client = createClient(url, anonKey);
  client.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token) window.localStorage.setItem("phoenix_access_token", session.access_token);
    else window.localStorage.removeItem("phoenix_access_token");
  });
  return client;
};

export const getAccessToken = async () => {
  const auth = getAuthClient();
  const session = auth ? (await auth.auth.getSession()).data.session : null;
  if (session?.access_token) window.localStorage.setItem("phoenix_access_token", session.access_token);
  return session?.access_token ?? null;
};

export const provisionApplicationUser = async () => {
  const token = await getAccessToken();
  if (!token) return;
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}/api/auth/provision`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error("ACCOUNT_PROVISIONING_FAILED");
};
