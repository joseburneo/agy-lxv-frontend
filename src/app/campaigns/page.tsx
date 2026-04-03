"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AlertCircle, CheckCircle2, Search, Edit2, Loader2, RefreshCw, X, HelpCircle, Check, Sparkles, ChevronUp, ChevronDown, Mail, MessageSquare, Zap, ExternalLink, ArrowUpDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";

const API_BASE = "https://agency-os-api.onrender.com";

// ---- Tier Helpers ----
const TIER_ORDER: Record<string, number> = {
  "Critical": 0,
  "Below Avg": 1,
  "Average": 2,
  "Good": 3,
  "Excellent": 4,
  "Evaluating": 5,
};

function computeTier(sent: number, opportunities: number) {
  if (opportunities > 0) {
    const sentPerOpp = sent / opportunities;
    if (sentPerOpp <= 300) return { label: "Excellent", colBg: "bg-emerald-500/10", textCol: "text-emerald-500", emoji: "🤩", order: 4 };
    if (sentPerOpp <= 600) return { label: "Good", colBg: "bg-blue-500/10", textCol: "text-blue-500", emoji: "🙂", order: 3 };
    if (sentPerOpp <= 900) return { label: "Average", colBg: "bg-amber-500/10", textCol: "text-amber-500", emoji: "😐", order: 2 };
    if (sentPerOpp <= 1200) return { label: "Below Avg", colBg: "bg-orange-500/10", textCol: "text-orange-500", emoji: "📉", order: 1 };
    return { label: "Critical", colBg: "bg-red-500/10", textCol: "text-red-500", emoji: "🚨", order: 0 };
  }
  if (sent > 600) return { label: "Critical", colBg: "bg-red-500/10", textCol: "text-red-500", emoji: "🚨", order: 0 };
  return { label: "Evaluating", colBg: "bg-secondary", textCol: "text-muted-foreground", emoji: "⏳", order: 5 };
}

// ---- Smart Name Parser ----
function parseCurrentName(name: string, clientName: string) {
  let rest = name;
  if (rest.toLowerCase().startsWith(clientName.toLowerCase())) {
    rest = rest.slice(clientName.length).replace(/^\s*[–\-]\s*/, "");
  }
  const parts = rest.split(/\s*[–\-]\s*/).map(s => s.trim()).filter(Boolean);
  let week = "";
  const weekIdx = parts.findIndex(p => /^W\d+$/i.test(p.trim()));
  if (weekIdx !== -1) week = parts.splice(weekIdx, 1)[0].trim();
  const locationTokens = [
    "uk", "usa", "uae", "europe", "germany", "kenya", "belgium", "france",
    "spain", "italy", "netherlands", "canada", "australia", "india", "singapore",
    "saudi arabia", "ksa", "qatar", "oman", "bahrain", "kuwait", "jordan",
    "south africa", "nigeria", "egypt", "mexico", "brazil", "mena", "gcc",
    "apac", "latam", "emea", "nordics", "dach"
  ];
  let persona = "", location = "", offer = "";
  const locIdx = parts.findIndex(p => locationTokens.includes(p.toLowerCase()));
  if (locIdx !== -1) location = parts.splice(locIdx, 1)[0];
  if (parts.length >= 2) { persona = parts[0]; offer = parts.slice(1).join(" – "); }
  else if (parts.length === 1) { offer = parts[0]; }
  return { persona, location, offer, week };
}

function buildPreviewName(client: string, persona: string, location: string, offer: string, week: string) {
  return [client, persona, location, offer, week].filter(Boolean).join(" – ");
}

// ---- Reply Category Badge ----
function ReplyCategoryBadge({ category }: { category: string }) {
  const cat = category.toLowerCase();
  let color = "bg-secondary text-muted-foreground border-border";
  if (cat.includes("positive") || cat.includes("sql")) color = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  else if (cat.includes("mql")) color = "bg-amber-500/10 text-amber-500 border-amber-500/20";
  else if (cat.includes("negative") || cat.includes("not interested")) color = "bg-red-500/10 text-red-500 border-red-500/20";
  else if (cat.includes("out of office") || cat.includes("ooo")) color = "bg-gray-500/10 text-gray-400 border-gray-500/20";
  else if (cat.includes("bounce")) color = "bg-orange-500/10 text-orange-500 border-orange-500/20";
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color} uppercase tracking-wider`}>{category}</span>;
}

// ---- Types ----
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

interface ReplyItem {
  category: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  company_name: string;
  outreach_email: string;
  lead_reply: string;
  reply_date: string;
  campaign_name: string;
}

interface SequenceStep {
  step: number;
  delay: number;
  variants: { subject: string; body: string }[];
}

interface CampaignDetail {
  sequences: SequenceStep[];
  replies: ReplyItem[];
  reply_summary: { total: number; positive: number; mql: number; negative: number; ooo: number; bounced: number; other: number };
}

type SortKey = "tier" | "sent" | "reply" | "name";
type SortDir = "asc" | "desc";

export default function CampaignsPage() {
  const [filter, setFilter] = useState<"all" | "violations" | "active" | "paused" | "completed">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("tier");
  const [sortDir, setSortDir] = useState<SortDir>("asc"); // asc = worst first for tier

  // Copilot Modal (standalone)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<string | null>(null);

  // Fix Naming Modal
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [namingCampaign, setNamingCampaign] = useState<CampaignItem | null>(null);
  const [namingFields, setNamingFields] = useState({ persona: "", location: "", offer: "", week: "" });
  const [namingLoading, setNamingLoading] = useState(false);
  const [namingResult, setNamingResult] = useState<{ success: boolean; message: string } | null>(null);

  // Campaign Detail Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCampaign, setDrawerCampaign] = useState<CampaignItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<"copy" | "replies" | "optimize">("copy");
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerData, setDrawerData] = useState<CampaignDetail | null>(null);
  const [drawerOptResult, setDrawerOptResult] = useState<string | null>(null);
  const [drawerOptLoading, setDrawerOptLoading] = useState(false);

  const namingPreview = useMemo(() => {
    if (!namingCampaign) return "";
    return buildPreviewName(namingCampaign.client, namingFields.persona, namingFields.location, namingFields.offer, namingFields.week);
  }, [namingCampaign, namingFields]);

  // ---- Handlers ----
  const openNamingModal = (campaign: CampaignItem) => {
    const parsed = parseCurrentName(campaign.name, campaign.client);
    setNamingFields(parsed);
    setNamingCampaign(campaign);
    setNamingResult(null);
    setIsNamingModalOpen(true);
  };

  const handleFixNaming = async () => {
    if (!namingCampaign || !namingPreview) return;
    setNamingLoading(true);
    setNamingResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/campaigns/fix-naming`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: namingCampaign.id, new_name: namingPreview, client_name: namingCampaign.client }),
      });
      const data = await res.json();
      if (data.success) {
        setNamingResult({ success: true, message: "✅ Campaign renamed across Instantly, Supabase & Notion!" });
        setTimeout(() => { setIsNamingModalOpen(false); fetchCampaigns(); }, 1500);
      } else {
        const errors = [!data.instantly?.success && `Instantly: ${data.instantly?.error}`, !data.supabase?.success && `Supabase: ${data.supabase?.error}`, !data.notion?.success && `Notion: ${data.notion?.error}`].filter(Boolean).join(" | ");
        setNamingResult({ success: false, message: `⚠️ Partial failure: ${errors}` });
      }
    } catch (err: any) {
      setNamingResult({ success: false, message: `❌ Network error: ${err.message}` });
    } finally {
      setNamingLoading(false);
    }
  };

  const openDrawer = async (campaign: CampaignItem) => {
    setDrawerCampaign(campaign);
    setDrawerTab("copy");
    setDrawerData(null);
    setDrawerOptResult(null);
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/campaigns/detail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaign.id, client_name: campaign.client, campaign_name: campaign.name }),
      });
      const data = await res.json();
      setDrawerData(data);
    } catch (err) {
      console.error("Failed to load campaign detail", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDrawerOptimize = async () => {
    if (!drawerCampaign) return;
    setDrawerOptLoading(true);
    setDrawerOptResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/copilot/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: drawerCampaign.client.trim(), campaign_name: drawerCampaign.name.trim(), campaign_id: drawerCampaign.id }),
      });
      const data = await res.json();
      setDrawerOptResult(data.markdown || `❌ Error: ${JSON.stringify(data)}`);
    } catch (err: any) {
      setDrawerOptResult(`❌ Failed: ${err.message}`);
    } finally {
      setDrawerOptLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select(`id, campaign_name, emails_sent, open_rate, reply_rate, opportunities, replies, copy_errors, is_compliant, status, clients(name)`)
      .order('last_updated', { ascending: false });
    if (error) { console.error("Error fetching campaigns:", error); }
    else if (data) {
      const mapped = data.map((c: any) => ({
        id: c.id, name: c.campaign_name, client: c.clients?.name || "Unknown",
        sent: c.emails_sent, open: c.open_rate, reply: c.reply_rate,
        opportunities: c.opportunities || 0, replies: c.replies || 0,
        copyErrors: Array.isArray(c.copy_errors) ? c.copy_errors : [],
        isCompliant: c.is_compliant, status: c.status || 'Active'
      }));
      setCampaigns(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  // ---- Sorting & Filtering ----
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "tier" ? "asc" : "desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />;
  };

  const filtered = useMemo(() => {
    let list = campaigns.filter(c => {
      if (filter === "all") return true;
      if (filter === "violations") return !c.isCompliant;
      if (filter === "active") return c.status.toLowerCase() === "active";
      if (filter === "paused") return c.status.toLowerCase() === "paused";
      if (filter === "completed") return c.status.toLowerCase() === "completed";
      return true;
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.client.toLowerCase().includes(q));
    }
    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "tier") {
        const ta = computeTier(a.sent, a.opportunities).order;
        const tb = computeTier(b.sent, b.opportunities).order;
        cmp = ta - tb;
      } else if (sortKey === "sent") {
        cmp = a.sent - b.sent;
      } else if (sortKey === "reply") {
        cmp = parseFloat(a.reply) - parseFloat(b.reply);
      } else if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [campaigns, filter, searchQuery, sortKey, sortDir]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaign Monitor</h2>
          <div className="flex items-center space-x-4 mt-2">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Tier Legend</span>
            <div className="flex items-center space-x-3 text-[11px] font-medium">
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span><span className="text-emerald-500">Excellent</span><span className="text-muted-foreground">1–300</span></span>
              <span className="text-border">|</span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span><span className="text-blue-500">Good</span><span className="text-muted-foreground">301–600</span></span>
              <span className="text-border">|</span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span><span className="text-amber-500">Average</span><span className="text-muted-foreground">601–900</span></span>
              <span className="text-border">|</span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span><span className="text-orange-500">Below Avg</span><span className="text-muted-foreground">901–1200</span></span>
              <span className="text-border">|</span>
              <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span><span className="text-red-500">Critical</span><span className="text-muted-foreground">1200+</span></span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button onClick={fetchCampaigns} className="px-3 py-2 text-sm font-medium rounded-md transition-colors bg-secondary border border-border text-foreground hover:bg-secondary/70 flex items-center" title="Refresh Data">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex bg-card border border-border rounded-md p-1">
            {(["active", "paused", "all"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors capitalize ${filter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => setFilter("violations")} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${filter === "violations" ? "bg-destructive text-destructive-foreground shadow-sm" : "bg-card border border-border text-foreground hover:bg-secondary"}`}>
            <AlertCircle className="w-4 h-4 mr-2" />
            Violations ({campaigns.filter(c => !c.isCompliant).length})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter campaigns by name or client..."
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border border-border shrink-0 overflow-hidden relative min-h-[400px]">
        {loading && campaigns.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
              <tr>
                <th className="px-4 py-3 w-[45%] cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("name")}>
                  <span className="inline-flex items-center">Campaign Info <SortIcon col="name" /></span>
                </th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("sent")}>
                  <span className="inline-flex items-center">Outreach <SortIcon col="sent" /></span>
                </th>
                <th className="px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("reply")}>
                  <span className="inline-flex items-center">Engagement <SortIcon col="reply" /></span>
                </th>
                <th className="px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("tier")}>
                  <span className="inline-flex items-center">Tier <SortIcon col="tier" /></span>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {filtered.map(campaign => {
                const replyRateFloat = parseFloat(campaign.reply);
                const isReplyLow = !isNaN(replyRateFloat) && replyRateFloat < 0.5 && campaign.sent > 100;
                const tier = computeTier(campaign.sent, campaign.opportunities);
                const repliedCountApprox = campaign.replies > 0 ? campaign.replies : Math.floor(campaign.sent * (replyRateFloat / 100));
                let posRate = 0;
                if (repliedCountApprox > 0) posRate = (campaign.opportunities / repliedCountApprox) * 100;

                return (
                  <tr key={campaign.id} className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => openDrawer(campaign)}>
                    <td className={`px-4 py-4 font-medium ${!campaign.isCompliant ? 'text-destructive' : 'text-foreground'}`}>
                      <div className="flex items-center space-x-2">
                        <span>{campaign.name}</span>
                        {!campaign.isCompliant && <span title="Non-standard naming" className="text-destructive/70 cursor-help shrink-0">⚠️</span>}
                        {campaign.copyErrors.length > 0 && (
                          <div title={campaign.copyErrors.join('\n')} className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-1 rounded-full cursor-help hover:bg-amber-500/20 transition-colors shrink-0">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        )}
                        {campaign.status !== 'Active' && (
                          <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 border border-border">{campaign.status}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{campaign.client}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-base font-semibold">{campaign.sent.toLocaleString()}</span>
                        <span className="text-[11px] text-muted-foreground font-medium mt-0.5">{campaign.open} Open</span>
                      </div>
                    </td>
                    <td className={`px-4 py-4 ${isReplyLow ? 'text-destructive font-semibold' : ''}`}>
                      <div className="flex space-x-6 items-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-base font-bold flex items-center" title="Total Replies">
                            <span className="text-xs mr-1.5 opacity-70">💬</span> {campaign.replies}
                          </span>
                          <div className="flex items-center space-x-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground tracking-wide font-medium bg-secondary/50 px-1 rounded">{campaign.reply} Rate</span>
                            {isReplyLow && <div title="Reply rate critically low (<0.5%)"><AlertCircle className="w-3 h-3 text-destructive" /></div>}
                          </div>
                        </div>
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
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border ${tier.colBg.replace('/10', '/20')} ${tier.colBg} ${tier.textCol}`}>
                        <span>{tier.label}</span> <span>{tier.emoji}</span>
                      </span>
                      {campaign.opportunities > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">✨ 1 opp / {Math.round(campaign.sent / campaign.opportunities)} sent</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right space-x-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { openDrawer(campaign); setTimeout(() => setDrawerTab("optimize"), 100); }}
                        className="inline-flex items-center text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-md hover:bg-amber-500/20 transition-colors font-medium cursor-pointer"
                      >
                        ✨ Optimize
                      </button>
                      {!campaign.isCompliant ? (
                        <button
                          onClick={() => openNamingModal(campaign)}
                          className="inline-flex items-center text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors font-medium cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 mr-1.5" />
                          Fix Naming
                        </button>
                      ) : (
                        <button onClick={() => openDrawer(campaign)} className="text-xs text-muted-foreground hover:text-foreground px-2">View Detail</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">No campaigns found matching this criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ==================== CAMPAIGN DETAIL DRAWER ==================== */}
      {drawerOpen && drawerCampaign && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />

          {/* Drawer */}
          <div className="fixed top-0 right-0 z-50 h-full w-full max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-start justify-between shrink-0">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{drawerCampaign.client}</p>
                <h3 className="font-semibold text-base text-foreground truncate">{drawerCampaign.name}</h3>
                <div className="flex items-center space-x-3 mt-2">
                  <span className="text-xs text-muted-foreground">{drawerCampaign.sent.toLocaleString()} sent</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{drawerCampaign.reply} reply rate</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-amber-500 font-medium">{drawerCampaign.opportunities} opps</span>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-secondary shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              {([
                { key: "copy" as const, icon: <Mail className="w-4 h-4 mr-1.5" />, label: "Current Copy" },
                { key: "replies" as const, icon: <MessageSquare className="w-4 h-4 mr-1.5" />, label: `Replies${drawerData?.reply_summary?.total ? ` (${drawerData.reply_summary.total})` : ''}` },
                { key: "optimize" as const, icon: <Zap className="w-4 h-4 mr-1.5" />, label: "Optimize" },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setDrawerTab(tab.key)}
                  className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors ${
                    drawerTab === tab.key
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {drawerLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 text-muted-foreground">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="animate-pulse font-medium">Loading campaign intelligence...</p>
                </div>
              ) : (
                <>
                  {/* ---- TAB: Current Copy ---- */}
                  {drawerTab === "copy" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-primary" />
                          Live Email Sequence
                        </h4>
                        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">from Instantly</span>
                      </div>
                      {!drawerData?.sequences?.length ? (
                        <div className="text-center py-16 text-muted-foreground">
                          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No sequence data available</p>
                          <p className="text-xs mt-1">This campaign might not have an active sequence.</p>
                        </div>
                      ) : (
                        drawerData.sequences.map((step, i) => (
                          <div key={i} className="border border-border rounded-lg overflow-hidden">
                            <div className="px-4 py-2 bg-secondary/50 border-b border-border flex items-center justify-between">
                              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                Step {i + 1} {step.delay > 0 && <span className="text-muted-foreground font-normal ml-1">(Day {step.delay})</span>}
                              </span>
                              {step.variants.length > 1 && (
                                <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">{step.variants.length} variants</span>
                              )}
                            </div>
                            {step.variants.map((variant, vi) => (
                              <div key={vi} className={`px-4 py-3 ${vi > 0 ? 'border-t border-border/50' : ''}`}>
                                {step.variants.length > 1 && (
                                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Variant {String.fromCharCode(65 + vi)}</p>
                                )}
                                {variant.subject && (
                                  <p className="text-xs mb-2">
                                    <span className="text-muted-foreground font-semibold mr-1">Subject:</span>
                                    <span className="text-foreground font-medium">{variant.subject}</span>
                                  </p>
                                )}
                                <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono text-xs bg-secondary/30 rounded-md p-3 border border-border/50">
                                  {variant.body}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ---- TAB: Replies ---- */}
                  {drawerTab === "replies" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center">
                          <MessageSquare className="w-4 h-4 mr-2 text-primary" />
                          Lead Replies
                        </h4>
                        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">from Supabase</span>
                      </div>

                      {/* Summary Bar */}
                      {drawerData?.reply_summary && drawerData.reply_summary.total > 0 && (
                        <div className="flex items-center space-x-3 bg-secondary/30 rounded-lg px-4 py-2.5 border border-border">
                          <span className="text-xs font-semibold text-foreground">{drawerData.reply_summary.total} replies</span>
                          <span className="text-border">|</span>
                          <span className="text-xs text-emerald-500">🟢 {drawerData.reply_summary.positive} Positive</span>
                          <span className="text-xs text-amber-500">🟡 {drawerData.reply_summary.mql} MQL</span>
                          <span className="text-xs text-red-500">🔴 {drawerData.reply_summary.negative} Negative</span>
                          <span className="text-xs text-gray-400">⚪ {drawerData.reply_summary.ooo} OOO</span>
                        </div>
                      )}

                      {!drawerData?.replies?.length ? (
                        <div className="text-center py-16 text-muted-foreground">
                          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No replies found</p>
                          <p className="text-xs mt-1">No lead replies matched this campaign.</p>
                        </div>
                      ) : (
                        drawerData.replies.map((reply, i) => (
                          <div key={i} className="border border-border rounded-lg overflow-hidden">
                            {/* Reply Header */}
                            <div className="px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold text-foreground">
                                  {reply.first_name} {reply.last_name}
                                </span>
                                {reply.job_title && <span className="text-xs text-muted-foreground">· {reply.job_title}</span>}
                                {reply.company_name && <span className="text-xs text-muted-foreground">@ {reply.company_name}</span>}
                              </div>
                              <div className="flex items-center space-x-2">
                                <ReplyCategoryBadge category={reply.category} />
                                {reply.reply_date && <span className="text-[10px] text-muted-foreground">{new Date(reply.reply_date).toLocaleDateString()}</span>}
                              </div>
                            </div>

                            <div className="p-4 space-y-3">
                              {/* What we sent */}
                              {reply.outreach_email && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center">
                                    📤 What We Sent
                                  </p>
                                  <div className="text-xs text-foreground/60 whitespace-pre-wrap bg-secondary/20 rounded-md p-3 border border-border/30 max-h-32 overflow-y-auto leading-relaxed">
                                    {reply.outreach_email.slice(0, 500)}{reply.outreach_email.length > 500 && '...'}
                                  </div>
                                </div>
                              )}

                              {/* Their reply */}
                              <div>
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center">
                                  💬 Their Reply
                                </p>
                                <div className="text-sm text-foreground whitespace-pre-wrap bg-primary/5 rounded-md p-3 border border-primary/10 leading-relaxed">
                                  {reply.lead_reply}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ---- TAB: Optimize ---- */}
                  {drawerTab === "optimize" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center">
                          <Zap className="w-4 h-4 mr-2 text-amber-500" />
                          AI Copywriting Copilot
                        </h4>
                      </div>

                      {!drawerOptResult && !drawerOptLoading && (
                        <div className="text-center py-16 space-y-4">
                          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-amber-500" />
                          </div>
                          <p className="text-foreground font-semibold">Ready to Optimize</p>
                          <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            The AI Copilot will analyze this campaign's copy, replies, and intelligence brief to generate optimization recommendations.
                          </p>
                          <button
                            onClick={handleDrawerOptimize}
                            className="inline-flex items-center px-6 py-3 text-sm font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Run AI Analysis
                          </button>
                        </div>
                      )}

                      {drawerOptLoading && (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-muted-foreground">
                          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                          <p className="animate-pulse font-medium">Cross-referencing Intelligence Briefs & Lead Replies...</p>
                        </div>
                      )}

                      {drawerOptResult && (
                        <div className="prose prose-invert max-w-none prose-sm">
                          <ReactMarkdown>{drawerOptResult}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================== FIX NAMING MODAL ==================== */}
      {isNamingModalOpen && namingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
              <h3 className="font-semibold text-lg flex items-center text-foreground">
                <Edit2 className="w-5 h-5 mr-2 text-primary" />Fix Campaign Naming
              </h3>
              <button onClick={() => setIsNamingModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-secondary"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Name</label>
                <p className="mt-1 text-sm text-destructive line-through opacity-70 font-mono bg-destructive/5 px-3 py-2 rounded-md border border-destructive/10">{namingCampaign.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Client</label><input type="text" value={namingCampaign.client} readOnly className="mt-1 w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed" /></div>
                <div><label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Persona</label><input type="text" value={namingFields.persona} onChange={e => setNamingFields(f => ({ ...f, persona: e.target.value }))} placeholder="e.g. F&B Executives" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" /></div>
                <div><label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Location</label><input type="text" value={namingFields.location} onChange={e => setNamingFields(f => ({ ...f, location: e.target.value }))} placeholder="e.g. UK, UAE, Europe" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" /></div>
                <div><label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Offer / Segment</label><input type="text" value={namingFields.offer} onChange={e => setNamingFields(f => ({ ...f, offer: e.target.value }))} placeholder="e.g. Virtual Brand Hosting" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" /></div>
                <div><label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Week</label><input type="text" value={namingFields.week} onChange={e => setNamingFields(f => ({ ...f, week: e.target.value }))} placeholder="e.g. W14" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" /></div>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                <label className="text-xs text-primary uppercase tracking-wider font-semibold flex items-center"><Sparkles className="w-3 h-3 mr-1.5" />Preview</label>
                <p className="mt-1.5 text-sm font-semibold text-foreground font-mono">{namingPreview || <span className="text-muted-foreground italic">Fill in the fields above...</span>}</p>
              </div>
              {namingResult && (
                <div className={`text-sm px-4 py-3 rounded-lg border ${namingResult.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>{namingResult.message}</div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border bg-secondary/30 flex items-center justify-between">
              <button onClick={() => setIsNamingModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={handleFixNaming} disabled={namingLoading || !namingPreview || namingResult?.success} className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
                {namingLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Renaming...</>) : namingResult?.success ? (<><Check className="w-4 h-4 mr-2" /> Done!</>) : (<><Check className="w-4 h-4 mr-2" /> Apply Fix (Instantly + Supabase + Notion)</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
