"use client";

import { useState, useEffect } from "react";
import { BarChart3, Mail, Users, MousePointerClick, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    emailsSent: 0,
    opportunities: 0,
    avgOpenRate: "0.0%"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        // 1. Get Campaigns Data (Active Campaigns & Emails Sent & Avg Open Rate)
        const { data: campaigns } = await supabase.from('campaigns').select('emails_sent, open_rate');
        
        let totalSent = 0;
        let totalOpenRate = 0;
        let validOpenRates = 0;

        if (campaigns) {
          totalSent = campaigns.reduce((sum, c) => sum + (c.emails_sent || 0), 0);
          
          campaigns.forEach(c => {
            if (c.open_rate) {
              const parsed = parseFloat(c.open_rate.replace('%', ''));
              if (!isNaN(parsed)) {
                totalOpenRate += parsed;
                validOpenRates++;
              }
            }
          });
        }

        const avgOpenRate = validOpenRates > 0 ? (totalOpenRate / validOpenRates).toFixed(1) + "%" : "0.0%";
        const activeCampaigns = campaigns ? campaigns.length : 0;

        // 2. Get Opportunities (SQLs & MQLs from lead_replies)
        const { count: oppsCount } = await supabase
          .from('lead_replies')
          .select('*', { count: 'exact', head: true })
          .in('classification', ['SQL', 'MQL']);

        setStats({
          activeCampaigns,
          emailsSent: totalSent,
          opportunities: oppsCount || 0,
          avgOpenRate
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground mt-1 text-sm">Welcome to the Agency OS backend interface.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric Cards */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Active Campaigns</h3>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" /> : stats.activeCampaigns}
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-emerald-500">Live from Supabase</p>
        </div>

        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Emails Sent</h3>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" /> : stats.emailsSent.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-emerald-500">Live from Supabase</p>
        </div>

        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Opportunities</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
             {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" /> : stats.opportunities}
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-emerald-500">SQLs & MQLs</p>
        </div>

        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Avg Open Rate</h3>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
             {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" /> : stats.avgOpenRate}
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-emerald-500">Live from Supabase</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm col-span-4 min-h-[400px]">
          <div className="p-6 flex flex-row items-center space-y-0 pb-2">
             <div className="space-y-1">
               <h3 className="font-semibold leading-none tracking-tight">Recent Activity</h3>
               <p className="text-sm text-muted-foreground">Campaigns launched across clients.</p>
             </div>
          </div>
          <div className="p-6 pt-0">
            <div className="flex items-center justify-center h-[300px] border border-dashed border-border rounded-lg bg-secondary/20">
              <span className="text-sm text-muted-foreground">Activity feed coming soon...</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm col-span-3 min-h-[400px]">
          <div className="p-6 flex flex-row items-center space-y-0 pb-2">
             <div className="space-y-1">
               <h3 className="font-semibold leading-none tracking-tight">Quick Actions</h3>
             </div>
          </div>
          <div className="p-6 pt-0 flex flex-col gap-4">
             <a href="/briefs" className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
               Generate Brief
             </a>
             <a href="/campaigns" className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
               View All Campaigns
             </a>
          </div>
        </div>
      </div>
    </div>
  );
}
