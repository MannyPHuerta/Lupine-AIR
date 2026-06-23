// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        const search = new URLSearchParams(location.search);
        const hash = new URLSearchParams(
          location.hash.startsWith("#") ? location.hash.slice(1) : location.hash
        );
        const get = (k) => search.get(k) || hash.get(k);

        const tokenHash = get("token_hash");
        const type = get("type"); // "magiclink" | "recovery" | "signup" | "invite" | "email_change"
        const code = get("code");
        const errParam = get("error_description") || get("error");

        if (errParam) throw new Error(decodeURIComponent(errParam));

        const rawNext = get("next") || "/ops";
        const safeNext =
          rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/ops";

        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (exErr) throw exErr;
        } else if (tokenHash && type) {
          const { error: vErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (vErr) throw vErr;
        } else {
          const access_token = hash.get("access_token");
          const refresh_token = hash.get("refresh_token");
          if (access_token && refresh_token) {
            const { error: sErr } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sErr) throw sErr;
          }
        }

        const { data, error: gErr } = await supabase.auth.getSession();
        if (gErr) throw gErr;
        if (!data?.session) {
          throw new Error("No session was established. Please request a new link.");
        }

        navigate(safeNext, { replace: true });
      } catch (e) {
        console.error("Auth callback error:", e);
        setError(e?.message || "Sign-in failed. Please try again.");
      }
    };
    run();
  }, [location.search, location.hash, navigate]);

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Sign-in problem</h1>
        <p style={{ color: "#b91c1c", marginBottom: 16 }}>{error}</p>
        <a href="/" style={{ color: "#2563eb" }}>Return home</a>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      Signing you in…
    </div>
  );
}
