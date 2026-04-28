"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignIn() {
  setLoading(true); setError(null);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setError(error.message);
    setLoading(false);
  } else if (data.session) {
    window.location.replace("/dashboard");
  }
  
  setLoading(false);
  }

  async function handleSignUp() {
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setMessage("Check your email to confirm your account!");
    setLoading(false);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/dashboard` } });
  }

  const EyeOpen = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const EyeClosed = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .zv-root {
          min-height: 100vh;
          background: #FAF7F2;
          font-family: 'DM Sans', sans-serif;
          color: #3A2A1E;
          overflow-x: hidden;
          position: relative;
        }
        .zv-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
          animation: zvDrift 12s ease-in-out infinite alternate;
          pointer-events: none;
          z-index: 0;
        }
        .zv-orb-1 { width:500px;height:500px;background:radial-gradient(circle,#D4855E,#C4714A);top:-120px;left:-100px; }
        .zv-orb-2 { width:400px;height:400px;background:radial-gradient(circle,#E8C99A,#D4A96A);top:40%;right:-80px;animation-delay:-4s; }
        .zv-orb-3 { width:350px;height:350px;background:radial-gradient(circle,#C4A882,#A8845E);bottom:-100px;left:30%;animation-delay:-8s; }
        @keyframes zvDrift { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(30px,20px) scale(1.08)} }

        .zv-grain {
          position:fixed;inset:0;opacity:0.04;pointer-events:none;z-index:1;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size:200px;
        }

        .zv-page {
          position:relative;z-index:2;min-height:100vh;
          display:grid;grid-template-columns:1fr 1fr;
        }

        .zv-left {
          display:flex;flex-direction:column;justify-content:space-between;
          padding:52px 56px;
          animation:zvFadeUp 0.9s ease both;
        }
        @keyframes zvFadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }

        .zv-logo { font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#2C1F14;letter-spacing:0.02em; }
        .zv-logo span { color:#C4714A; }
        .zv-hero { flex:1;display:flex;flex-direction:column;justify-content:center;padding:40px 0; }
        .zv-eyebrow { font-size:11px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:#C4714A;margin-bottom:20px; }
        .zv-headline { font-family:'Cormorant Garamond',serif;font-size:clamp(42px,5vw,68px);font-weight:300;line-height:1.1;color:#2C1F14; }
        .zv-headline em { font-style:italic;color:#C4714A; }
        .zv-subline { margin-top:24px;font-size:16px;font-weight:300;color:#6B4F38;line-height:1.7;max-width:380px; }
        .zv-features { display:flex;flex-direction:column;gap:10px;margin-top:40px;padding:0;list-style:none; }
        .zv-feature { display:flex;align-items:center;gap:12px;font-size:14px;color:#6B4F38;list-style:none; }
        .zv-dot { width:6px;height:6px;border-radius:50%;background:#C4714A;flex-shrink:0; }
        .zv-quote { font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px;color:#9A7E68; }

        .zv-right {
          display:flex;align-items:center;justify-content:center;
          padding:52px 56px;
          animation:zvFadeUp 0.9s ease 0.15s both;
        }

        .zv-card {
          width:100%;max-width:420px;
          background:rgba(253,249,244,0.75);
          backdrop-filter:blur(24px);
          border:1px solid rgba(196,113,74,0.15);
          border-radius:24px;
          padding:48px 44px;
          box-shadow:0 8px 60px rgba(44,31,20,0.1),0 1px 0 rgba(255,255,255,0.8) inset;
          box-sizing:border-box;
        }

        .zv-card-title { font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:400;color:#2C1F14;margin-bottom:6px; }
        .zv-card-sub { font-size:14px;color:#7A6458;margin-bottom:36px; }

        .zv-tabs { display:flex;background:#E8DFD0;border-radius:12px;padding:4px;margin-bottom:32px; }
        .zv-tab { flex:1;padding:10px;text-align:center;font-size:13px;font-weight:500;color:#9A7E68;border-radius:9px;cursor:pointer;border:none;background:transparent;transition:all 0.2s;font-family:'DM Sans',sans-serif; }
        .zv-tab.active { background:white;color:#2C1F14;box-shadow:0 2px 8px rgba(44,31,20,0.12); }

        .zv-label { display:block;font-size:12px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#6B4F38;margin-bottom:8px; }
        .zv-field { margin-bottom:18px;width:100%; }
        .zv-field-row { display:flex;justify-content:space-between;align-items:center;margin-bottom:8px; }
        .zv-field-row .zv-label { margin-bottom:0; }

        .zv-input-wrap { position:relative;width:100%;display:block; }
        .zv-input {
          display:block;
          width:100%;
          padding:14px 48px 14px 16px;
          background:rgba(255,255,255,0.8);
          border:1.5px solid #E8DFD0;
          border-radius:12px;
          font-family:'DM Sans',sans-serif;
          font-size:15px;
          color:#2C1F14;
          outline:none;
          transition:border-color 0.2s,box-shadow 0.2s;
          box-sizing:border-box;
        }
        .zv-input:focus { border-color:#C4714A;box-shadow:0 0 0 3px rgba(196,113,74,0.12); }
        .zv-input::placeholder { color:#9A7E68;font-weight:300; }

        .zv-eye {
          position:absolute;right:14px;top:50%;transform:translateY(-50%);
          background:none;border:none;cursor:pointer;color:#9A7E68;padding:4px;
          display:flex;align-items:center;justify-content:center;
        }
        .zv-eye:hover { color:#C4714A; }

        .zv-forgot { font-size:12px;color:#C4714A;text-decoration:none; }

        .zv-btn {
          display:block;
          width:100%;
          padding:16px;
          background:linear-gradient(135deg,#C4714A,#A85A36);
          color:white;border:none;border-radius:12px;
          font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;letter-spacing:0.03em;
          cursor:pointer;margin-top:8px;
          transition:transform 0.15s,box-shadow 0.15s;
          box-shadow:0 4px 20px rgba(196,113,74,0.35);
          box-sizing:border-box;
        }
        .zv-btn:hover { transform:translateY(-1px);box-shadow:0 6px 28px rgba(196,113,74,0.45); }
        .zv-btn:disabled { opacity:0.6;cursor:not-allowed;transform:none; }

        .zv-divider { display:flex;align-items:center;gap:12px;margin:24px 0;color:#9A7E68;font-size:12px; }
        .zv-divider::before,.zv-divider::after { content:'';flex:1;height:1px;background:#E8DFD0; }

        .zv-social {
          display:flex;
          width:100%;
          padding:13px;background:white;border:1.5px solid #E8DFD0;border-radius:12px;
          font-family:'DM Sans',sans-serif;font-size:14px;color:#3A2A1E;cursor:pointer;
          transition:border-color 0.2s,box-shadow 0.2s;align-items:center;justify-content:center;gap:10px;
          box-sizing:border-box;
        }
        .zv-social:hover { border-color:#C4714A;box-shadow:0 2px 12px rgba(196,113,74,0.1); }

        .zv-error { background:#FEF2EE;border:1px solid #F0B8A0;color:#A85A36;border-radius:10px;padding:12px 14px;font-size:13px;margin-bottom:16px; }
        .zv-success { background:#F0F7EE;border:1px solid #A8C89A;color:#3A6B2E;border-radius:10px;padding:12px 14px;font-size:13px;margin-bottom:16px; }

        .zv-terms { margin-top:20px;text-align:center;font-size:12px;color:#9A7E68;line-height:1.6; }
        .zv-terms a { color:#C4714A;text-decoration:none; }

        @media (max-width: 768px) {
          .zv-page { grid-template-columns:1fr; }
          .zv-left { display:none; }
          .zv-right { padding:24px 20px; }
          .zv-card { padding:36px 28px; }
        }
      `}</style>

      <div className="zv-root">
        <div className="zv-orb zv-orb-1" />
        <div className="zv-orb zv-orb-2" />
        <div className="zv-orb zv-orb-3" />
        <div className="zv-grain" />

        <div className="zv-page">
          {/* Left */}
          <div className="zv-left">
            <div className="zv-logo">Zen<span>avant</span></div>
            <div className="zv-hero">
              <div className="zv-eyebrow">AI Creative Hub</div>
              <h1 className="zv-headline">
                Where ideas<br />become<br /><em>something new.</em>
              </h1>
              <p className="zv-subline">
                Generate images, videos, audio, and more — all in one beautifully crafted creative workspace.
              </p>
              <div className="zv-features">
                {["Image & video generation with top AI models", "Lip sync, image-to-video, audio tools", "Your creative library, always saved"].map((f) => (
                  <div key={f} className="zv-feature"><div className="zv-dot" />{f}</div>
                ))}
              </div>
            </div>
            <div className="zv-quote">"Creativity is intelligence having fun."</div>
          </div>

          {/* Right */}
          <div className="zv-right">
            <div className="zv-card">
              <div className="zv-card-title">{tab === "signin" ? "Welcome back" : "Create account"}</div>
              <div className="zv-card-sub">{tab === "signin" ? "Sign in to your creative space" : "Start creating for free today"}</div>

              <div className="zv-tabs">
                <button className={`zv-tab${tab === "signin" ? " active" : ""}`} onClick={() => { setTab("signin"); setError(null); setMessage(null); }}>Sign In</button>
                <button className={`zv-tab${tab === "signup" ? " active" : ""}`} onClick={() => { setTab("signup"); setError(null); setMessage(null); }}>Sign Up</button>
              </div>

              {error && <div className="zv-error">{error}</div>}
              {message && <div className="zv-success">{message}</div>}

              <div className="zv-field">
                <label className="zv-label">Email</label>
                <div className="zv-input-wrap">
                  <input className="zv-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="zv-field">
                <div className="zv-field-row">
                  <label className="zv-label">Password</label>
                  {tab === "signin" && <a href="/forgot-password" className="zv-forgot">Forgot password?</a>}
                </div>
                <div className="zv-input-wrap">
                  <input className="zv-input" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="zv-eye" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              {tab === "signup" && (
                <div className="zv-field">
                  <label className="zv-label">Confirm Password</label>
                  <div className="zv-input-wrap">
                    <input className="zv-input" type={showConfirm ? "text" : "password"} placeholder="Repeat your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                    <button type="button" className="zv-eye" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeClosed /> : <EyeOpen />}
                    </button>
                  </div>
                </div>
              )}

              <button className="zv-btn" disabled={loading} onClick={tab === "signin" ? handleSignIn : handleSignUp}>
                {loading ? "Please wait…" : tab === "signin" ? "Sign In" : "Create Account"}
              </button>

              <div className="zv-divider">or continue with</div>

              <button className="zv-social" onClick={handleGoogle}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Google
              </button>

              <div className="zv-terms">
                By continuing you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}