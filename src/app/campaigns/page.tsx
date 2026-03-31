"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Search, Edit2, Loader2, RefreshCw, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";

interface CampaignItem {
  id: string;
  name: string;
  client: string;
  sent: number;
  open: string;
  reply: string;
  isCompliant: boolean;
}

export default function CampaignsPage() {
  const [filter, setFilter] = useState<"all" | "violations">("all");
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
        is_compliant,
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
        isCompliant: c.is_compliant
      }));
      setCampaigns(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const filtered = campaigns.filter(c => filter === "all" ? true : !c.isCompliant);

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Active Campaigns</h2>
          <p className="text-muted-foreground mt-1 text-sm">Monitor campaign velocity and adhere to the Agency OS naming conventions.</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={fetchCampaigns}
            className="px-3 py-2 text-sm font-medium rounded-md transition-colors bg-secondary border border-border text-foreground hover:bg-secondary/70 flex items-center"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-secondary"}`}
          >
            All ({campaigns.length})
          </button>
          <button 
            onClick={() => setFilter("violations")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${filter === "violations" ? "bg-destructive text-destructive-foreground" : "bg-card border border-border text-foreground hover:bg-secondary"}`}
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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 w-[45%]">Campaign Name</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Open Rate</th>
                <th className="px-4 py-3">Reply Rate</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {filtered.map(campaign => (
                <tr key={campaign.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-4">
                    {campaign.isCompliant ? (
                       <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                       <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </td>
                  <td className={`px-4 py-4 font-medium ${!campaign.isCompliant ? 'text-destructive' : 'text-foreground'}`}>
                    {campaign.name}
                    {!campaign.isCompliant && (
                      <p className="text-xs text-muted-foreground font-normal mt-1 border border-destructive/30 bg-destructive/10 inline-block px-2 py-0.5 rounded text-destructive-foreground/80">
                        Standard: [Client] – [Persona] – [Location] – [Offer/Segment] – W[##]
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{campaign.client}</td>
                  <td className="px-4 py-4">{campaign.sent.toLocaleString()}</td>
                  <td className="px-4 py-4">{campaign.open}</td>
                  <td className="px-4 py-4">{campaign.reply}</td>
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
              ))}
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
