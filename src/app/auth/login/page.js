"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { animate, stagger } from "animejs";
import { onScroll } from "animejs/events";
import { supabase } from "../../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Create login request with timeout handling
      const loginResponse = await Promise.race([
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Request timeout - server took too long to respond")), 25000)
        ),
      ]);

      const { data, error } = loginResponse;

      if (error) {
        // Check for network/timeout errors
        if (error.status === 504 || error.message?.includes('504') || error.message?.includes('timeout')) {
          setMessage("Server timeout. Please try again in a moment.");
        } else {
          setMessage(error.message || "Login failed. Please check your credentials.");
        }
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setMessage("Login failed. No user returned.");
        setLoading(false);
        return;
      }

      // Get user profile to determine role for redirect
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        // Default redirect if profile not found
        router.replace("/marketplace");
      } else {
        redirectByRole(profileData.role);
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.message?.includes('timeout') || err.message?.includes('504')) {
        setMessage("Request timed out. The server may be processing your request. Please wait a moment and try again.");
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
            Welcome Back
          </h1>
          <p className="text-center text-gray-400 text-sm mb-8">
            Login to access the marketplace
          </p>
        </div>

        <form
          onSubmit={handleLogin}
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

          {message && (
            <div className="rounded-lg bg-red-900/50 px-3 py-2 text-sm text-red-300 border border-red-800">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 rounded-lg bg-indigo-600 py-2 text-sm font-semibold hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {loading ? "Logging In..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400 animate-on-scroll">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="text-indigo-400 hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}