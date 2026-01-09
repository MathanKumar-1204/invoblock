"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { animate, stagger } from "animejs";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabaseClient";

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id;
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }

        // Get user profile to determine if they can access this invoice
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          setError('Error fetching profile');
          setLoading(false);
          return;
        }

        // Fetch the invoice
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();

        if (error) {
          setError(error.message);
        } else {
          // Check if user can access this invoice
          if (profileData.role === 'msme' && data.created_by !== profileData.id) {
            setError('Access denied');
          } else if (profileData.role === 'buyer' && data.buyer_email !== profileData.email) {
            setError('Access denied');
          } else {
            setInvoice(data);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        
        // Animate elements on load
        animate(".animate-on-load", {
          translateY: [30, 0],
          opacity: [0, 1],
          delay: stagger(100),
          duration: 800,
          easing: "easeOutExpo",
        });
      }
    };

    fetchInvoice();
  }, [invoiceId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center text-white">
        <div className="text-center">
          <p>{error || 'Invoice not found'}</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold hover:bg-indigo-500 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-on-load">
          <h1 className="text-2xl font-semibold text-white mb-2">Invoice Details</h1>
          <p className="text-gray-400 mb-8">Detailed information about invoice #{invoice.invoice_number}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 animate-on-load mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Invoice Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Invoice Number:</span>
                  <span className="text-white">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white">{invoice.amount} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Due Date:</span>
                  <span className="text-white">{new Date(invoice.due_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    invoice.status === 'Tokenized' ? 'bg-green-900/50 text-green-400' : 
                    invoice.status === 'Pending' ? 'bg-yellow-900/50 text-yellow-400' : 
                    invoice.status === 'Approved' ? 'bg-blue-900/50 text-blue-400' : 
                    invoice.status === 'Declined' ? 'bg-red-900/50 text-red-400' : 
                    'bg-slate-800 text-gray-400'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white">{new Date(invoice.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Parties</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">MSME ID:</span>
                  <span className="text-white">{invoice.created_by?.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Buyer Email:</span>
                  <span className="text-white">{invoice.buyer_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Buyer Acknowledged:</span>
                  <span className="text-white">{invoice.buyer_acknowledged ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Owner:</span>
                  <span className="text-white">{invoice.owner}</span>
                </div>
                {invoice.listed_price && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Listed Price:</span>
                    <span className="text-white">{invoice.listed_price} ETH</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {invoice.pdf_url && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Invoice Document</h2>
              <a 
                href={invoice.pdf_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold hover:bg-indigo-500 transition"
              >
                View Invoice PDF
              </a>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white mb-4">Transaction History</h2>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-slate-800 rounded-lg">
                <span className="text-gray-400">Created</span>
                <span className="text-white">{new Date(invoice.created_at).toLocaleString()}</span>
              </div>
              {invoice.updated_at && (
                <div className="flex justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-gray-400">Last Updated</span>
                  <span className="text-white">{new Date(invoice.updated_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-slate-700 text-sm font-semibold hover:bg-slate-600 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}