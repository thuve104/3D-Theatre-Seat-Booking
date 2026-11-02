"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, ShieldCheck, Ticket, User, LogOut, Sparkles } from "lucide-react";

interface UserSession {
  id?: string;
  email: string;
  role: string;
  fullName: string;
}

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [email, setEmail] = useState("guest@cineverse.io");
  const [password, setPassword] = useState("password123");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
      })
      .catch(() => {});
  }, [pathname]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const endpoint = authMode === "LOGIN" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Authentication failed");
      return;
    }
    setUser(data.user);
    setAuthModalOpen(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-cinema-obsidian/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-cinema-crimson flex items-center justify-center shadow-crimson-glow">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wider text-white">
                CINE<span className="text-cinema-crimson">VERSE</span>
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-cinema-gold -mt-1">
                3D Immersive Theatres
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-6 text-sm font-medium">
            <Link
              href="/"
              className={`transition ${
                pathname === "/" ? "text-cinema-gold" : "text-gray-300 hover:text-white"
              }`}
            >
              Movies & Showtimes
            </Link>
            <Link
              href="/shows/show-chronos-imax-1930/book"
              className={`flex items-center gap-1.5 transition ${
                pathname.includes("/shows/")
                  ? "text-cinema-gold"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4 text-cinema-crimson" />
              3D Seat Experience
            </Link>
            <Link
              href="/bookings"
              className={`flex items-center gap-1.5 transition ${
                pathname === "/bookings"
                  ? "text-cinema-gold"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              <Ticket className="w-4 h-4 text-cinema-gold" />
              My QR Tickets
            </Link>
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
                pathname.startsWith("/admin")
                  ? "border-cinema-gold bg-cinema-gold/10 text-cinema-gold"
                  : "border-white/10 bg-cinema-charcoal text-gray-300 hover:border-cinema-gold/50"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-cinema-gold" />
              Admin Studio
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white">{user.fullName}</div>
                  <div className="text-[10px] text-cinema-gold uppercase">{user.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-lg bg-cinema-charcoal border border-white/10 text-gray-300 hover:text-white"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cinema-crimson hover:bg-cinema-crimsonDark text-xs font-semibold text-white shadow-crimson-glow transition"
              >
                <User className="w-3.5 h-3.5" />
                Sign In / Demo Account
              </button>
            )}
          </div>
        </div>
      </nav>

      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-cinema-charcoal border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {authMode === "LOGIN" ? "Sign In to CINEVERSE" : "Create Customer Account"}
              </h3>
              <button
                onClick={() => setAuthModalOpen(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 text-xs bg-black/40 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("LOGIN");
                  setEmail("guest@cineverse.io");
                  setPassword("password123");
                }}
                className="flex-1 py-1.5 rounded bg-cinema-slate text-cinema-gold font-medium"
              >
                Fill Customer Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("LOGIN");
                  setEmail("admin@cineverse.io");
                  setPassword("password123");
                }}
                className="flex-1 py-1.5 rounded bg-cinema-slate text-white font-medium"
              >
                Fill Admin Demo
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-xs text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === "REGISTER" && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-sm text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cinema-crimson hover:bg-cinema-crimsonDark text-sm font-bold text-white shadow-crimson-glow transition"
              >
                {authMode === "LOGIN" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="text-center text-xs text-gray-400">
              {authMode === "LOGIN" ? (
                <button
                  onClick={() => setAuthMode("REGISTER")}
                  className="text-cinema-gold hover:underline"
                >
                  Need an account? Register here
                </button>
              ) : (
                <button
                  onClick={() => setAuthMode("LOGIN")}
                  className="text-cinema-gold hover:underline"
                >
                  Already registered? Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
