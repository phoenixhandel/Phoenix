import { createClient } from "@supabase/supabase-js";
import type { AuthProvider } from "./session.js";

export const createSupabaseAuthProvider = ({ url, anonKey }: { url: string; anonKey: string }): AuthProvider => {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return {
    getUser: async (accessToken) => {
      const { data, error } = await client.auth.getUser(accessToken);
      if (error || !data.user) {
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email ?? null,
        emailVerified: Boolean(data.user.email_confirmed_at),
        phone: data.user.phone ?? null,
        phoneVerified: Boolean(data.user.phone_confirmed_at)
      };
    }
  };
};
