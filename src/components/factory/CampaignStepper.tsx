"use client";

import React, { useState, useEffect } from "react";
import { UploadCloud, CheckCircle2, Loader2, ArrowRight, Save, Play, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { prepareBatch, getJobStatus, enrichBatch, qualifyBatch, FactoryJobState } from "@/lib/factory-api";

const STEPS = [
  { id: 1, name: "Upload CSV" },
  { id: 2, name: "Estimate Costs" },
  { id: 3, name: "Enrichment Engine" },
  { id: 4, name: "Qualification Rules" },
  { id: 5, name: "Final Review" }
];

export default function CampaignStepper() {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  
  // Job State
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobState, setJobState] = useState<FactoryJobState | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      {/* Stepper Header */}
      <nav aria-label="Progress" className="mb-10">
        <ol role="list" className="space-y-4 md:flex md:space-y-0 md:space-x-8">
          {STEPS.map((step) => (
            <li key={step.name} className="md:flex-1">
              <div
                className={`group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 transition-colors ${
                  currentStep > step.id
                    ? "border-emerald-600"
                    : currentStep === step.id
                    ? "border-blue-600"
                    : "border-gray-200"
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    currentStep > step.id
                      ? "text-emerald-600"
                      : currentStep === step.id
                      ? "text-blue-600"
                      : "text-gray-500"
                  }`}
                >
                  Step {step.id}
                </span>
                <span className="text-sm font-semibold text-gray-900">{step.name}</span>
              </div>
            </li>
          ))}
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
              className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg border-gray-300 hover:border-blue-500 transition-colors bg-gray-50/50"
            >
              {isProcessing ? (
                <div className="flex flex-col items-center text-blue-600">
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p className="font-medium text-gray-900">Preparing and calculating dataset...</p>
                  <p className="text-sm text-gray-500 mt-2">{jobState?.data?.progress || 'Looking up cache...'}</p>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">Upload Clay CSV</h3>
                  <p className="mt-1 text-sm text-gray-500 text-center max-w-sm mb-6">
                    File must contain First Name, Last Name, Company Name (or Domain), and LinkedIn Profile columns.
                  </p>
                  <label className="relative cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Select CSV file</span>
                    <input type="file" className="sr-only" accept=".csv" onChange={handleFileUpload} />
                  </label>
                </>
              )}
            </motion.div>
          )}

          {currentStep === 2 && jobState?.data && (
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
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm"
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
                <div className="absolute top-0 left-0 w-24 h-24 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                <Settings className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mt-6">Enriching via Apify & Icypeas...</h3>
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
              <div className="mb-6">
                <h3 className="text-xl font-bold">Configure Research & Qualification</h3>
                <p className="text-gray-500 mt-1">Define the specific context for identifying Gold, Silver, and Bronze leads for this campaign.</p>
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
                    <textarea name="tier1" rows={2} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g., Target has 'Partner' or 'Founder' in title and company > 10 employees." required></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">Tier 2 (Silver) Criteria</label>
                    <textarea name="tier2" rows={2} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g., Manager level, or relevant industry but smaller size."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">Tier 3 (Bronze) Criteria</label>
                    <textarea name="tier3" rows={2} className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g., Any other verified lead."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-red-700">No-Go (Reject) Criteria</label>
                    <textarea name="nogo" rows={2} className="mt-1 block w-full rounded-md border border-red-300 p-2 shadow-sm focus:border-red-500 focus:ring-red-500" placeholder="e.g., No verified email, or specific competitors."></textarea>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm shadow-blue-200">
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
                  onClick={() => { setFile(null); setCurrentStep(1); setJobState(null); }}
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
