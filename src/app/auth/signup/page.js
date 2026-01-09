"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { animate, stagger } from "animejs";
import { onScroll } from "animejs/events";
import { supabase } from "../../../lib/supabaseClient";

const roles = [
  { value: "msme", label: "MSME (Invoice Seller)" },
  { value: "buyer", label: "Buyer / Verifier" },
  { value: "investor", label: "Investor" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wallet, setWallet] = useState("");
  const [role, setRole] = useState(roles[0].value);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Animate form elements on load
    animate(".form-item", {
      translateY: [30, 0],
      opacity: [0, 1],
      delay: stagger(100),
      duration: 800,
      easing: "easeOutExpo",
    });

    // Set up scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target, {
            translateX: [-20, 0],
            opacity: [0, 1],
            duration: 600,
            easing: "easeOutCubic",
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll(".animate-on-scroll").forEach((el) => {
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const redirectByRole = (roleValue) => {
    if (roleValue === "msme") router.replace("/dashboard/msme");
    else if (roleValue === "buyer") router.replace("/dashboard/buyer");
    else router.replace("/dashboard/investor");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccess("");

    try {
      // Create signup request with timeout handling
      const signUpResponse = await Promise.race([
        supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
            data: {
              role,
              wallet_address: wallet,
            },
          },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Request timeout - server took too long to respond")), 25000)
        ),
      ]);

      const { data, error } = signUpResponse;

      if (error) {
        // Check for network/timeout errors
        if (error.status === 504 || error.message?.includes('504') || error.message?.includes('timeout')) {
          setMessage("Server timeout. This may be due to email sending delays. Your account might still be created - please try logging in or check your email.");
        } else {
          setMessage(error.message || "Registration failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setMessage("Signup failed. No user returned.");
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      // Create the profile record
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          email,
          role,
          wallet_address: wallet,
        });

      if (profileError) {
        setMessage(profileError.message || "Failed to create profile.");
        setLoading(false);
        return;
      }

      if (data.session) {
        redirectByRole(role);
      } else {
        setSuccess("Account created. Please check your email to verify your account.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      if (err.message?.includes('timeout') || err.message?.includes('504')) {
        setMessage("Request timed out. The server may be processing your request. Please wait a moment and try logging in, or check your email for a confirmation link.");
      } else {
        setMessage(err.message || "Unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0b0f] flex items-center justify-center px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="animate-on-scroll">
          <h1 className="text-3xl font-bold text-center mb-2">
            Create Account
          </h1>
          <p className="text-center text-gray-400 text-sm mb-8">
            Register to start using the platform
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="space-y-6"
        >
          <div className="form-item">
            <label className="block text-sm text-gray-400 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          
          <div className="form-item">
            <label className="block text-sm text-gray-400 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          
          <div className="form-item">
            <label className="block text-sm text-gray-400 mb-2">
              Select Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-item">
            <label className="block text-sm text-gray-400 mb-2">
              Wallet Address (MetaMask)
            </label>
            <input
              type="text"
              required
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              placeholder="0x..."
            />
          </div>

          {message && (
            <div className="rounded-lg bg-red-900/50 px-3 py-2 text-sm text-red-300 border border-red-800">
              {message}
            </div>
          )}
          
          {success && (
            <div className="rounded-lg bg-green-900/50 px-3 py-2 text-sm text-green-300 border border-green-800">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 rounded-lg bg-indigo-600 py-2 text-sm font-semibold hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400 animate-on-scroll">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-indigo-400 hover:underline">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}