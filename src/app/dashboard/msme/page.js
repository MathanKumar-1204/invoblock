"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { animate, stagger } from "animejs";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabaseClient";
import { listInvoiceOnChain, isMetaMaskInstalled, getConnectedWallet } from "../../../lib/contractUtils";

export default function MsmeDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    invoice_number: "",
    amount: "",
    due_date: "",
    buyer_email: "",
    listed_price: "",
  });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, email, role, wallet_address')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        router.push('/auth/login');
      } else {
        // Check if user has MSME role
        if (profileData.role !== 'msme') {
          // Redirect to appropriate dashboard based on role
          if (profileData.role === 'buyer') {
            router.push('/dashboard/buyer');
          } else if (profileData.role === 'investor') {
            router.push('/dashboard/investor');
          } else {
            router.push('/marketplace');
          }
          return;
        }
        setProfile(profileData);
      }
      setLoadingProfile(false);
    };

    fetchProfile();
  }, [router]);

  // Fetch invoices for this user
  const fetchInvoices = async () => {
    if (!profile?.id) return;
    
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("created_by", profile.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      setMessage(error.message);
    } else {
      setInvoices(data ?? []);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchInvoices();
    }
    
    // Animate elements on load
    animate(".animate-on-load", {
      translateY: [30, 0],
      opacity: [0, 1],
      delay: stagger(100),
      duration: 800,
      easing: "easeOutExpo",
    });
  }, [profile]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("Please attach invoice PDF.");
      return;
    }
    setLoading(true);
    setMessage("");

    const path = `${profile.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("msme")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setMessage(uploadError.message);
      setLoading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("msme")
      .getPublicUrl(path);

    const { error: insertError } = await supabase.from("invoices").insert({
      invoice_number: form.invoice_number,
      amount: Number(form.amount),
      due_date: form.due_date,
      buyer_email: form.buyer_email,
      buyer_acknowledged: false,
      status: "Pending",
      pdf_url: publicUrlData?.publicUrl,
      listed_price: form.listed_price ? Number(form.listed_price) : null,
      created_by: profile.id,
      owner: profile.email, // Add the owner column with the creator's email
    });

    if (insertError) {
      setMessage(insertError.message);
      setLoading(false);
      return;
    }

    setForm({
      invoice_number: "",
      amount: "",
      due_date: "",
      buyer_email: "",
      listed_price: "",
    });
    setFile(null);
    fetchInvoices();
    setMessage("Invoice uploaded successfully.");
    setLoading(false);
  };

  const handleListForSale = async (invoiceId, listedPrice) => {
    console.log('handleListForSale called with:', { invoiceId, listedPrice });
    
    // 1. UPDATE THIS SELECT QUERY
    // You MUST fetch 'amount' and 'pdf_url' now, not just status!
    const { data: invoiceData, error: fetchError } = await supabase
      .from("invoices")
      .select("buyer_acknowledged, status, amount, pdf_url") 
      .eq("id", invoiceId)
      .single();

    console.log('Invoice data:', invoiceData);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      setMessage(fetchError.message);
      return;
    }

    if (!invoiceData.buyer_acknowledged) {
      setMessage("Buyer must acknowledge the invoice before it can be listed for sale.");
      return;
    }

    if (invoiceData.status !== 'Acknowledged') {
      setMessage("Invoice must be acknowledged by buyer before listing. Current status: " + invoiceData.status);
      return;
    }

    if (!listedPrice || listedPrice <= 0) {
      setMessage("Please enter a valid listed price.");
      return;
    }

    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress) {
      setMessage("Smart contract not configured.");
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
        setMessage("Please connect your MetaMask wallet and refresh the page.");
        setLoading(false);
        return;
      }

      setMessage("Listing invoice on blockchain... Please confirm transaction.");

      // 2. UPDATE THIS FUNCTION CALL
      // Pass all 4 arguments: (ID, Listed Price, Original Amount, PDF URL)
      const txReceipt = await listInvoiceOnChain(
          invoiceId, 
          listedPrice, 
          invoiceData.amount,   // <--- Passed from DB
          invoiceData.pdf_url   // <--- Passed from DB
      );
      
      console.log('Transaction receipt:', txReceipt);

      // 3. EXTRACT TOKEN ID (Recommended)
      // (Optional: If you want to save the Token ID properly like we discussed before)
      let tokenId = null;
      if (txReceipt.events?.InvoiceCreated?.returnValues) {
          tokenId = txReceipt.events.InvoiceCreated.returnValues.id;
      }
      // If your Web3 version uses slightly different event structure, 
      // you might need to check txReceipt.events.InvoiceCreated.returnValues[0]

      setMessage("Transaction confirmed! Updating database...");

      const { error } = await supabase
        .from("invoices")
        .update({ 
          status: "Tokenized", 
          listed_price: listedPrice,
          blockchain_tx_hash: txReceipt.transactionHash,
          token_id: tokenId ? tokenId.toString() : null, // Save the ID if you found it
          updated_at: new Date().toISOString()
        })
        .eq("id", invoiceId);
      
      if (error) {
        console.error('Database update error:', error);
        setMessage("Blockchain transaction succeeded but database update failed: " + error.message);
      } else {
        setMessage(`✅ Invoice listed! TX: ${txReceipt.transactionHash.substring(0, 10)}...`);
        fetchInvoices();
      }
    } catch (error) {
      console.error("Blockchain listing error:", error);
      let errorMessage = "Failed to list invoice: ";
      if (error.message?.includes('User denied')) errorMessage += "Transaction rejected.";
      else errorMessage += error.message || "Unknown error.";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceClick = (invoiceId) => {
    router.push(`/invoice/${invoiceId}`);
  };

  if (loadingProfile) {
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
          <h1 className="text-2xl font-semibold text-white mb-2">MSME Dashboard</h1>
          <p className="text-gray-400 mb-8">
            Upload invoices, track buyer acknowledgement, and list verified invoices for investors.
          </p>
        </div>

        <form
          onSubmit={handleUpload}
          className="grid gap-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-8 animate-on-load"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Invoice number
                </label>
                <input
                  required
                  value={form.invoice_number}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, invoice_number: e.target.value }))
                  }
                  className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount (ETH)</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Listed price (ETH, optional)
                  </label>
                  <input
                    type="number"
                    value={form.listed_price}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, listed_price: e.target.value }))
                    }
                    className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Due date
                </label>
                <input
                  type="date"
                  required
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, due_date: e.target.value }))
                  }
                  className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Buyer email
                </label>
                <input
                  type="email"
                  required
                  value={form.buyer_email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, buyer_email: e.target.value }))
                  }
                  className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">PDF</label>
              <input
                type="file"
                accept="application/pdf"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg bg-[#0b0b0f] border border-slate-700 px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white"
              />
            </div>

            {message && (
              <div className={`rounded-lg px-4 py-3 text-sm mb-6 border ${
                message.includes('successfully') || message.includes('✅')
                  ? 'bg-green-900/50 text-green-300 border-green-800' 
                  : message.includes('Failed') || message.includes('error') || message.includes('Error')
                  ? 'bg-red-900/50 text-red-300 border-red-800'
                  : message.includes('Connecting') || message.includes('Listing') || message.includes('confirm')
                  ? 'bg-blue-900/50 text-blue-300 border-blue-800'
                  : 'bg-slate-800 text-gray-300 border-slate-700'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Upload invoice"}
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-800 p-4 text-sm text-gray-300">
            <p className="font-semibold text-white">Workflow guidance</p>
            <ul className="mt-2 list-disc space-y-2 pl-4">
              <li>Buyer acknowledgement is required before investor purchase.</li>
              <li>Use clear invoice numbers and due dates.</li>
              <li>Set listed price to the discounted sale value for investors.</li>
            </ul>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 animate-on-load">
          <h2 className="text-lg font-semibold text-white mb-4">Your invoices</h2>
          {invoices.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">No invoices yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-3">Invoice</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Due</th>
                    <th className="px-3 py-3">Buyer</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Listed</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 cursor-pointer" onClick={() => handleInvoiceClick(inv.id)}>
                      <td className="px-3 py-3 font-semibold text-white">
                        {inv.invoice_number}
                      </td>
                      <td className="px-3 py-3">{inv.amount} ETH</td>
                      <td className="px-3 py-3">{new Date(inv.due_date).toLocaleDateString()}</td>
                      <td className="px-3 py-3">{inv.buyer_email}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          inv.status === 'Tokenized' ? 'bg-green-900/50 text-green-400' : 
                          inv.status === 'Acknowledged' ? 'bg-blue-900/50 text-blue-400' :
                          inv.status === 'Pending' ? 'bg-yellow-900/50 text-yellow-400' : 
                          inv.status === 'Withdrawn' ? 'bg-red-900/50 text-red-400' :
                          'bg-slate-800 text-gray-400'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {inv.listed_price ? `${inv.listed_price} ETH` : "-"}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent the row click from triggering
                            handleListForSale(
                              inv.id,
                              inv.listed_price ?? form.listed_price ?? 0
                            );
                          }}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                          disabled={inv.status === 'Tokenized' || inv.status !== 'Acknowledged' || loading}
                        >
                          {inv.status === 'Tokenized' ? 'Listed' : inv.status === 'Acknowledged' ? 'List for sale' : 'Awaiting Buyer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}