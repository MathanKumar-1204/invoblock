"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { animate, stagger } from "animejs";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabaseClient";
import { repayInvoiceOnChain } from "../../../lib/contractUtils";
export default function BuyerDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [processedInvoices, setProcessedInvoices] = useState([]);
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

      // Check if user has Buyer role
      if (profileData.role !== 'buyer') {
        // Redirect to appropriate dashboard based on role
        if (profileData.role === 'msme') {
          router.push('/dashboard/msme');
        } else if (profileData.role === 'investor') {
          router.push('/dashboard/investor');
        } else {
          router.push('/marketplace');
        }
        return;
      }

      setProfile(profileData);

      // Fetch pending invoices where buyer_email matches the user's email
      const { data: pendingData, error: pendingError } = await supabase
        .from('invoices')
        .select('*')
        .eq('buyer_email', profileData.email)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('Error fetching pending invoices:', pendingError);
      } else {
        setPendingInvoices(pendingData || []);
      }

      // Fetch processed invoices (we'll consider Tokenized as processed for buyer approval)
      const { data: processedData, error: processedError } = await supabase
        .from('invoices')
        .select('*')
        .eq('buyer_email', profileData.email)
        .neq('status', 'Pending') // All non-pending invoices are considered processed
        .order('updated_at', { ascending: false });

      if (processedError) {
        console.error('Error fetching processed invoices:', processedError);
      } else {
        setProcessedInvoices(processedData || []);
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

    fetchProfileAndInvoices();
  }, [router]);

  const handleApprove = async (invoiceId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/login');
      return;
    }
  const handleRepayInvestor = async (invoice) => {
    if (!invoice.token_id) {
        setMessage("Error: This invoice is not on the blockchain yet.");
        return;
    }

    setMessage("Connecting to blockchain for repayment...");
    setLoading(true);

    try {
        // 1. Trigger Blockchain Transaction
        // We pass the Token ID and the ORIGINAL Amount (invoice.amount)
        const txReceipt = await repayInvoiceOnChain(invoice.token_id, invoice.amount);
        console.log("Repayment Receipt:", txReceipt);

        // 2. Update Database Status
        const { error } = await supabase
            .from('invoices')
            .update({ 
                status: 'Paid', 
                updated_at: new Date().toISOString()
            })
            .eq('id', invoice.id);

        if (error) throw error;

        setMessage(`✅ Successfully repaid ${invoice.amount} ETH to the investor!`);
        
        // Update UI
        setProcessedInvoices(prev => prev.map(inv => 
            inv.id === invoice.id ? { ...inv, status: 'Paid' } : inv
        ));

    } catch (error) {
        console.error("Repayment failed:", error);
        setMessage("Repayment failed: " + (error.message || "Unknown error"));
    } finally {
        setLoading(false);
    }
  };
    // Update buyer_acknowledged to true and change status to "Acknowledged"
    // MSME will then need to list it for sale to tokenize it
    const { error } = await supabase
      .from('invoices')
      .update({ 
        buyer_acknowledged: true,
        status: 'Acknowledged', // Change status to Acknowledged, waiting for MSME to list
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Invoice approved successfully!");
      // Refresh the lists
      const updatedPending = pendingInvoices.filter(inv => inv.id !== invoiceId);
      setPendingInvoices(updatedPending);
      
      // Add to processed list
      const { data: updatedInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (updatedInvoice) {
        setProcessedInvoices([updatedInvoice, ...processedInvoices]);
      }
    }
  };
  const handleRepayInvestor = async (invoice) => {
    if (!invoice.token_id) {
        setMessage("Error: This invoice is not on the blockchain yet.");
        return;
    }

    setMessage("Connecting to blockchain for repayment...");
    setLoading(true);

    try {
        // 1. Trigger Blockchain Transaction
        // We pass the Token ID and the ORIGINAL Amount (invoice.amount)
        const txReceipt = await repayInvoiceOnChain(invoice.token_id, invoice.amount);
        console.log("Repayment Receipt:", txReceipt);

        // 2. Update Database Status
        const { error } = await supabase
            .from('invoices')
            .update({ 
                status: 'Paid', 
                updated_at: new Date().toISOString()
            })
            .eq('id', invoice.id);

        if (error) throw error;

        setMessage(`✅ Successfully repaid ${invoice.amount} ETH to the investor!`);
        
        // Update UI
        setProcessedInvoices(prev => prev.map(inv => 
            inv.id === invoice.id ? { ...inv, status: 'Paid' } : inv
        ));

    } catch (error) {
        console.error("Repayment failed:", error);
        setMessage("Repayment failed: " + (error.message || "Unknown error"));
    } finally {
        setLoading(false);
    }
  };
  const handleDecline = async (invoiceId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/login');
      return;
    }

    // For declined invoices, we'll update buyer_acknowledged to false and status to "Cancelled"
    // but first we'll try with a status that we know is allowed: "Pending" but with acknowledged set to false
    // Actually, let's try to use a status that might be allowed - let's use "Withdrawn" or just keep it as "Pending"
    // Let's try to update without changing the status, just update buyer_acknowledged to false
    const { error } = await supabase
      .from('invoices')
      .update({ 
        buyer_acknowledged: false,
        status: 'Withdrawn', // Try using Withdrawn status
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);

    // If "Withdrawn" doesn't work, let's handle the error and try a different approach
    if (error) {
      // If Withdrawn status is not allowed, we'll just keep it as pending but mark buyer_acknowledged as false
      const fallbackError = await supabase
        .from('invoices')
        .update({ 
          status: 'Pending', // Keep as pending but with acknowledged set to false
          buyer_acknowledged: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (fallbackError) {
        setMessage("Error declining invoice: " + error.message);
      } else {
        setMessage("Invoice declined successfully!");
        // Refresh the lists
        const updatedPending = pendingInvoices.filter(inv => inv.id !== invoiceId);
        setPendingInvoices(updatedPending);
        
        // Add to processed list
        const { data: updatedInvoice } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();
        
        if (updatedInvoice) {
          setProcessedInvoices([updatedInvoice, ...processedInvoices]);
        }
      }
    } else {
      setMessage("Invoice declined successfully!");
      // Refresh the lists
      const updatedPending = pendingInvoices.filter(inv => inv.id !== invoiceId);
      setPendingInvoices(updatedPending);
      
      // Add to processed list
      const { data: updatedInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (updatedInvoice) {
        setProcessedInvoices([updatedInvoice, ...processedInvoices]);
      }
    }
  };

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
          <h1 className="text-2xl font-semibold text-white mb-2">Buyer Dashboard</h1>
          <p className="text-gray-400 mb-8">
            Review and approve invoice requests from MSMEs
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

        {/* Pending Invoices Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 animate-on-load mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Pending Invoice Requests</h2>
          {pendingInvoices.length === 0 ? (
            <p className="text-gray-400">No pending invoice requests.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-3">Invoice #</th>
                    <th className="px-3 py-3">MSME</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Due Date</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 cursor-pointer" onClick={() => handleInvoiceClick(invoice.id)}>
                      <td className="px-3 py-3 font-semibold text-white">{invoice.invoice_number}</td>
                      <td className="px-3 py-3">
                        <span className="text-gray-300">MSME ID: {invoice.created_by?.substring(0, 8)}...</span>
                      </td>
                      <td className="px-3 py-3">{invoice.amount} ETH</td>
                      <td className="px-3 py-3">{new Date(invoice.due_date).toLocaleDateString()}</td>
                      <td className="px-3 py-3">{new Date(invoice.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent the row click from triggering
                              handleApprove(invoice.id);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-green-600 text-xs font-semibold hover:bg-green-500 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent the row click from triggering
                              handleDecline(invoice.id);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-red-600 text-xs font-semibold hover:bg-red-500 transition"
                          >
                            Decline
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Processed Invoices Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 animate-on-load">
          <h2 className="text-lg font-semibold text-white mb-4">Processed Invoices</h2>
          {processedInvoices.length === 0 ? (
            <p className="text-gray-400">No processed invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-3">Invoice #</th>
                    <th className="px-3 py-3">MSME</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Due Date</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {processedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-slate-800 last:border-0">
                      <td className="px-3 py-3 font-semibold text-white">{invoice.invoice_number}</td>
                      <td className="px-3 py-3">
                        <span className="text-gray-300">MSME ID: {invoice.created_by?.substring(0, 8)}...</span>
                      </td>
                      <td className="px-3 py-3">{invoice.amount} ETH</td>
                      <td className="px-3 py-3">{new Date(invoice.due_date).toLocaleDateString()}</td>
                      <td className="px-3 py-3">
                         <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                            invoice.status === 'Paid' ? 'bg-green-500/20 text-green-400' : 
                            invoice.status === 'Sold' ? 'bg-purple-900/50 text-purple-400' :
                            'bg-slate-800 text-gray-400'
                         }`}>
                            {invoice.status}
                         </span>
                      </td>
                      <td className="px-3 py-3">
                        {/* Only show 'Repay' button if the status is 'Sold' (meaning Investor bought it) */}
                        {invoice.status === 'Sold' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRepayInvestor(invoice);
                                }}
                                disabled={loading}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-semibold hover:bg-indigo-500 transition text-white"
                            >
                                Pay {invoice.amount} ETH
                            </button>
                        )}
                        {invoice.status === 'Paid' && <span className="text-gray-500">Settled</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 animate-on-load">
          <h2 className="text-lg font-semibold text-white mb-4">Instructions</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <p>• Review each invoice request carefully before approving or declining</p>
            <p>• Approved invoices will be tokenized and made available to investors</p>
            <p>• Declined invoices will not be processed further</p>
            <p>• All actions are logged and visible in the processed invoices section</p>
          </div>
        </div>
      </div>
    </div>
  );
}