"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Search, Edit2, Loader2, RefreshCw, X, HelpCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";

interface CampaignItem {
  id: string;
  name: string;
  client: string;
  sent: number;
  open: string;
  reply: string;
  opportunities: number;
  replies: number;
  copyErrors: string[];
  isCompliant: boolean;
  status: string;
}

export default function CampaignsPage() {
  const [filter, setFilter] = useState<"all" | "violations" | "active" | "paused" | "completed">("active");
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<string | null>(null);

  const handleOptimize = async (campaign: CampaignItem) => {
    setOptimizingId(campaign.id);
    setOptimizationResult(null);
    setIsModalOpen(true);
    try {
      const res = await fetch("https://agency-os-api.onrender.com/api/copilot/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: campaign.client.trim(),
          campaign_name: campaign.name.trim(),
          campaign_id: campaign.id
        })
      });
      const data = await res.json();
      if (data.markdown) {
        setOptimizationResult(data.markdown);
      } else {
        setOptimizationResult(`❌ Error analyzing campaign: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      setOptimizationResult(`❌ Failed to connect to Copilot Backend: ${err.message}`);
    } finally {
      setOptimizingId(null);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select(`
        id,
        campaign_name,
        emails_sent,
        open_rate,
        reply_rate,
        opportunities,
        replies,
        copy_errors,
        is_compliant,
        status,
        clients(name)
      `)
      .order('is_compliant', { ascending: true }) // Show violations first
      .order('last_updated', { ascending: false });
      
    if (error) {
      console.error("Error fetching campaigns:", error);
    } else if (data) {
      const mapped = data.map((c: any) => ({
        id: c.id,
        name: c.campaign_name,
        client: c.clients?.name || "Unknown",
        sent: c.emails_sent,
        open: c.open_rate,
        reply: c.reply_rate,
        opportunities: c.opportunities || 0,
        replies: c.replies || 0,
        copyErrors: Array.isArray(c.copy_errors) ? c.copy_errors : [],
        isCompliant: c.is_compliant,
        status: c.status || 'Active'
      }));
      setCampaigns(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const filtered = campaigns.filter(c => {
    if (filter === "all") return true;
    if (filter === "violations") return !c.isCompliant;
    if (filter === "active") return c.status.toLowerCase() === "active";
    if (filter === "paused") return c.status.toLowerCase() === "paused";
    if (filter === "completed") return c.status.toLowerCase() === "completed";
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaign Monitor</h2>
          <p className="text-muted-foreground mt-1 text-sm">Monitor campaign velocity, reply performance, and adhere to the Agency OS naming conventions.</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={fetchCampaigns}
            className="px-3 py-2 text-sm font-medium rounded-md transition-colors bg-secondary border border-border text-foreground hover:bg-secondary/70 flex items-center"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="flex bg-card border border-border rounded-md p-1">
            <button 
              onClick={() => setFilter("active")}
              className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${filter === "active" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              Active
            </button>
            <button 
              onClick={() => setFilter("paused")}
              className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${filter === "paused" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              Paused
            </button>
            <button 
              onClick={() => setFilter("all")}
              className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${filter === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              All
            </button>
          </div>

          <button 
            onClick={() => setFilter("violations")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${filter === "violations" ? "bg-destructive text-destructive-foreground shadow-sm" : "bg-card border border-border text-foreground hover:bg-secondary"}`}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Violations ({campaigns.filter(c => !c.isCompliant).length})
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Filter campaigns..." 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="rounded-md border border-border shrink-0 overflow-hidden relative min-h-[400px]">
        {loading && campaigns.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
              <tr>
                <th className="px-4 py-3 w-[45%]">Campaign Info</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Outreach</th>
                <th className="px-4 py-3">Engagement</th>
                <th className="px-4 py-3">
                  <div className="flex items-center space-x-1">
                    <span>Tier</span>
                    <div className="group relative ml-1 flex items-center">
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help hover:text-muted-foreground transition-colors" />
                      <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 w-64 p-3 bg-zinc-950 text-xs text-zinc-300 rounded shadow-xl border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        <p className="font-semibold text-zinc-100 mb-1 border-b border-zinc-800 pb-1">Performance Legend</p>
                        <ul className="space-y-1 mt-2">
                          <li><span className="text-emerald-500 font-medium">Excellent 🤩</span>: 1 opp per &lt; 300 sent</li>
                          <li><span className="text-blue-500 font-medium">Good 🙂</span>: 1 opp per 300 - 600 sent</li>
                          <li><span className="text-amber-500 font-medium">Average 😐</span>: 1 opp per 600 - 1000 sent</li>
                          <li><span className="text-destructive font-medium">Below Avg 📉</span>: 1 opp per &gt; 1000 sent</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {filtered.map(campaign => {
                const replyRateFloat = parseFloat(campaign.reply);
                const isReplyLow = !isNaN(replyRateFloat) && replyRateFloat < 0.5 && campaign.sent > 100;
                
                // Tier Logic
                let tier = { label: "Evaluating", colBg: "bg-secondary", textCol: "text-muted-foreground", emoji: "⏳" };
                if (campaign.opportunities > 0) {
                  const sentPerOpp = campaign.sent / campaign.opportunities;
                  if (sentPerOpp <= 300) tier = { label: "Excellent", colBg: "bg-emerald-500/10", textCol: "text-emerald-500", emoji: "🤩" };
                  else if (sentPerOpp <= 600) tier = { label: "Good", colBg: "bg-blue-500/10", textCol: "text-blue-500", emoji: "🙂" };
                  else if (sentPerOpp <= 1000) tier = { label: "Average", colBg: "bg-amber-500/10", textCol: "text-amber-500", emoji: "😐" };
                  else tier = { label: "Below Average", colBg: "bg-destructive/10", textCol: "text-destructive", emoji: "📉" };
                } else if (campaign.sent > 600) {
                  tier = { label: "Below Average", colBg: "bg-destructive/10", textCol: "text-destructive", emoji: "📉" };
                }
                
                // Positivity Logic (Opportunities / Total Replied)
                // Use explicit replies from the DB if available, else approximate
                const repliedCountApprox = campaign.replies > 0 ? campaign.replies : Math.floor(campaign.sent * (replyRateFloat / 100));
                let posRate = 0;
                if (repliedCountApprox > 0) posRate = (campaign.opportunities / repliedCountApprox) * 100;
                
                return (
                  <tr key={campaign.id} className="hover:bg-secondary/30 transition-colors">
                    {/* Column 1: Campaign Info */}
                    <td className={`px-4 py-4 font-medium ${!campaign.isCompliant ? 'text-destructive' : 'text-foreground'}`}>
                      <div className="flex items-center space-x-2">
                        <span>{campaign.name}</span>
                        {!campaign.isCompliant && (
                           <div title="Naming Error: Standard is [Client] – [Persona] – [Location] – [Offer/Segment] – W[##]" className="bg-destructive/10 text-destructive text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded cursor-help flex items-center shrink-0 border border-destructive/20">
                             <AlertCircle className="w-3 h-3 mr-1" />
                             Unnamed
                           </div>
                        )}
                        {campaign.copyErrors.length > 0 && (
                          <div 
                            title={campaign.copyErrors.join('\n')}
                            className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-1 rounded-full cursor-help hover:bg-amber-500/20 transition-colors shrink-0"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        )}
                        {campaign.status !== 'Active' && (
                          <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 border border-border">{campaign.status}</span>
                        )}
                      </div>
                    </td>
                    
                    {/* Column 2: Client */}
                    <td className="px-4 py-4 text-muted-foreground">{campaign.client}</td>
                    
                    {/* Column 3: Outreach (Sent & Open) */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                         <span className="text-base font-semibold">{campaign.sent.toLocaleString()}</span>
                         <span className="text-[11px] text-muted-foreground font-medium mt-0.5" title="Open Rate">{campaign.open} Open</span>
                      </div>
                    </td>
                    
                    {/* Column 4: Engagement (Replies & Opps) */}
                    <td className={`px-4 py-4 ${isReplyLow ? 'text-destructive font-semibold' : ''}`}>
                      <div className="flex space-x-6 items-center">
                         {/* Replies Block */}
                         <div className="flex flex-col items-center justify-center">
                           <span className="text-base font-bold flex items-center" title="Total Replies">
                             <span className="text-xs mr-1.5 opacity-70">💬</span> {campaign.replies}
                           </span>
                           <div className="flex items-center space-x-1 mt-0.5">
                             <span className="text-[10px] text-muted-foreground tracking-wide font-medium bg-secondary/50 px-1 rounded">
                               {campaign.reply} Rate
                             </span>
                             {isReplyLow && (
                               <div title="Reply rate critically low (<0.5%)">
                                 <AlertCircle className="w-3 h-3 text-destructive" />
                               </div>
                             )}
                           </div>
                         </div>
                         
                         {/* Opps Block */}
                         <div className={`flex flex-col items-center justify-center ${campaign.opportunities > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                           <span className="text-base font-bold flex items-center" title="Opportunities">
                             <span className="text-xs mr-1 opacity-70">💼</span> {campaign.opportunities}
                           </span>
                           <span className={`text-[10px] tracking-wide font-medium mt-0.5 px-1 rounded ${campaign.opportunities > 0 ? 'bg-amber-500/10' : 'bg-secondary/50'}`}>
                             {campaign.opportunities > 0 ? `${posRate.toFixed(1)}% Positivity` : '0%'}
                           </span>
                         </div>
                      </div>
                    </td>
                    
                    {/* Column 5: Tier Classification */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${tier.colBg.replace('/10', '/20')} ${tier.colBg} ${tier.textCol}`}>
                        <span>{tier.label}</span> <span>{tier.emoji}</span>
                      </span>
                      {campaign.opportunities > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">✨ 1 opp / {Math.round(campaign.sent / campaign.opportunities)} sent</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleOptimize(campaign)}
                      className="inline-flex items-center text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-md hover:bg-amber-500/20 transition-colors font-medium cursor-pointer"
                    >
                      ✨ Optimize
                    </button>
                    {!campaign.isCompliant ? (
                      <button className="inline-flex items-center text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors font-medium">
                        <Edit2 className="w-3 h-3 mr-1.5" />
                        Fix Naming
                      </button>
                    ) : (
                      <button className="text-xs text-muted-foreground hover:text-foreground px-2">View Base</button>
                    )}
                  </td>
                </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    No campaigns found matching this criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* AI Copilot Verification/Render Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl max-h-[85vh] rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30 min-h-[64px]">
              <h3 className="font-semibold text-lg flex items-center text-foreground">
                ✨ AI Copywriting Copilot 
                {optimizingId && <span className="ml-3 text-xs bg-primary/20 text-primary px-2 py-1 rounded shadow-inner animate-pulse">Running Analysis...</span>}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-secondary border border-transparent hover:border-border">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 prose prose-invert max-w-none prose-sm">
              {optimizingId ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 text-muted-foreground">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="animate-pulse font-medium">Cross-referencing Intelligence Briefs & Lead Replies...</p>
                </div>
              ) : optimizationResult ? (
                <ReactMarkdown>{optimizationResult}</ReactMarkdown>
              ) : null}
            </div>
            
            <div className="px-6 py-4 border-t border-border bg-secondary/30 flex justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 outline-none focus:ring-2 focus:ring-primary border border-border transition-all text-sm font-medium"
              >
                Close Copilot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
