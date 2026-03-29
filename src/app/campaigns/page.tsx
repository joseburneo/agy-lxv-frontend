"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Edit2, Search } from "lucide-react";

// Mock Data structure based on Instantly campaigns
const mockCampaigns = [
  { id: "1", name: "Connect Resources – CEO – UAE – Office Space for Tech – W13", client: "Connect Resources", sent: 4120, open: "68%", reply: "4.2%", isCompliant: true },
  { id: "2", name: "CAMB.AI – Content Creators EMEA Translation W14", client: "CAMB.AI", sent: 890, open: "71%", reply: "5.1%", isCompliant: false },
  { id: "3", name: "Luxvance - Real Estate Directors - UAE", client: "Luxvance", sent: 12500, open: "45%", reply: "1.2%", isCompliant: false },
  { id: "4", name: "Kcal – VP HR – UAE – Corporate Meal Plans – W10", client: "Kcal", sent: 5400, open: "62%", reply: "3.8%", isCompliant: true },
];

export default function CampaignsPage() {
  const [filter, setFilter] = useState<"all" | "violations">("all");
  
  const filtered = mockCampaigns.filter(c => filter === "all" ? true : !c.isCompliant);

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Active Campaigns</h2>
          <p className="text-muted-foreground mt-1 text-sm">Monitor campaign velocity and adhere to the Agency OS naming conventions.</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-secondary"}`}
          >
            All Campaigns
          </button>
          <button 
            onClick={() => setFilter("violations")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${filter === "violations" ? "bg-destructive text-destructive-foreground" : "bg-card border border-border text-foreground hover:bg-secondary"}`}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Naming Violations
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

      <div className="rounded-md border border-border shrink-0 overflow-hidden">
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
                <td className="px-4 py-4 text-right">
                  {!campaign.isCompliant ? (
                    <button className="inline-flex items-center text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors font-medium">
                      <Edit2 className="w-3 h-3 mr-1.5" />
                      Fix Naming
                    </button>
                  ) : (
                    <button className="text-xs text-muted-foreground hover:text-foreground">View Base</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
