'use client';
import React, { useState } from 'react';
import { financeSupabase } from '@/lib/finance_supabase';

type APTransaction = {
  id: string;
  vendor_name: string;
  vendor_email: string;
  amount: number;
  currency: string;
  date_received: string;
  status: string;
  due_date: string | null;
};

export default function AccountsPayableTable({ transactions, onResolved }: { transactions: APTransaction[], onResolved: () => void }) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleResolve = async (id: string) => {
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
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
              <th className="p-4 font-medium">Vendor</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Amount</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-sm">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                <td className="p-4">
                  <div className="font-medium text-white">{tx.vendor_name}</div>
                  <div className="text-xs text-gray-500">{tx.vendor_email}</div>
                </td>
                <td className="p-4 text-gray-300">
                  {new Date(tx.date_received).toLocaleDateString()}
                </td>
                <td className="p-4 font-medium text-white">
                  {tx.currency} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    tx.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    tx.status === 'upcoming' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {tx.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleResolve(tx.id)}
                    disabled={resolvingId === tx.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-3 py-1.5 rounded disabled:opacity-50"
                  >
                    {resolvingId === tx.id ? 'Updating...' : 'Mark as Resolved'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
