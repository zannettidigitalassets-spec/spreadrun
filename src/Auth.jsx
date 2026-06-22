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

// Looks up the signed-in user's actual subscription_tier from the profiles table,
// which is the table only the webhook (using the service key) is allowed to write to.
// This is the real source of truth for "did this person actually pay," as opposed
// to just checking whether someone happens to be logged in.
export function useSubscription(user) {
  const [tier, setTier] = useState(null); // null while loading, then 'free' | 'starter' | 'pro'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTier(null);
      setLoading(false);
      return;
    }

    // Safety timeout — if Supabase doesn't respond in 5 seconds, default to free tier
    const timeout = setTimeout(() => {
      console.warn('useSubscription timed out — defaulting to free tier');
      setTier('free');
      setLoading(false);
    }, 5000);

    setLoading(true);
    supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('email', user.email)
      .maybeSingle()
      .then(({ data, error }) => {
        clearTimeout(timeout);
        if (error) {
          console.error('Failed to load subscription tier:', error.message);
          setTier('free');
        } else {
          setTier(data?.subscription_tier ?? 'free');
        }
        setLoading(false);
      });

    return () => clearTimeout(timeout);
  }, [user]);

  const isStarter = tier === 'starter' || tier === 'pro';

  return { tier, isStarter, loading };
}

export function AuthModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | verifying | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setStatus("sending");
    setErrorMsg("");

    // signInWithOtp sends a numeric code by email when the template shows {{ .Token }}
    // instead of a clickable link. No emailRedirectTo needed since there's no redirect step.
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code || code.length < 8) return;
    setStatus("verifying");
    setErrorMsg("");

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setStatus("error");
      setErrorMsg("That code didn't work. Check it and try again, or request a new one.");
    } else {
      onClose();
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

        {status === "sent" || status === "verifying" ? (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0D1B3E", margin: "0 0 8px" }}>Enter your code</h2>
            <p style={{ fontSize: 14.5, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 20px" }}>
              We sent a sign-in code to <strong>{email}</strong>. Enter it below to sign in.
            </p>
            <form onSubmit={handleVerifyCode}>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="12345678"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  borderRadius: 10, border: "1.5px solid #EBF0FF", fontSize: 20,
                  fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.2em", textAlign: "center",
                  marginBottom: 14, outline: "none",
                }}
              />
              {status === "error" && (
                <p style={{ fontSize: 13, color: "#D14343", margin: "0 0 14px" }}>{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={status === "verifying" || code.length < 8}
                style={{
                  width: "100%", background: "#0B5FFF", color: "#fff", border: "none",
                  borderRadius: 10, padding: "13px 0", fontSize: 14.5, fontWeight: 700,
                  cursor: status === "verifying" ? "default" : "pointer",
                  opacity: status === "verifying" || code.length < 8 ? 0.6 : 1,
                  marginBottom: 10,
                }}
              >
                {status === "verifying" ? "Verifying..." : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => { setStatus("idle"); setCode(""); setErrorMsg(""); }}
                style={{
                  width: "100%", background: "none", color: "#6B7A99", border: "none",
                  fontSize: 13, cursor: "pointer", padding: "4px 0",
                }}
              >
                Use a different email
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0D1B3E", margin: "0 0 8px" }}>Sign in to SpreadRun</h2>
            <p style={{ fontSize: 14.5, color: "#6B7A99", lineHeight: 1.6, margin: "0 0 20px" }}>
              Enter your email and we'll send you a sign-in code. No password required.
            </p>
            <form onSubmit={handleSendCode}>
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
                {status === "sending" ? "Sending..." : "Send Code"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export function UserMenu({ user, isStarter }) {
  const [open, setOpen] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch('/api/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to open customer portal:', err);
    }
    setLoadingPortal(false);
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
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)", padding: 8, minWidth: 200, zIndex: 50,
        }}>
          <div style={{ padding: "8px 12px", fontSize: 12.5, color: "#9BA8C0", borderBottom: "1px solid #EBF0FF", marginBottom: 4 }}>
            {user.email}
          </div>
          {isStarter && (
            <button
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              style={{
                width: "100%", textAlign: "left", background: "none", border: "none",
                padding: "8px 12px", fontSize: 14, color: "#0B5FFF", fontWeight: 600,
                cursor: loadingPortal ? "default" : "pointer", borderRadius: 8,
                opacity: loadingPortal ? 0.6 : 1,
              }}
            >
              {loadingPortal ? "Loading..." : "Manage Subscription"}
            </button>
          )}
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
