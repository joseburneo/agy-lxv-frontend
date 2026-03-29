"use client";

import { useState } from "react";
import { Sparkles, Save, FileText } from "lucide-react";

export default function BriefsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefOutput, setBriefOutput] = useState("");

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate API call to backend
    setTimeout(() => {
      setBriefOutput(`# Agency OS Campaign Brief Template v4 (Strategy Focus)\n\n---\n\n## SECTION 1 — Campaign Overview & Identity\n\n**Campaign Name:** Connect Resources – CEO – UAE – Office Space for Tech – W13\n**Offer:** Tech Office Space\n**Segment:** Technology Startups\n**Persona:** CEO / Founder\n**Angle:** Reduce overhead while maintaining a premium address.\n**Credibility Assets:** 43 tech startups housed, 98% retention.\n\n---\n\n## SECTION 2 — Audience & List Building\n\n**TAM / Market Scope:** ~2,500 active tech startups in UAE\n**Job Titles:** CEO, Founder, Managing Director\n\n---\n\n## SECTION 3 — Copywriting Strategy\n\n**The Core Tension (The Pain):** \nFounders are burning cash on standard commercial leases that don't offer flexibility for scaling teams.\n\n**The Emotional Hook:**\nCost of delay/inflexibility. Locking into a 3-year lease vs month-to-month agility.\n\n**Email 1 Strategy (The Insight & Proof):**\n- **Objective:** Challenge their traditional office lease renewal.\n- **Call to Action Angle:** Soft ask for our "Tech Hub Cost Savings" report.\n- **Key Metric:** How 43 startups saved 30% on overhead last quarter.`);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Strategy Brief Generator</h2>
        <p className="text-muted-foreground mt-1 text-sm">Leverage your Client Intelligence Library to autonomously draft high-converting campaign strategies.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-medium text-sm border-b border-border pb-2">Campaign Parameters</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Select Client</label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option>Connect Resources</option>
                <option>CAMB.AI</option>
                <option>Luxvance</option>
                <option>Kcal</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Target Persona</label>
              <input type="text" placeholder="e.g. CEO" className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <input type="text" placeholder="e.g. UAE" className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Offer / Segment Flow</label>
              <input type="text" placeholder="e.g. Office Space for Tech" className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full mt-4 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <span className="flex items-center"><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div> Thinking...</span>
              ) : (
                <span className="flex items-center"><Sparkles className="w-4 h-4 mr-2" /> Generate Strategy</span>
              )}
            </button>
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col">
          <div className="bg-card border border-border rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-secondary/30">
              <div className="flex items-center text-sm font-medium text-muted-foreground">
                <FileText className="w-4 h-4 mr-2" />
                Generated Output
              </div>
              {briefOutput && (
                <button className="flex items-center text-xs font-medium text-foreground hover:bg-secondary px-2 py-1 rounded transition-colors">
                  <Save className="w-3 h-3 mr-1" /> Save Brief
                </button>
              )}
            </div>
            
            <div className="flex-1 p-0 relative bg-background">
              {!briefOutput && !isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <Sparkles className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm">Define parameters and generate to view strategy.</p>
                </div>
              ) : (
                <textarea 
                  className="w-full h-full p-6 text-sm font-mono bg-transparent border-0 resize-none focus:ring-0 outline-none leading-relaxed"
                  value={briefOutput}
                  readOnly
                  placeholder={isGenerating ? "Consulting Intelligence Library..." : ""}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
