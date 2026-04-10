import { fetchZapmailData } from "@/lib/zapmail";
import { Server, Users, DollarSign, AlertTriangle, ArrowRight, ZapOff } from "lucide-react";
import React from 'react';

// Force the page to render dynamically so it fetches the latest data on load
export const dynamic = 'force-dynamic';

export default async function InfrastructurePage() {
  const data = await fetchZapmailData();
  
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Infrastructure Health</h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Monitor mailbox connectivity, customer domains, and Zapmail billing.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground font-medium">Total Accounts Tracked</span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold">{data.totalAccounts}</div>
            <p className="text-xs text-muted-foreground mt-2">Across {data.domains.length} domains via Zapmail</p>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground font-medium">Active MRR</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold">${data.totalMRR.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground mt-2">Estimated Monthly Run Rate tracked</p>
          </div>
        </div>

        <div className={`border p-6 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden ${
          data.totalDisconnected > 0 
           ? "bg-red-500/10 border-red-500/30" 
           : "bg-card border-border"
        }`}>
          {data.totalDisconnected > 0 && (
             <div className="absolute top-0 right-0 w-32 h-32 bg-red-400 opacity-20 blur-3xl animate-pulse"></div>
          )}
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className={data.totalDisconnected > 0 ? "text-red-600 font-medium dark:text-red-400" : "text-muted-foreground font-medium"}>
              Disconnected Accounts
            </span>
            <div className={`p-2 rounded-lg ${
              data.totalDisconnected > 0 ? "bg-red-500 text-white" : "bg-zinc-500/10 text-zinc-500"
            }`}>
              {data.totalDisconnected > 0 ? <AlertTriangle className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </div>
          </div>
          <div className="relative z-10">
            <div className={`text-3xl font-bold ${data.totalDisconnected > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
              {data.totalDisconnected}
            </div>
            {data.totalDisconnected > 0 ? (
               <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-2">Immediate attention required. Go to dashboard to reconnect.</p>
            ) : (
               <p className="text-xs text-emerald-500 mt-2">All mailboxes healthy</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* DOMAIN LIST (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Client Domain Spread</h2>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Domain</th>
                    <th className="px-6 py-4 font-medium">Total</th>
                    <th className="px-6 py-4 font-medium">Active</th>
                    <th className="px-6 py-4 font-medium">Disconnected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.domains.map((dom) => (
                    <tr 
                      key={dom.domain} 
                      className={`hover:bg-secondary/30 transition-colors ${
                        dom.disconnectedAccounts > 0 ? "bg-red-500/5 hover:bg-red-500/10" : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-medium flex items-center">
                        <div className="w-8 h-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mr-3 shrink-0 uppercase text-xs">
                           {dom.domain.charAt(0)}
                        </div>
                        {dom.domain}
                      </td>
                      <td className="px-6 py-4">{dom.totalAccounts}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                          {dom.activeAccounts} max
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {dom.disconnectedAccounts > 0 ? (
                           <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 animate-pulse">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {dom.disconnectedAccounts} alerts
                           </span>
                        ) : (
                           <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.domains.length === 0 && (
                     <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No domain data found.</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Callout if Disconnected Exists */}
          {data.totalDisconnected > 0 && (
             <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-xl">
               <h3 className="text-red-800 dark:text-red-400 font-semibold mb-1">How to reconnect disconnected accounts:</h3>
               <ul className="list-disc ml-5 text-sm space-y-1 text-red-700 dark:text-red-300">
                  <li>Log in to your <strong>Zapmail Dashboard</strong> (<a href="https://app.zapmail.ai" target="_blank" className="underline font-medium">app.zapmail.ai</a>)</li>
                  <li>Go to the <strong>Connected Accounts</strong> page.</li>
                  <li>Click on the <strong>Reconnect</strong> button next to the failing email accounts.</li>
                  <li>Complete the Google/Microsoft OAuth flow or update the app passwords to refresh the token.</li>
               </ul>
             </div>
          )}
        </div>

        {/* BILLING / RENEWALS (1/3 width) */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Upcoming Renewals</h2>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-1">
             <div className="max-h-[600px] overflow-y-auto">
                <ul className="divide-y divide-border">
                  {data.subscriptions.length > 0 ? data.subscriptions.map((sub, i) => (
                    <li key={i} className="px-4 py-4 hover:bg-secondary/30 transition-colors flex justify-between items-center">
                       <div>
                          <p className="font-medium text-sm text-foreground">
                             ${sub.cost.toFixed(2)} {sub.currency}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                             Renews: {sub.nextPayment}
                          </p>
                       </div>
                       <button className="p-2 text-muted-foreground hover:text-foreground transition-colors bg-secondary rounded-lg">
                          <ArrowRight className="w-4 h-4" />
                       </button>
                    </li>
                  )) : (
                     <li className="px-4 py-8 text-center text-muted-foreground text-sm">No active subscriptions found.</li>
                  )}
                </ul>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
