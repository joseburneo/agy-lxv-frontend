export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://agency-os-api.onrender.com";

export interface FactoryJobState {
  status: "not_found" | "processing" | "prepared_waiting_confirmation" | "completed" | "failed";
  data?: any;
}

/**
 * Step 1: Upload CSV and calculate costs
 */
export async function prepareBatch(file: File): Promise<{ status: string; job_id: string; leads_received: number }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BACKEND_URL}/api/factory/prepare-batch`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to prepare batch");
  return res.json();
}

/**
 * Step 1 (Alternative): Run Apify Audience Builder
 */
export async function runAudienceBuilder(filters: Record<string, any>): Promise<{ status: string; job_id: string }> {
  const res = await fetch(`${BACKEND_URL}/api/factory/audience-builder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filters }),
  });

  if (!res.ok) throw new Error("Failed to start audience builder");
  return res.json();
}

/**
 * Step 2: Accept costs and enrich
 */
export async function enrichBatch(jobId: string): Promise<{ status: string; job_id: string }> {
  const res = await fetch(`${BACKEND_URL}/api/factory/enrich-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId }),
  });

  if (!res.ok) throw new Error("Failed to start enrichment");
  return res.json();
}

/**
 * Step 3: Check job status
 */
export async function getJobStatus(jobId: string): Promise<FactoryJobState> {
  const res = await fetch(`${BACKEND_URL}/api/factory/job/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch job status");
  return res.json();
}

/**
 * Step 4: Submit custom qualification rules
 */
export async function qualifyBatch(jobId: string, rules: Record<string, any>): Promise<{ status: string; job_id: string }> {
  const res = await fetch(`${BACKEND_URL}/api/factory/qualify-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, icp_rules: rules }),
  });

  if (!res.ok) throw new Error("Failed to start qualification");
  return res.json();
}
