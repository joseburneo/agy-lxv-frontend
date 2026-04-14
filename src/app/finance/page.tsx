'use client';

import React, { useEffect, useState } from 'react';
import { financeSupabase } from '@/lib/finance_supabase';
import MetricCard from './components/MetricCard';
import AccountsPayableTable from './components/AccountsPayableTable';

export default function FinanceDashboard() {
  const [apTransactions, setApTransactions] = useState<any[]>([]);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch latest unresolved AP
      const { data: apData, error: apErr } = await financeSupabase
        .from('ap_transactions')
        .select('*')
        .in('status', ['pending', 'failed', 'upcoming', 'paid'])
        .order('transaction_date', { ascending: false });

      if (apErr) throw apErr;
      
      const data = apData || [];
      
      const receipts: any[] = [];
      const alerts: any[] = [];
      
      for (const tx of data) {
         const subj = (tx.email_subject || '').toLowerCase();
         // If it sounds like a failure/warning/attempt, treat as an alert
         if (subj.includes('unsuccessful') || subj.includes('failed') || subj.includes('failure') || subj.includes('action required') || subj.includes('intento') || subj.includes('aviso')) {
             alerts.push(tx);
         } else {
             // Otherwise treat it as a receipt or standalone upcoming notice
             receipts.push(tx);
         }
      }
      
      const deduped = [...receipts]; // Always show real receipts!
      
      // We only show failure notices if they aren't covered by a receipt, AND we deduplicate them
      const receiptHashes = new Set(
          receipts.map(tx => {
             const d = new Date(tx.transaction_date);
             return `${tx.vendor_name}-${Math.round(tx.amount)}-${d.getFullYear()}-${d.getMonth()}`;
          })
      );
      
      const seenAlerts = new Set();
      
      for (const tx of alerts) {
          const d = new Date(tx.transaction_date);
          const hash = `${tx.vendor_name}-${Math.round(tx.amount)}-${d.getFullYear()}-${d.getMonth()}`;
          
          if (receiptHashes.has(hash)) continue; // Covered by a receipt
          if (seenAlerts.has(hash)) continue;    // Covered by another alert we already pushed
          
          seenAlerts.add(hash);
          deduped.push(tx);
      }
      
      // Sort final deduped array by date descending
      deduped.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      
      setApTransactions(deduped);

      // Fetch the latest daily snapshot
      const { data: snapData, error: snapErr } = await financeSupabase
        .from('finance_daily_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (snapErr && snapErr.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error("Snapshot error:", snapErr);
      } else {
        setSnapshot(snapData);
      }
    } catch (err: any) {
      console.error('Error fetching finance data:', err);
      // Suppress specific error messages if table just doesn't exist yet, to not break UI.
      setError('Failed to load financial data. Ensure the database migrations have been run and keys are valid.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute 7-day liability live
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const upcoming7DayAP = apTransactions
    .filter(tx => ['pending', 'failed', 'upcoming'].includes(tx.status))
    .reduce((sum, tx) => {
      const txDate = new Date(tx.transaction_date);
      // Wait, historical failed dates might be in the past. We treat all 'pending' and 'failed' as immediate liabilities.
      return sum + Number(tx.amount);
    }, 0); 
    // Actually, "Total Accounts Payable" might be everything pending. "7 day AP" could just be everything strictly due in 7 days or overdue. Wait, any 'pending' or 'failed' is overdue! So let's sum ALL pending/failed as "Immediate Liabilities"
    
  const immediateLiabilities = apTransactions
    .filter(tx => ['pending', 'failed'].includes(tx.status))
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end pb-6 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">CFO Dashboard</h1>
            <p className="text-gray-400">Automated Financial Forecasting & Accounts Payable Review</p>
          </div>
          <div className="mt-4 md:mt-0 text-sm text-gray-500">
            {snapshot ? `Last updated: ${new Date(snapshot.created_at).toLocaleString()}` : 'Live View'}
          </div>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* High-Level Metrics (Reordered AR -> AP -> Forecast) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard 
            title="Total Accounts Receivable" 
            value={snapshot ? `د.إ ${Number(snapshot.total_ar_outstanding).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '...'}
            description="Currently tracked outstanding client payments"
            trend={snapshot && snapshot.total_ar_outstanding > 0 ? 'up' : 'neutral'}
            trendValue="Active invoices"
          />
          <MetricCard 
            title="Upcoming Accounts Payable" 
            value={snapshot ? `USD ${Number(snapshot.total_ap_upcoming_30d).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '...'}
            description="Vendor expenses identified in Gmail/Drive"
            trend={immediateLiabilities > 0 ? 'down' : 'neutral'}
            trendValue={`Immediate/Overdue: USD ${immediateLiabilities.toFixed(2)}`}
          />
          <MetricCard 
            title="30-Day Forecast (AED)" 
            value={snapshot ? `د.إ ${Number((snapshot.total_ar_outstanding || 0) * 3.67 - (snapshot.total_ap_upcoming_30d || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '...'}
            description="Projected net balance (AR inbound - AP outbound)"
            trend="neutral"
            trendValue="30d outlook"
            onClick={() => setIsModalOpen(true)}
          />
        </section>

        {/* Dynamic Views / Tables */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Accounts Payable History</h2>
            <button onClick={loadData} disabled={loading} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
          
          {loading && !error ? (
            <div className="h-64 flex items-center justify-center border border-white/5 bg-white/5 rounded-2xl animate-pulse">
              <span className="text-gray-500 font-medium">Loading transactions...</span>
            </div>
          ) : (
            <AccountsPayableTable 
              transactions={apTransactions} 
              onResolved={loadData} 
            />
          )}
        </section>

        {/* Interactive Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all" onClick={() => setIsModalOpen(false)}>
            <div 
              className="w-full max-w-2xl bg-neutral-900 border-l border-white/10 h-full p-8 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300"
              onClick={e => e.stopPropagation()} // Prevent close when clicking inside drawer
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Financial Forecast Breakdown</h2>
                  <p className="text-gray-400 text-sm mt-1">Expected inflows and outflows over the next 30 days.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-2">✕</button>
              </div>

              {/* Chart Placeholder / Visualizer */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 flex flex-col items-center justify-center min-h-[200px]">
                <div className="flex items-center justify-between w-full max-w-sm mb-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 font-semibold uppercase">Accounts Receivable</div>
                    <div className="text-lg font-bold text-green-400">+ د.إ {Number(snapshot?.total_ar_outstanding || 0).toLocaleString()}</div>
                  </div>
                  <div className="text-gray-600 font-light text-2xl">-</div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 font-semibold uppercase">Accounts Payable</div>
                    <div className="text-lg font-bold text-red-400">- USD {Number(snapshot?.total_ap_upcoming_30d || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="w-full h-[1px] bg-white/10 my-4" />
                <div className="text-center">
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Projected 30d Balance</div>
                  <div className="text-3xl font-extrabold text-white">
                    د.إ {Number((snapshot?.total_ar_outstanding || 0) * 3.67 - (snapshot?.total_ap_upcoming_30d || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </div>
                </div>
              </div>

              {/* Transactions Breakdown */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-green-400 uppercase tracking-wider mb-3">Expected Inflows (AR)</h3>
                  <div className="bg-white/5 border border-green-500/10 rounded-lg p-4 w-full text-sm">
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-white">Active Agency Subscriptions</span>
                      <span className="text-gray-400">د.إ {snapshot?.total_ar_outstanding}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-red-400 uppercase tracking-wider mb-3">Pending Outflows (AP)</h3>
                  <div className="bg-white/5 border border-red-500/10 rounded-lg p-1 w-full text-sm">
                    {apTransactions.filter(tx => ['pending', 'failed', 'upcoming'].includes(tx.status)).map((tx, idx) => (
                      <div key={idx} className="flex justify-between items-center py-3 px-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{tx.vendor_name}</span>
                          <span className="text-gray-500 text-xs truncate max-w-[250px]">{tx.email_subject || 'Subscription'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-300 block">USD {Number(tx.amount).toFixed(2)}</span>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${tx.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {apTransactions.filter(tx => ['pending', 'failed', 'upcoming'].includes(tx.status)).length === 0 && (
                      <div className="p-4 text-gray-500 text-center">No pending outflows detected.</div>
                    )}
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
