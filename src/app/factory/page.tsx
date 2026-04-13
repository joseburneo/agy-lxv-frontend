import React from "react";
import CampaignStepper from "@/components/factory/CampaignStepper";

export const metadata = {
  title: "Campaign Factory | Agency OS",
  description: "Autonomous lead enrichment and specific campaign targeting context",
};

export default function FactoryPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-white px-6">
        <h1 className="text-xl font-semibold tracking-tight">Campaign Factory</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">New Campaign Workflow</h2>
          <p className="mt-2 text-gray-600">
            Upload your raw Clay CSV to calculate costs, enrich missing data, and establish qualitative grading rules for personalization.
          </p>
        </div>
        
        <CampaignStepper />
      </main>
    </div>
  );
}
