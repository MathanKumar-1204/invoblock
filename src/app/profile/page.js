"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { animate, stagger } from "animejs";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabaseClient";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    role: "",
    wallet_address: "",
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('email, role, wallet_address')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        router.push('/auth/login');
      } else {
        setProfile(profileData);
        setFormData({
          email: profileData.email || "",
          role: profileData.role || "",
          wallet_address: profileData.wallet_address || "",
        });
      }
      setLoading(false);

      // Animate elements on load
      animate(".animate-on-load", {
        translateY: [30, 0],
        opacity: [0, 1],
        delay: stagger(100),
        duration: 800,
        easing: "easeOutExpo",
      });
    };

    fetchProfile();
  }, [router]);

  const handleEdit = () => {
    setIsEditing(true);
    setMessage("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setFormData({
        email: profile.email || "",
        role: profile.role || "",
        wallet_address: profile.wallet_address || "",
      });
    }
    setMessage("");
  };

  const handleSave = async () => {
    if (!profile) {
      setMessage("Profile not found.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      // Update profile in database
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          wallet_address: formData.wallet_address,
        })
        .eq("id", session.user.id);

      if (profileError) {
        setMessage(profileError.message || "Failed to update profile.");
        setLoading(false);
        return;
      }

      setMessage("Profile updated successfully!");
      setIsEditing(false);
      setProfile({
        ...profile,
        wallet_address: formData.wallet_address,
      });
    } catch (err) {
      console.error("Update error:", err);
      setMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center text-white">
        <div className="text-center">
          <p>Access denied. Please log in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-on-load">
          <h1 className="text-2xl font-semibold text-white mb-2">Profile</h1>
          <p className="text-gray-400 mb-8">Manage your account details</p>
        </div>

        {message && (
          <div
            className={`rounded-lg px-3 py-2 text-sm mb-4 ${
              message.includes("success")
                ? "bg-green-900/50 text-green-300 border border-green-800"
                : "bg-red-900/50 text-red-300 border border-red-800"
            }`}
          >
            {message}
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 animate-on-load">
          {isEditing ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:bg-slate-800 disabled:text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    disabled
                    className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:bg-slate-800 disabled:text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Role cannot be changed after registration</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Wallet address
                </label>
                <input
                  type="text"
                  value={formData.wallet_address}
                  onChange={(e) =>
                    setFormData({ ...formData, wallet_address: e.target.value })
                  }
                  placeholder="0x..."
                  className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your MetaMask wallet address for blockchain transactions
                </p>
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-sm font-semibold hover:bg-slate-600 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Email</p>
                  <p className="text-white font-medium">
                    {profile?.email || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Role</p>
                  <p className="text-white font-medium capitalize">
                    {profile?.role || "N/A"}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-400 mb-2">Wallet address</p>
                <p className="text-white font-medium break-all">
                  {profile?.wallet_address || "Not provided"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Your MetaMask wallet address for blockchain transactions
                </p>
              </div>
              
              <button
                type="button"
                onClick={handleEdit}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold hover:bg-indigo-500 transition"
              >
                Edit profile
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 animate-on-load">
          <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Account Status:</span>
              <span className="text-white">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Member Since:</span>
              <span className="text-white">January 2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Role:</span>
              <span className="text-white capitalize">{profile.role}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}