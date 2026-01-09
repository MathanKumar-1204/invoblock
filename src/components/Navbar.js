"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function Navbar({ showProfile = true }) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, email, role, wallet_address')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        setProfile(profileData);
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-indigo-400">
              MSME Invoice Marketplace
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {profile && (
              <Link 
                href="/marketplace" 
                className="px-3 py-2 rounded-lg hover:bg-slate-800 transition text-gray-300 hover:text-white"
              >
                Marketplace
              </Link>
            )}
            {showProfile && profile && (
              <div className="relative group">
                <button className="px-3 py-2 rounded-lg hover:bg-slate-800 transition text-gray-300 hover:text-white">
                  Profile
                </button>
                <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 hidden group-hover:block z-20">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-400 border-b border-slate-700">
                      <p>{profile?.email || 'Loading...'}</p>
                      <p className="text-xs text-gray-500">Wallet: {profile?.wallet_address?.slice(0, 6)}...{profile?.wallet_address?.slice(-4)}</p>
                    </div>
                    <Link 
                      href="/profile"
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700"
                    >
                      View Profile
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
            {!profile && !loading && (
              <Link 
                href="/auth/login"
                className="px-3 py-2 rounded-lg hover:bg-slate-800 transition text-gray-300 hover:text-white"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}