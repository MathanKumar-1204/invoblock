"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { animate, stagger } from "animejs";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabaseClient";
import { purchaseInvoiceOnChain, isMetaMaskInstalled, getConnectedWallet } from "../../../lib/contractUtils";

export default function InvestorDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [purchasedInvoices, setPurchasedInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfileAndInvoices = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, wallet_address')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        router.push('/auth/login');
        return;
      }

      // Check if user has Investor role
      if (profileData.role !== 'investor') {
        // Redirect to appropriate dashboard based on role
        if (profileData.role === 'msme') {
          router.push('/dashboard/msme');
        } else if (profileData.role === 'buyer') {
          router.push('/dashboard/buyer');
        } else {
          router.push('/marketplace');
        }
        return;
      }

      setProfile(profileData);

      // Fetch available invoices for investors (tokenized and approved by buyer)
      const { data: availableData, error: availableError } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'Tokenized')
        .order('created_at', { ascending: false });

      if (availableError) {
        console.error('Error fetching available invoices:', availableError);
      } else {
        setAvailableInvoices(availableData || []);
      }

      // For now, we'll consider purchased invoices as a future feature
      // In a real app, you would track purchased invoices separately
      setPurchasedInvoices([]);

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

    fetchProfileAndInvoices();
  }, [router]);

  // UPDATED: Now accepts the whole invoice object
  const handlePurchase = async (invoice) => {
    // Check 1: Validate Price
    if (!invoice.listed_price || invoice.listed_price <= 0) {
      setMessage("Invalid price for purchase.");
      return;
    }
    
    // Check 2: Validate Token ID
    if (!invoice.token_id) {
       setMessage("Error: This invoice is not linked to the blockchain (Missing Token ID).");
       return;
    }

    if (!isMetaMaskInstalled()) {
      setMessage("MetaMask is not installed.");
      return;
    }

    setLoading(true);
    setMessage("Connecting to blockchain...");

    try {
      const walletAddress = await getConnectedWallet();
      if (!walletAddress) {
        setMessage("Please connect your MetaMask wallet.");
        setLoading(false);
        return;
      }

      setMessage("Purchasing invoice on blockchain... Please confirm transaction.");

      // 1. BLOCKCHAIN CALL: Use token_id (e.g., "1")
      const txReceipt = await purchaseInvoiceOnChain(invoice.token_id, invoice.listed_price);
      console.log("Purchase Receipt:", txReceipt);

      // 2. DATABASE UPDATE: Use id (UUID) (e.g., "a1b2-c3d4...")
      const { error } = await supabase
        .from("invoices")
        .update({ 
          status: "Sold", 
          owner: profile.email,
          // Optional: Save the buyer's wallet if you have that column
          // owner_wallet: walletAddress, 
          updated_at: new Date().toISOString()
        })
        .eq("id", invoice.id); 
      
      if (error) {
        setMessage("Blockchain success but DB update failed: " + error.message);
      } else {
        setMessage(`✅ Invoice successfully purchased! TX: ${txReceipt.transactionHash.substring(0, 10)}...`);
        fetchProfileAndInvoices();
      }
    } catch (error) {
      console.error("Purchase error:", error);
      let errorMessage = "Failed to purchase: " + (error.message || "Unknown error");
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const fetchProfileAndInvoices = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
    }
  const handleInvoiceClick = (invoiceId) => {
    router.push(`/invoice/${invoiceId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4">Loading dashboard...</p>
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-on-load">
          <h1 className="text-2xl font-semibold text-white mb-2">Investor Dashboard</h1>
          <p className="text-gray-400 mb-8">
            Browse and invest in tokenized invoices from MSMEs
          </p>
        </div>

        {message && (
          <div className={`rounded-lg px-3 py-2 text-sm mb-4 border ${
            message.includes('successfully') 
              ? 'bg-green-900/50 text-green-300 border-green-800' 
              : 'bg-red-900/50 text-red-300 border-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Available Invoices Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 animate-on-load mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Available for Investment</h2>
          {availableInvoices.length === 0 ? (
            <p className="text-gray-400">No invoices available for investment at the moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-3">Invoice #</th>
                    <th className="px-3 py-3">MSME</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Due Date</th>
                    <th className="px-3 py-3">Listed Price</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {availableInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 cursor-pointer" onClick={() => handleInvoiceClick(invoice.id)}>
                      <td className="px-3 py-3 font-semibold text-white">{invoice.invoice_number}</td>
                      <td className="px-3 py-3">
                        <span className="text-gray-300">MSME ID: {invoice.created_by?.substring(0, 8)}...</span>
                      </td>
                      <td className="px-3 py-3">{invoice.amount} ETH</td>
                      <td className="px-3 py-3">{new Date(invoice.due_date).toLocaleDateString()}</td>
                      <td className="px-3 py-3">{invoice.listed_price ? `${invoice.listed_price} ETH` : "-"}</td>
                      <td className="px-3 py-3">{new Date(invoice.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // CORRECT: Pass the entire invoice object!
                            handlePurchase(invoice); 
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-semibold hover:bg-indigo-500 transition disabled:opacity-50"
                          disabled={!invoice.listed_price || loading}
                        >
                          {loading ? 'Processing...' : 'Invest'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Purchased Invoices Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 animate-on-load">
          <h2 className="text-lg font-semibold text-white mb-4">Your Investments</h2>
          {purchasedInvoices.length === 0 ? (
            <p className="text-gray-400">You haven't invested in any invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-3">Invoice #</th>
                    <th className="px-3 py-3">MSME</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Due Date</th>
                    <th className="px-3 py-3">Investment</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchasedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 cursor-pointer" onClick={() => handleInvoiceClick(invoice.id)}>
                      <td className="px-3 py-3 font-semibold text-white">{invoice.invoice_number}</td>
                      <td className="px-3 py-3">
                        <span className="text-gray-300">MSME ID: {invoice.created_by?.substring(0, 8)}...</span>
                      </td>
                      <td className="px-3 py-3">{invoice.amount} ETH</td>
                      <td className="px-3 py-3">{new Date(invoice.due_date).toLocaleDateString()}</td>
                      <td className="px-3 py-3">{invoice.listed_price ? `${invoice.listed_price} ETH` : "-"}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full px-3 py-1 text-xs font-medium bg-blue-900/50 text-blue-400">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 animate-on-load">
          <h2 className="text-lg font-semibold text-white mb-4">Investment Guidelines</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <p>• Review each invoice carefully before investing</p>
            <p>• Consider the MSME's creditworthiness and invoice terms</p>
            <p>• Your investment will be returned when the invoice is paid</p>
            <p>• All transactions are recorded on the blockchain</p>
          </div>
        </div>
      </div>
    </div>
  );
}