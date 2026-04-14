'use client';

import React, { useEffect, useState } from 'react';
import { financeSupabase } from '@/lib/finance_supabase';
import MetricCard from './components/MetricCard';
import AccountsPayableTable from './components/AccountsPayableTable';

export default function FinanceDashboard() {
  const [apTransactions, setApTransactions] = useState<any[]>([]);
  const [arTransactions, setArTransactions] = useState<any[]>([]);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<'closed' | 'forecast' | 'ap_month' | 'ar_month'>('closed');

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

      // Fetch the latest AR Invoices
      const { data: arData, error: arErr } = await financeSupabase
        .from('ar_invoices')
        .select('*')
        .order('due_date', { ascending: true });

      if (arErr && arErr.code !== '42P01') { // 42P01: relation does not exist
        console.error("AR Invoices error:", arErr);
      } else {
        setArTransactions(arData || []);
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
            onClick={() => setDrawerMode('forecast')}
          />
        </section>

        {/* CURRENT MONTH CASHFLOW HUB */}
        <section className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
          {/* Subtle background glow */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div className="p-8">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date().toLocaleString('en-US', { month: 'long' })} {new Date().getFullYear()} Overview
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Side: Peace of Mind Math */}
              <div className="lg:col-span-4 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/10 pb-8 lg:pb-0 lg:pr-8">
                <div className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">Net Cash Required</div>
                {(() => {
                  const storedAR = snapshot?.total_ar_outstanding ? Number(snapshot.total_ar_outstanding) : 0;
                  
                  // Math based only on Current Month Txs
                  const currentMonthTransactions = apTransactions.filter(tx => {
                    const d = new Date(tx.transaction_date);
                    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                  });
                  const monthlyPendingAP = currentMonthTransactions
                    .filter(tx => ['pending', 'failed', 'upcoming'].includes(tx.status))
                    .reduce((sum, tx) => sum + Number(tx.amount), 0);

                  const netRequired = monthlyPendingAP; // Strictly what must be paid this month
                  const surplus = storedAR - netRequired;

                  return (
                    <>
                      <div className="text-4xl font-extrabold text-white mb-2">
                        USD {netRequired.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </div>
                      {surplus >= 0 ? (
                        <div className="text-sm text-green-400 flex items-center gap-1 font-medium bg-green-400/10 w-fit px-2.5 py-1 rounded-full cursor-help" title="Expected AR covers all pending AP">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          AR Surplus: USD {surplus.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </div>
                      ) : (
                        <div className="text-sm text-red-400 flex items-center gap-1 font-medium bg-red-400/10 w-fit px-2.5 py-1 rounded-full">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          AR Deficit: USD {Math.abs(surplus).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Right Side: Progress Bars */}
              <div className="lg:col-span-8 space-y-6">
                {(() => {
                  const storedAR = snapshot?.total_ar_outstanding ? Number(snapshot.total_ar_outstanding) : 0;
                  
                  // Math based only on Current Month Txs
                  const currentMonthTransactions = apTransactions.filter(tx => {
                    const d = new Date(tx.transaction_date);
                    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                  });
                  
                  const monthlyPaidAP = currentMonthTransactions
                    .filter(tx => tx.status === 'paid')
                    .reduce((sum, tx) => sum + Number(tx.amount), 0);
                  const monthlyPendingAP = currentMonthTransactions
                    .filter(tx => ['pending', 'failed', 'upcoming'].includes(tx.status))
                    .reduce((sum, tx) => sum + Number(tx.amount), 0);
                  const totalMonthlyAP = monthlyPaidAP + monthlyPendingAP;
                  const apProgressPct = totalMonthlyAP > 0 ? (monthlyPaidAP / totalMonthlyAP) * 100 : 0;

                  return (
                    <>
                      {/* AP Progress Bar */}
                      <div 
                        className="cursor-pointer group hover:bg-white/5 p-3 -mx-3 rounded-xl transition-colors"
                        onClick={() => setDrawerMode('ap_month')}
                      >
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <div className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">Accounts Payable</div>
                            <div className="text-xs text-gray-500">Obligations for this month</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-white">USD {totalMonthlyAP.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                            <div className="text-xs text-red-400 font-medium tracking-wide">Falta Pagar: {monthlyPendingAP.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-700 ease-out"
                            style={{ width: `${Math.min(100, Math.max(0, apProgressPct))}%` }}
                            title={`Paid: USD ${monthlyPaidAP}`}
                          />
                          <div 
                            className="h-full bg-rose-500/80 transition-all duration-700 ease-out"
                            style={{ width: `${100 - apProgressPct}%` }}
                            title={`Pending: USD ${monthlyPendingAP}`}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5 text-[10px] uppercase font-bold text-gray-500">
                          <span className="text-emerald-500">Ya Pagado ({(apProgressPct).toFixed(0)}%)</span>
                          <span>Ver Transacciones ➝</span>
                        </div>
                      </div>

                      {/* AR Progress Bar */}
                      <div 
                        className="cursor-pointer group hover:bg-white/5 p-3 -mx-3 rounded-xl transition-colors"
                        onClick={() => setDrawerMode('ar_month')}
                      >
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <div className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">Accounts Receivable</div>
                            <div className="text-xs text-gray-500">Expected income</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-white">USD {storedAR.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                            <div className="text-xs text-yellow-400 font-medium tracking-wide">Pendiente Cobro: {storedAR.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden flex">
                          {/* Stripe integration placeholder - currently 0% green, 100% yellow */}
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-700 ease-out"
                            style={{ width: '0%' }} 
                          />
                          <div 
                            className="h-full bg-amber-400/80 transition-all duration-700 ease-out"
                            style={{ width: '100%' }}
                            title={`Pending AR: USD ${storedAR}`}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5 text-[10px] uppercase font-bold text-gray-500">
                          <span className="text-emerald-500">Cobrado (0%)</span>
                          <span>Ver Transacciones ➝</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

            </div>
          </div>
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

        {/* Interactive Modal / Drawer */}
        {drawerMode !== 'closed' && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all" onClick={() => setDrawerMode('closed')}>
            <div 
              className="w-full max-w-2xl bg-neutral-900 border-l border-white/10 h-full p-8 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300"
              onClick={e => e.stopPropagation()} // Prevent close when clicking inside drawer
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {drawerMode === 'forecast' && 'Financial Forecast'}
                    {drawerMode === 'ap_month' && 'Accounts Payable Details'}
                    {drawerMode === 'ar_month' && 'Accounts Receivable Details'}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {drawerMode === 'forecast' && 'Expected inflows and outflows over the next 30 days.'}
                    {drawerMode === 'ap_month' && `All vendor expenses recorded for ${new Date().toLocaleString('en-US', {month: 'long'})}.`}
                    {drawerMode === 'ar_month' && `All expected client invoices for ${new Date().toLocaleString('en-US', {month: 'long'})}.`}
                  </p>
                </div>
                <button onClick={() => setDrawerMode('closed')} className="text-gray-400 hover:text-white p-2">✕</button>
              </div>

              {/* FORECAST MODE */}
              {drawerMode === 'forecast' && (
                <>
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

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-green-400 uppercase tracking-wider mb-3">Expected Inflows (AR)</h3>
                      <div className="bg-white/5 border border-green-500/10 rounded-lg p-4 w-full text-sm flex justify-between">
                         <span className="text-white">Active Agency Subscriptions</span>
                         <span className="text-gray-400">ד.إ {snapshot?.total_ar_outstanding}</span>
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
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* AP MONTH MODE */}
              {drawerMode === 'ap_month' && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-1 w-full text-sm">
                  {apTransactions
                    .filter(tx => {
                      const d = new Date(tx.transaction_date);
                      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                    })
                    .map((tx, idx) => (
                    <div key={idx} className="flex justify-between items-center py-4 px-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors">
                      <div className="flex flex-col space-y-1">
                        <span className="text-white font-semibold text-base">{tx.vendor_name}</span>
                        <span className="text-gray-400 text-xs line-clamp-1 max-w-[300px]">{tx.email_subject || tx.description || 'No description available'}</span>
                        <span className="text-gray-500 text-xs">Date: {new Date(tx.transaction_date).toLocaleDateString()}</span>
                      </div>
                      <div className="text-right flex flex-col items-end justify-center space-y-1">
                        <span className="text-white font-bold block">USD {Number(tx.amount).toFixed(2)}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          tx.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 
                          tx.status === 'failed' ? 'bg-red-500/20 text-red-400' : 
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* AR MONTH MODE */}
              {drawerMode === 'ar_month' && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-1 w-full text-sm">
                  {arTransactions.length > 0 ? (
                    arTransactions.map((inv, idx) => (
                      <div key={idx} className="flex justify-between items-center py-4 px-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors">
                        <div className="flex flex-col space-y-1">
                          <span className="text-white font-semibold text-base">{inv.client_name}</span>
                          <span className="text-gray-400 text-xs">{inv.description || 'Monthly Retainer'}</span>
                          <span className="text-gray-500 text-xs">Due: {new Date(inv.due_date).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right flex flex-col items-end justify-center space-y-1">
                          <span className="text-white font-bold block">USD {Number(inv.amount).toFixed(2)}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 
                            inv.status === 'overdue' ? 'bg-red-500/20 text-red-400' : 
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <p className="mb-2">No invoices found for this month in the database.</p>
                      <p className="text-xs">Database table `ar_invoices` must be populated manualy until Stripe integration is active.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
