'use client';
import React, { useState } from 'react';
import { financeSupabase } from '@/lib/finance_supabase';

type APTransaction = {
  id: string;
  vendor_name: string;
  vendor_email: string;
  amount: number;
  currency: string;
  transaction_date: string;
  status: string;
  due_date: string | null;
  email_subject?: string;
  email_from?: string;
  payment_method?: string;
  failure_reason?: string;
  notes?: string;
  receipt_number?: string;
  invoice_number?: string;
  created_at?: string;
};

export default function AccountsPayableTable({ transactions, onResolved }: { transactions: APTransaction[], onResolved: () => void }) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<APTransaction | null>(null);

  const handleResolve = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // don't open modal when clicking resolve
    setResolvingId(id);
    const { error } = await financeSupabase
      .from('ap_transactions')
      .update({ status: 'paid' })
      .eq('id', id);

    if (!error) {
      onResolved();
    } else {
      console.error('Failed to resolve transaction:', error);
      alert('Error updating transaction status.');
    }
    setResolvingId(null);
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-md">
        <p className="text-gray-400">No pending accounts payable at this time.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                <th className="p-4 font-medium">Vendor</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {transactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  onClick={() => setSelectedTx(tx)}
                  className="hover:bg-white/10 transition-colors group cursor-pointer"
                >
                  <td className="p-4">
                    <div className="font-medium text-white">{tx.vendor_name}</div>
                    <div className="text-xs text-gray-500">{tx.vendor_email || tx.email_from || 'N/A'}</div>
                  </td>
                  <td className="p-4 text-xs text-gray-400 max-w-xs break-words">
                    {tx.email_subject ? tx.email_subject.split(' ').slice(0, 8).join(' ') + (tx.email_subject.split(' ').length > 8 ? '...' : '') : 'No description'}
                  </td>
                  <td className="p-4 text-gray-300">
                    {new Date(tx.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="p-4 font-medium text-white">
                    {tx.currency} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      tx.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      tx.status === 'upcoming' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      tx.status === 'paid' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {tx.status !== 'paid' && (
                      <button
                        onClick={(e) => handleResolve(e, tx.id)}
                        disabled={resolvingId === tx.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-3 py-1.5 rounded disabled:opacity-50"
                      >
                        {resolvingId === tx.id ? 'Updating...' : 'Mark as Resolved'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedTx(null)}>
          <div 
            className="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="border-b border-white/10 px-6 py-4 flex justify-between items-center bg-white/5">
              <h3 className="text-lg font-semibold text-white tracking-tight">Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} className="text-gray-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Header Amount */}
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Amount</div>
                  <div className="text-3xl font-bold text-white">{selectedTx.currency} {selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                  selectedTx.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  selectedTx.status === 'upcoming' ? 'bg-amber-500/20 text-amber-400' :
                  selectedTx.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {selectedTx.status}
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm bg-black/20 p-4 rounded-xl border border-white/5">
                <div>
                  <div className="text-gray-500 mb-1 text-xs uppercase tracking-wider">Vendor</div>
                  <div className="text-white font-medium">{selectedTx.vendor_name}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1 text-xs uppercase tracking-wider">Transaction Date</div>
                  <div className="text-white">{new Date(selectedTx.transaction_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})}</div>
                </div>
                {selectedTx.invoice_number && (
                  <div>
                    <div className="text-gray-500 mb-1 text-xs uppercase tracking-wider">Invoice #</div>
                    <div className="text-gray-300 font-mono">{selectedTx.invoice_number}</div>
                  </div>
                )}
                {selectedTx.receipt_number && (
                  <div>
                    <div className="text-gray-500 mb-1 text-xs uppercase tracking-wider">Receipt #</div>
                    <div className="text-gray-300 font-mono">{selectedTx.receipt_number}</div>
                  </div>
                )}
                <div className="col-span-2">
                  <div className="text-gray-500 mb-1 text-xs uppercase tracking-wider">Email Subject</div>
                  <div className="text-gray-300 leading-relaxed max-h-16 overflow-y-auto pr-2">{selectedTx.email_subject || 'N/A'}</div>
                </div>
                {selectedTx.email_from && (
                  <div className="col-span-2">
                    <div className="text-gray-500 mb-1 text-xs uppercase tracking-wider">Sender Address</div>
                    <div className="text-gray-400 break-all">{selectedTx.email_from}</div>
                  </div>
                )}
                {selectedTx.failure_reason && (
                  <div className="col-span-2 bg-red-500/10 p-3 rounded border border-red-500/20 mt-2">
                    <div className="text-red-400 mb-1 text-xs uppercase tracking-wider font-bold">Failure Reason</div>
                    <div className="text-red-200">{selectedTx.failure_reason}</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end">
                {selectedTx.status !== 'paid' && (
                  <button
                    onClick={(e) => { handleResolve(e, selectedTx.id); setSelectedTx(null); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded shadow transition-colors"
                  >
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
