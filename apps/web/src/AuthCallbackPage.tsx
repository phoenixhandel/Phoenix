import { useEffect, useState } from "react";
import { getAuthClient, provisionApplicationUser } from "./auth-client";

export const AuthCallbackPage = () => {
  const [message, setMessage] = useState("Ihr Zugang wird vorbereitet…");

  useEffect(() => {
    let active = true;
    const complete = async () => {
      const auth = getAuthClient();
      const session = auth ? (await auth.auth.getSession()).data.session : null;
      if (!session?.user.email_confirmed_at) {
        if (active)
          setMessage(
            "Die Anmeldung konnte nicht bestätigt werden. Bitte versuchen Sie es erneut."
          );
        return;
      }
      await provisionApplicationUser();
      window.location.assign("/verify-identity");
    };
    void complete().catch(() => {
      if (active)
        setMessage(
          "Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut."
        );
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#07101e] p-5 text-slate-100">
      <section className="w-full max-w-md border border-[#1e2a40] bg-[#0d1727] p-7">
        <a
          href="/"
          className="text-sm font-semibold tracking-[0.18em] text-cyan-200"
        >
          PHOENIX
        </a>
        <h1 className="mt-7 text-2xl font-semibold text-white">
          Zugang vorbereiten
        </h1>
        <p role="status" className="mt-3 text-sm leading-6 text-slate-400">
          {message}
        </p>
      </section>
    </main>
  );
};
