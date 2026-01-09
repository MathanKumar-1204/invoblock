"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // Fixed to login as default for main auth page
  const [role, setRole] = useState("msme");
  const [form, setForm] = useState({
    email: "",
    password: "",
    wallet: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (mode === "signup") {
        // Sign up user with Supabase
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
        });
        
        if (error) {
          throw error;
        }
        
        // If successful signup, update user profile with role and wallet
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              email: form.email,
              role: role,
              wallet_address: form.wallet,
              created_at: new Date().toISOString(),
            });
            
          if (profileError) {
            console.error('Error saving profile:', profileError);
            alert('Account created but profile update failed. Please contact support.');
          } else {
            alert('Account created successfully! Please check your email to verify your account.');
            // Reset form
            setForm({ email: '', password: '', wallet: '' });
          }
        } else {
          alert('Account created! Please check your email to verify your account.');
          setForm({ email: '', password: '', wallet: '' });
        }
      } else {
        // Sign in user with Supabase
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        
        if (error) {
          throw error;
        }
        
        alert('Login successful!');
        // Redirect to dashboard or home page
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert(error.message || 'Error with authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0b0f] flex items-center justify-center px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        {/* HEADER */}
        <h1 className="text-3xl font-bold text-center">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="mt-2 text-center text-gray-400 text-sm">
          {mode === "login"
            ? "Login to access the marketplace"
            : "Register to start using the platform"}
        </p>

        {/* ROLE SELECT */}
        <div className="mt-6">
          <label className="block text-sm text-gray-400 mb-2">
            Select Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="msme">MSME (Invoice Seller)</option>
            <option value="investor">Investor</option>
            <option value="buyer">Buyer / Verifier</option>
          </select>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* WALLET ONLY FOR SIGNUP */}
          {mode === "signup" && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Wallet Address (MetaMask)
              </label>
              <input
                type="text"
                name="wallet"
                placeholder="0x..."
                required
                value={form.wallet}
                onChange={handleChange}
                className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-4 rounded-lg bg-indigo-600 py-2 text-sm font-semibold hover:bg-indigo-500 transition"
            disabled={loading}
          >
            {loading ? (mode === "login" ? 'Logging In...' : 'Creating Account...') : mode === "login" ? 'Login' : 'Sign Up'}
          </button>
        </form>

        {/* SWITCH MODE */}
        <div className="mt-6 text-center text-sm text-gray-400">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-indigo-400 hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-indigo-400 hover:underline"
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}