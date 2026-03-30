"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync-intelligence", { method: "POST" });
      if (res.ok) {
         alert("✅ Sync started! Intelligence Library data is currently being pulled from Notion and pushed to Supabase.");
      } else {
         alert("❌ Failed to trigger sync. Make sure the backend API is running.");
      }
    } catch (err) {
      alert("❌ Error triggering sync.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors ${
        syncing ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <RefreshCw className={`w-4 h-4 mr-3 ${syncing ? "animate-spin text-primary" : ""}`} />
      {syncing ? "Syncing..." : "Sync Intelligence"}
    </button>
  );
}
