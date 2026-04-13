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

        {/* High-Level Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard 
            title="30-Day Forecast (AED)" 
            value={snapshot ? `د.إ ${Number(snapshot.forecasted_net_cash_30d).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '...'}
            description="Projected net balance (AR inbound - AP outbound)"
            trend="neutral"
            trendValue="30d outlook"
          />
          <MetricCard 
            title="Total Accounts Receivable" 
            value={snapshot ? `د.إ ${Number(snapshot.total_ar_outstanding).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '...'}
            description="Currently tracked outstanding client payments"
            trend={snapshot && snapshot.total_ar_outstanding > 0 ? 'up' : 'neutral'}
            trendValue="Active invoices"
          />
          <MetricCard 
            title="Upcoming Accounts Payable" 
            value={snapshot ? `د.إ ${Number(snapshot.total_ap_upcoming_30d).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '...'}
            description="Vendor expenses identified in Gmail/Drive"
            trend={snapshot && snapshot.total_ap_upcoming_30d > 0 ? 'down' : 'neutral'}
            trendValue="Identified liabilities"
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

      </div>
    </div>
  );
}
