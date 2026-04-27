"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ✅ AUTO REDIRECT IF ALREADY LOGGED IN
  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push("/dashboard");
      }
    }

    checkSession();
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!email.trim() || !password.trim()) {
         setMessage("Please enter your email and password.");
         setLoading(false); // ← add this
      return;
      }

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setMessage(
          "Account created. Check your email if confirmation is required, then sign in."
        );
      }
    } catch (err: any) {
      setMessage(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Zenavant</h1>
          <p className="mt-3 text-sm text-gray-600">
            Turn ideas into something new.
          </p>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="mb-6 flex rounded-2xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setMessage(null);
              }}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                mode === "signin"
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-white"
              }`}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage(null);
              }}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)} // ✅ FIXED
                placeholder="Enter your email"
                autoComplete="email"
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">
                Password
              </label>
              <div className="flex items-center gap-2 rounded-2xl border px-3">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} // ✅ FIXED
                  placeholder="Enter your password"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  className="w-full border-0 px-1 py-3 text-sm outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {message && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? mode === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "signin"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}