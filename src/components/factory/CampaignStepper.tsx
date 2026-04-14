"use client";

import React, { useState, useEffect } from "react";
import { UploadCloud, CheckCircle2, Loader2, ArrowRight, Save, Play, Settings, Users, Database, ArrowLeft, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { prepareBatch, getJobStatus, enrichBatch, qualifyBatch, runAudienceBuilder, parseAudiencePrompt, FactoryJobState } from "@/lib/factory-api";
import { AutocompleteTagsInput } from "./AutocompleteTagsInput";

const STEPS = [
  { id: 1, name: "Select Source" },
  { id: 2, name: "Estimate Costs" },
  { id: 3, name: "Enrichment Engine" },
  { id: 4, name: "Qualification Rules" },
  { id: 5, name: "Final Review" }
];

const JOB_TITLES = [
  "Founder", "Co-Founder", "Owner", "Chief Executive Officer", "CEO", "Chief Operating Officer", "COO", "Chief Financial Officer", "CFO", "Chief Marketing Officer", "CMO", "Chief Revenue Officer", "CRO", "Chief Strategy Officer", "CSO", "Chief Product Officer", "CPO", "Chief Information Officer", "CIO", "Chief Technology Officer", "CTO", "Managing Director", "MD", "General Manager", "GM", "President", "Vice President", "VP", "Vice President of Sales", "VP Sales", "Vice President of Marketing", "VP Marketing", "Vice President of Operations", "VP Operations", "Vice President of Finance", "VP Finance", "Vice President of Product", "VP Product", "Vice President of Strategy", "Director of Sales", "Director of Marketing", "Director of Operations", "Director of Finance", "Director of IT", "Director of Engineering", "Head of Sales", "Head of Marketing", "Head of Operations", "Head of Growth", "Head of Product", "Head of Revenue", "Account Executive", "Business Development Manager", "Sales Manager", "Marketing Manager", "Finance Director", "Project Manager", "Product Manager", "Consultant", "Business Analyst"
];

const LOCATIONS = [
  "United States", "Germany", "India", "United Kingdom", "Russia", "France", "China", "Canada", "Netherlands", "Mexico", "Belgium", "Japan", "Brazil", "Australia", "Poland", "Thailand", "Sweden", "Portugal", "Spain", "Czech Republic", "Taiwan", "South Africa", "Colombia", "Italy", "Vietnam", "Nigeria", "Singapore", "Hong Kong", "Ireland", "Israel", "Switzerland", "Turkey", "Romania", "South Korea", "Indonesia", "United Arab Emirates", "Saudi Arabia", "Austria", "Philippines", "Peru", "Malaysia", "Argentina", "Ukraine", "Ghana", "Denmark", "Norway", "Finland", "Puerto Rico", "Qatar", "Macau", "New Zealand", "Hungary", "Luxembourg", "Kuwait", "Egypt", "Slovakia", "Greece", "Kenya", "Bulgaria", "Costa Rica", "Chile", "Venezuela", "Afghanistan"
];

const INDUSTRIES = [
  "Information Technology & Services", "Construction", "Marketing & Advertising", "Real Estate", "Health, Wellness & Fitness", "Management Consulting", "Computer Software", "Internet", "Retail", "Financial Services", "Consumer Services", "Hospital & Health Care", "Automotive", "Restaurants", "Education Management", "Food & Beverages", "Design", "Hospitality", "Accounting", "Events Services", "Nonprofit Organization Management", "Entertainment", "Electrical/Electronic Manufacturing", "Leisure, Travel & Tourism", "Professional Training & Coaching", "Transportation/Trucking/Railroad", "Law Practice", "Apparel & Fashion", "Architecture & Planning", "Mechanical Or Industrial Engineering", "Insurance", "Telecommunications", "Human Resources", "Staffing & Recruiting", "Sports", "Legal Services", "Oil & Energy", "Media Production", "Machinery", "Wholesale", "Consumer Goods"
];

const SENIORITY_LEVELS = [
  "Founder", "Owner", "Executive (C-Suite)", "Partner", "Vice President", "Director", "Head", "Manager"
];

const COMPANY_SIZES = [
  "1-10", "11-20", "21-50", "51-100", "101-200", "201-500", "501-1000", "1001-2000"
];

const EMAIL_STATUSES = [
  "Validated", "Not Validated", "Unknown"
];

export default function CampaignStepper() {
  const [currentStep, setCurrentStep] = useState(1);
  const [sourceMode, setSourceMode] = useState<"selection" | "apify" | "icypeas">("selection");
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  
  // Job State
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobState, setJobState] = useState<FactoryJobState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Audience Builder State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [audienceFilters, setAudienceFilters] = useState({
    job_title: [] as string[],
    seniority_level: [] as string[],
    location: [] as string[],
    company_size: [] as string[],
    email_status: ["Validated"] as string[],
    industry: [] as string[],
    keywords: [] as string[],
    company: [] as string[],
    exclude_domains: [] as string[],
    number_of_leads: 100,
    work_emails_only: true
  });

  const handleParsePrompt = async () => {
    if (!aiPrompt.trim()) return;
    setIsParsingAi(true);
    setError(null);
    try {
      const res = await parseAudiencePrompt(aiPrompt);
      if (res.data) {
        setAudienceFilters({
          job_title: res.data.job_title ? res.data.job_title.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          seniority_level: res.data.seniority_level ? res.data.seniority_level.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          location: res.data.location ? res.data.location.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          company_size: res.data.company_size ? res.data.company_size.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          email_status: ["Validated"], // Default
          industry: res.data.industry ? res.data.industry.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          keywords: res.data.keywords ? res.data.keywords.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          company: res.data.company ? res.data.company.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          exclude_domains: res.data.exclude_domains ? res.data.exclude_domains.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          number_of_leads: res.data.number_of_leads || 100
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to parse prompt");
    } finally {
      setIsParsingAi(false);
    }
  };

  // Poll job status when processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (jobId && (isProcessing || currentStep === 3)) {
      interval = setInterval(async () => {
        try {
          const state = await getJobStatus(jobId);
          setJobState(state);
          
          if (state.status === "failed") {
            setError(state.data?.error || "Job failed");
            setIsProcessing(false);
            clearInterval(interval);
          } else if (state.status === "prepared_waiting_confirmation" && currentStep === 1) {
            setIsProcessing(false);
            setCurrentStep(2);
            clearInterval(interval);
          } else if (state.status === "completed" && currentStep === 1) {
            // Apify Audience Builder finished! It bypasses Steps 2 & 3.
            setIsProcessing(false);
            setCurrentStep(4);
            clearInterval(interval);
          } else if (state.status === "completed" && currentStep === 3) {
            setIsProcessing(false);
            setCurrentStep(4);
            clearInterval(interval);
          } else if (state.status === "completed" && currentStep === 4) {
            // Qualification finished
            setIsProcessing(false);
            setCurrentStep(5);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [jobId, isProcessing, currentStep]);

  // Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setIsProcessing(true);
    try {
      const res = await prepareBatch(selected);
      setJobId(res.job_id);
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  const handleAudienceBuilderSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const filters = {
      job_title: audienceFilters.job_title.join(","),
      seniority_level: audienceFilters.seniority_level.join(","),
      company: audienceFilters.company.join(","),
      location: audienceFilters.location.join(","),
      company_size: audienceFilters.company_size.join(","),
      email_status: audienceFilters.email_status.join(","),
      industry: audienceFilters.industry.join(","),
      keywords: audienceFilters.keywords.join(","),
      exclude_domains: audienceFilters.exclude_domains.join(","),
      number_of_leads: audienceFilters.number_of_leads,
      work_emails_only: audienceFilters.work_emails_only,
    };
    
    setIsProcessing(true);
    try {
      const res = await runAudienceBuilder(filters);
      setJobId(res.job_id);
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  const handleApproveEnrichment = async () => {
    if (!jobId) return;
    setIsProcessing(true);
    setCurrentStep(3);
    try {
      await enrichBatch(jobId);
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  const handleQualify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!jobId) return;
    const formData = new FormData(e.currentTarget);
    const rules = {
      tier1_criteria: formData.get("tier1"),
      tier2_criteria: formData.get("tier2"),
      tier3_criteria: formData.get("tier3"),
      no_go_criteria: formData.get("nogo"),
    };
    
    setIsProcessing(true);
    try {
      const res = await qualifyBatch(jobId, rules);
      // Wait for Phase 2, which runs on a new job id "q_{jobId}"
      setJobId(res.job_id);
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  const exportToCSV = () => {
    if (!jobState?.data || !Array.isArray(jobState.data)) return;
    
    const leads = jobState.data;
    if (leads.length === 0) return;
    
    // Convert to CSV
    const headers = Object.keys(leads[0]).join(",");
    const rows = leads.map(l => 
      Object.values(l).map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Factory_Enriched_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handleAbort = async () => {
    if (!jobId) return;
    try {
      import('@/lib/factory-api').then(api => api.abortApifyJob(jobId));
    } catch (err) {
      console.error("Failed to abort", err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      {/* Stepper Header */}
      <nav aria-label="Progress" className="mb-10">
        <ol role="list" className="space-y-4 md:flex md:space-y-0 md:space-x-8">
          {STEPS.map((step) => {
            const isApifyMode = sourceMode === "apify";
            // If in Apify mode, highlight Steps 2 & 3 as skipped or completed quickly
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id || (isApifyMode && currentStep === 4 && (step.id === 2 || step.id === 3));

            return (
              <li key={step.name} className="md:flex-1">
                <div
                  className={`group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 transition-colors ${
                    isCompleted
                      ? "border-emerald-600"
                      : isActive
                      ? "border-blue-600"
                      : "border-gray-200"
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      isCompleted
                        ? "text-emerald-600"
                        : isActive
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  >
                    Step {step.id} {isApifyMode && (step.id === 2 || step.id === 3) ? "(Skipped)" : ""}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{step.name}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200 text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Step Content */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col"
            >
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center p-12 border border-blue-100 rounded-lg bg-blue-50/30">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                  <p className="font-medium text-gray-900">Working...</p>
                  <p className="text-sm text-gray-500 mt-2">{jobState?.data?.progress || 'Initiating...'}</p>
                  {sourceMode === "apify" && jobState?.data?.run_id && (
                    <button 
                      onClick={handleAbort}
                      className="mt-6 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium transition-colors border border-red-200"
                    >
                      Abort Run
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {sourceMode === "selection" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Apify Card */}
                      <button 
                        onClick={() => setSourceMode("apify")}
                        className="flex flex-col items-start p-8 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left bg-white shadow-sm"
                      >
                        <div className="bg-blue-100 text-blue-600 p-3 rounded-lg mb-4">
                          <Users className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Audience Builder</h3>
                        <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                          Build a brand new list of leads from scratch using dynamic filters. Powered by Apify.
                        </p>
                        <div className="mt-auto inline-flex items-center text-sm font-medium text-blue-600">
                          Configure Filters <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </button>

                      {/* Icypeas Card */}
                      <button 
                        onClick={() => setSourceMode("icypeas")}
                        className="flex flex-col items-start p-8 rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left bg-white shadow-sm"
                      >
                        <div className="bg-indigo-100 text-indigo-600 p-3 rounded-lg mb-4">
                          <Database className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Custom List Enrichment</h3>
                        <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                          Upload a specific CSV to find emails. Powered by Icypeas and Supabase Cache.
                        </p>
                        <div className="mt-auto inline-flex items-center text-sm font-medium text-indigo-600">
                          Upload CSV <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </button>
                    </div>
                  )}

                  {sourceMode === "apify" && (
                    <div className="border border-gray-200 rounded-xl p-8 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <button onClick={() => setSourceMode("selection")} className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
                          <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </button>
                        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                          <Search className="w-3.5 h-3.5" /> Powered by Apify
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-1">Define Target Audience</h3>
                      <p className="text-sm text-gray-500 mb-6 font-medium">Use the AI Assistant to automatically fill the filters, or configure them manually below.</p>

                      <div className="mb-8 bg-blue-50/50 border border-blue-100 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">🤖</span>
                          <h4 className="font-bold text-blue-900">AI Assistant</h4>
                        </div>
                        <div className="flex gap-3 relative">
                          <textarea 
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="e.g. Find 150 VP of Marketing in SaaS companies in Toronto size 51-100..."
                            className="w-full border-blue-200 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-3 min-h-[80px] resize-y"
                          />
                          <button 
                            type="button"
                            onClick={handleParsePrompt}
                            disabled={isParsingAi || !aiPrompt.trim()}
                            className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md px-4 py-1.5 text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
                          >
                            {isParsingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : "Auto-Fill Filters"}
                          </button>
                        </div>
                      </div>

                      <form onSubmit={handleAudienceBuilderSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                          <AutocompleteTagsInput 
                            label="Job Titles"
                            helpText="(e.g., 'sales' or similar)"
                            placeholder="Add titles + Enter"
                            tags={audienceFilters.job_title}
                            setTags={(t: string[]) => setAudienceFilters({ ...audienceFilters, job_title: t })}
                            suggestions={JOB_TITLES}
                          />

                          <AutocompleteTagsInput 
                            label="Seniority Level"
                            placeholder="Add seniority levels + Enter"
                            tags={audienceFilters.seniority_level}
                            setTags={(t: string[]) => setAudienceFilters({ ...audienceFilters, seniority_level: t })}
                            suggestions={SENIORITY_LEVELS}
                          />

                          <AutocompleteTagsInput 
                            label="Location"
                            placeholder="Add locations + Enter"
                            tags={audienceFilters.location}
                            setTags={(t: string[]) => setAudienceFilters({ ...audienceFilters, location: t })}
                            suggestions={LOCATIONS}
                          />

                          <AutocompleteTagsInput 
                            label="Target Companies (Domains)"
                            placeholder="Add domains + Enter"
                            tags={audienceFilters.company}
                            setTags={(t: string[]) => setAudienceFilters({ ...audienceFilters, company: t })}
                          />

                          <AutocompleteTagsInput 
                            label="Industry"
                            placeholder="Add industries + Enter"
                            tags={audienceFilters.industry}
                            setTags={(t: string[]) => setAudienceFilters({ ...audienceFilters, industry: t })}
                            suggestions={INDUSTRIES}
                          />

                          <AutocompleteTagsInput 
                            label="Company Size"
                            placeholder="Add company sizes + Enter"
                            tags={audienceFilters.company_size}
                            setTags={(t: string[]) => setAudienceFilters({ ...audienceFilters, company_size: t })}
                            suggestions={COMPANY_SIZES}
                          />

                          <AutocompleteTagsInput 
                            label="Keywords"
                            placeholder="Add keywords + Enter"
                            tags={audienceFilters.keywords}
                            setTags={(t: string[]) => setAudienceFilters({ ...audienceFilters, keywords: t })}
                          />
                          
                          <AutocompleteTagsInput 
                            label="Email Status"
                            placeholder="Add email statuses + Enter"
                            tags={audienceFilters.email_status}
                            setTags={(t: string[]) => setAudienceFilters({ ...audienceFilters, email_status: t })}
                            suggestions={EMAIL_STATUSES}
                          />
                        </div>

                        {/* Exclude Domains / Blocklist */}
                        <div className="col-span-1 md:col-span-2 mt-4 mb-2 p-4 bg-gray-50/70 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                              <span className="text-red-500">∅</span> Exclude Companies (Blocklist)
                            </h4>
                            <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-1.5 px-3 rounded-md text-xs shadow-sm transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-300 inline-flex items-center gap-1.5">
                              <UploadCloud className="w-4 h-4 text-gray-500" /> Upload CSV
                              <input type="file" className="sr-only" accept=".csv" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const text = ev.target?.result as string;
                                  const lines = text.split('\n');
                                  const domains = new Set<string>();
                                  lines.forEach(line => {
                                    const cols = line.split(',');
                                    cols.forEach(col => {
                                      let val = col.trim().toLowerCase();
                                      if (val.includes('.') && !val.includes(' ')) {
                                        val = val.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
                                        if (val) domains.add(val);
                                      }
                                    });
                                  });
                                  const newTags = Array.from(domains);
                                  const merged = Array.from(new Set([...audienceFilters.exclude_domains, ...newTags]));
                                  setAudienceFilters(prev => ({ ...prev, exclude_domains: merged }));
                                };
                                reader.readAsText(file);
                              }} />
                            </label>
                          </div>
                          <AutocompleteTagsInput 
                            placeholder="Paste domains (e.g. comp.com) or upload a CSV file targeting any column..."
                            tags={audienceFilters.exclude_domains}
                            setTags={(t: string[]) => setAudienceFilters({ ...audienceFilters, exclude_domains: t })}
                            type="textarea"
                          />
                          <p className="text-xs text-gray-500 mt-2">Any leads matching these domains will be discarded prior to deduplication and save.</p>
                        </div>

                        <div className="pt-6 border-t mt-6 flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4">
                               <label className="text-sm font-semibold text-gray-700">Leads to fetch:</label>
                               <input 
                                 type="text" 
                                 list="lead-options"
                                 value={audienceFilters.number_of_leads || ""}
                                 onChange={(e) => setAudienceFilters({ ...audienceFilters, number_of_leads: Number(e.target.value) || 0 })}
                                 className="w-32 min-h-[42px] bg-white text-gray-900 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3 border" 
                               />
                               <datalist id="lead-options">
                                 <option value="100" />
                                 <option value="500" />
                                 <option value="1000" />
                                 <option value="2000" />
                                 <option value="3000" />
                                 <option value="4500" />
                                 <option value="6000" />
                                 <option value="8000" />
                                 <option value="10000" />
                               </datalist>
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" id="work_emails"
                                checked={audienceFilters.work_emails_only}
                                onChange={(e) => setAudienceFilters({ ...audienceFilters, work_emails_only: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <label htmlFor="work_emails" className="text-sm font-medium text-gray-700 cursor-pointer">
                                Remove Personal Emails (Gmail, Yahoo, etc.)
                              </label>
                            </div>
                          </div>
                          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2">
                            Run Audience Builder <Play className="w-5 h-5 fill-current" />
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {sourceMode === "icypeas" && (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl border-gray-300 hover:border-indigo-500 transition-colors bg-gray-50/50">
                      <div className="w-full flex justify-start mb-6 -mt-6">
                        <button onClick={() => setSourceMode("selection")} className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
                          <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </button>
                      </div>
                      <UploadCloud className="w-12 h-12 text-indigo-400 mb-4" />
                      <h3 className="text-xl font-bold text-gray-900">Upload Target CSV</h3>
                      <p className="mt-2 text-sm text-gray-500 text-center max-w-sm mb-8">
                        File must contain First Name, Last Name, Company Name (or Domain), and LinkedIn Profile columns. We will use Icypeas to find missing emails.
                      </p>
                      <label className="relative cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg shadow-sm transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                        <span>Select CSV file</span>
                        <input type="file" className="sr-only" accept=".csv" onChange={handleFileUpload} />
                      </label>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {currentStep === 2 && jobState?.data && sourceMode === "icypeas" && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-900">Dataset Prepared Successfully</h3>
                    <p className="text-sm text-emerald-800 mt-1">We have cross-referenced your {jobState.data.total_leads} leads against the AgencyOS Contact Master List.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="border rounded-lg p-5 bg-white shadow-sm">
                   <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Leads</p>
                   <p className="mt-2 text-3xl font-bold text-gray-900">{jobState.data.total_leads}</p>
                 </div>
                 <div className="border border-indigo-200 rounded-lg p-5 bg-indigo-50 shadow-sm">
                   <p className="text-sm font-medium text-indigo-700 uppercase tracking-wider">Cache Hits (Free)</p>
                   <p className="mt-2 text-3xl font-bold text-indigo-900">{jobState.data.cache_hits}</p>
                   <p className="text-xs text-indigo-600 mt-1">Found in Supabase</p>
                 </div>
                 <div className="border border-orange-200 rounded-lg p-5 bg-orange-50 shadow-sm">
                   <p className="text-sm font-medium text-orange-700 uppercase tracking-wider">Requires API</p>
                   <p className="mt-2 text-3xl font-bold text-orange-900">{jobState.data.needs_api}</p>
                   <p className="text-xs text-orange-600 mt-1">Est. {jobState.data.estimated_icypeas_credits} Icypeas credits</p>
                 </div>
              </div>

              <div className="flex items-center justify-end gap-4 mt-8 border-t pt-6">
                <button 
                  onClick={() => { setFile(null); setCurrentStep(1); setJobState(null); }}
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Discard
                </button>
                <button 
                  onClick={handleApproveEnrichment}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  Confirm & Pay Credits <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center p-16 text-center"
            >
              <div className="relative">
                <div className="w-24 h-24 border-4 border-gray-100 rounded-full animate-pulse"></div>
                <div className="absolute top-0 left-0 w-24 h-24 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                <Settings className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mt-6">Enriching via Icypeas...</h3>
              <p className="text-gray-500 mt-2">
                {jobState?.data?.progress || "Initializing verification engines"}
              </p>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-6 flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-bold">Configure Research & Qualification</h3>
                  <p className="text-gray-500 mt-1">Define the specific context for identifying Gold, Silver, and Bronze leads for this campaign.</p>
                </div>
                {sourceMode === "apify" && (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                       <CheckCircle2 className="w-4 h-4" /> Audience Builder Complete
                    </span>
                  </div>
                )}
              </div>

              {isProcessing ? (
                 <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                    <p className="font-medium text-gray-900">Running AI Tier Classifier...</p>
                    <p className="text-sm text-gray-500">{jobState?.data?.progress}</p>
                 </div>
              ) : (
                <form onSubmit={handleQualify} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">Tier 1 (Gold) Criteria</label>
                    <textarea name="tier1" rows={2} className="mt-1 block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 bg-white" placeholder="e.g., Target has 'Partner' or 'Founder' in title and company > 10 employees."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">Tier 2 (Silver) Criteria</label>
                    <textarea name="tier2" rows={2} className="mt-1 block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 bg-white" placeholder="e.g., Manager level, or relevant industry but smaller size."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">Tier 3 (Bronze) Criteria</label>
                    <textarea name="tier3" rows={2} className="mt-1 block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 bg-white" placeholder="e.g., Any other verified lead."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-red-700">No-Go (Reject) Criteria</label>
                    <textarea name="nogo" rows={2} className="mt-1 block w-full rounded-lg border border-red-300 p-3 shadow-sm focus:border-red-500 focus:ring-red-500 text-gray-900 bg-white" placeholder="e.g., No verified email, or specific competitors."></textarea>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4">
                    <button type="button" onClick={() => setCurrentStep(5)} className="text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors decoration-dashed underline underline-offset-4">
                      Skip Qualification & View Results
                    </button>
                    <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-lg font-medium shadow-sm transition-colors">
                      <Play className="w-4 h-4" /> Run Classifier & Personalization
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-emerald-900">Campaign Ready</h3>
                      <p className="text-sm text-emerald-800 mt-1">
                        All {jobState?.data?.length || 0} leads have been graded and personalized. 
                        Ready for Instantly upload.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                  >
                    <Save className="w-5 h-5" /> Download Final CSV
                  </button>
                </div>
              </div>
              
              {/* Preview Table */}
              <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                   <h4 className="font-semibold text-gray-700">Preview (Top 5 rows)</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3 border-b border-gray-100">Name</th>
                        <th className="px-4 py-3 border-b border-gray-100">Email</th>
                        <th className="px-4 py-3 border-b border-gray-100">Tier</th>
                        <th className="px-4 py-3 border-b border-gray-100">Icebreaker</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {jobState?.data?.slice(0, 5).map((l: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-900">{l.first_name} {l.last_name}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {l.email} 
                            {l.email_verified ? <span className="ml-2 text-emerald-500 text-xs">✓ Verified</span> : null}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                              ${l.tier === 1 ? 'bg-amber-100 text-amber-800' : 
                                l.tier === 2 ? 'bg-gray-100 text-gray-800' : 
                                l.tier === 3 ? 'bg-orange-100 text-orange-800' : 
                                'bg-red-100 text-red-800'}`}>
                              Tier {l.tier || 4}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{l.personalization_body || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex justify-start mt-8">
                <button 
                  onClick={() => { setFile(null); setCurrentStep(1); setJobState(null); setSourceMode("selection"); }}
                  className="text-blue-600 hover:underline font-medium text-sm"
                >
                  Start New Campaign
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
