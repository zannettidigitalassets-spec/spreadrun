import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export function AuthModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleSendLink = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setStatus("sending");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/app",
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(13,27,62,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20,
    }} onClick={onClose}>
      <div
        style={{
          background: "#fff", borderRadius: 16, padding: "36px 32px",
          maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 6, height: 22, background: "#0B5FFF", borderRadius: 2 }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: "#0D1B3E" }}>SpreadRun</span>
        </div>

        {status === "sent" ? (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0D1B3E", margin: "0 0 10px" }}>Check your email</h2>
            <p style={{ fontSize: 14.5, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 20px" }}>
              We sent a login link to <strong>{email}</strong>. Click it to sign in — no password needed.
            </p>
            <button onClick={onClose} style={{
              width: "100%", background: "#F0F4FF", color: "#0B5FFF", border: "none",
              borderRadius: 10, padding: "12px 0", fontSize: 14.5, fontWeight: 700, cursor: "pointer",
            }}>Close</button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0D1B3E", margin: "0 0 8px" }}>Sign in to SpreadRun</h2>
            <p style={{ fontSize: 14.5, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 20px" }}>
              Enter your email and we'll send you a magic link. No password required.
            </p>
            <form onSubmit={handleSendLink}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  borderRadius: 10, border: "1.5px solid #EBF0FF", fontSize: 14.5,
                  marginBottom: 14, outline: "none",
                }}
              />
              {status === "error" && (
                <p style={{ fontSize: 13, color: "#D14343", margin: "0 0 14px" }}>{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={status === "sending"}
                style={{
                  width: "100%", background: "#0B5FFF", color: "#fff", border: "none",
                  borderRadius: 10, padding: "13px 0", fontSize: 14.5, fontWeight: 700,
                  cursor: status === "sending" ? "default" : "pointer",
                  opacity: status === "sending" ? 0.7 : 1,
                }}
              >
                {status === "sending" ? "Sending..." : "Send Magic Link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export function UserMenu({ user }) {
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#F0F4FF", border: "none", borderRadius: 99,
          padding: "7px 14px", fontSize: 13.5, fontWeight: 700, color: "#0B5FFF",
          cursor: "pointer",
        }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: 99, background: "#0B5FFF",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800,
        }}>
          {user.email[0].toUpperCase()}
        </div>
        {user.email.split("@")[0]}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "#fff", border: "1px solid #EBF0FF", borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)", padding: 8, minWidth: 180, zIndex: 50,
        }}>
          <div style={{ padding: "8px 12px", fontSize: 12.5, color: "#9BA8C0", borderBottom: "1px solid #EBF0FF", marginBottom: 4 }}>
            {user.email}
          </div>
          <button onClick={handleSignOut} style={{
            width: "100%", textAlign: "left", background: "none", border: "none",
            padding: "8px 12px", fontSize: 14, color: "#D14343", fontWeight: 600,
            cursor: "pointer", borderRadius: 8,
          }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
