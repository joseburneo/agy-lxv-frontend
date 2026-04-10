const BASE_URL = "https://api.zapmail.ai/api";

export interface ZapmailDomainStats {
  domain: string;
  totalAccounts: number;
  activeAccounts: number;
  disconnectedAccounts: number;
  pausedAccounts: number;
}

export interface ZapmailSubscription {
  id: string | number;
  cost: number;
  currency: string;
  nextPayment: string;
}

export interface ZapmailSummary {
  domains: ZapmailDomainStats[];
  subscriptions: ZapmailSubscription[];
  totalMRR: number;
  totalDisconnected: number;
  totalAccounts: number;
}

export async function fetchZapmailData(): Promise<ZapmailSummary> {
  const apiKey = process.env.ZAPMAIL_API_KEY;
  if (!apiKey) {
    throw new Error("ZAPMAIL_API_KEY is not defined in environment variables");
  }

  const headers = {
    "x-auth-zapmail": apiKey,
    "Accept": "application/json"
  };

  // 1. Fetch first page to get total pages and initial accounts
  const firstRes = await fetch(`${BASE_URL}/v2/onebox/connected-accounts?page=1&limit=100`, { headers, next: { revalidate: 60 } });
  if (!firstRes.ok) {
     throw new Error(`Failed to fetch Zapmail accounts page 1: ${await firstRes.text()}`);
  }
  const firstData = await firstRes.json();
  let accounts: any[] = firstData.data || [];
  const totalPages = firstData.pagination?.totalPages || 1;

  // Fetch remaining pages concurrently to prevent Vercel Serverless Timeouts
  if (totalPages > 1) {
    const pagePromises = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(
        fetch(`${BASE_URL}/v2/onebox/connected-accounts?page=${p}&limit=100`, { headers, next: { revalidate: 60 } })
          .then(res => res.json())
          .then(data => data.data || [])
          .catch(err => {
             console.error(`Failed fetching page ${p}:`, err);
             return [];
          })
      );
    }
    const pagesResults = await Promise.all(pagePromises);
    pagesResults.forEach(pageAccounts => {
       accounts = accounts.concat(pageAccounts);
    });
  }

  // 2. Fetch subscriptions
  let subscriptionsData: any[] = [];
  try {
      const subRes = await fetch(`${BASE_URL}/v2/subscriptions`, { headers, next: { revalidate: 60 } });
      if (subRes.ok) {
          const subJson = await subRes.json();
          subscriptionsData = subJson.data || [];
      }
  } catch (error) {
      console.error("Failed to fetch Zapmail subscriptions:", error);
  }

  // 3. Process Account Data
  const domainsMap = new Map<string, ZapmailDomainStats>();
  
  accounts.forEach((acc: any) => {
    const email = acc.emailAccount || "";
    const status = acc.status || "unknown";
    
    if (email.includes("@")) {
      const domain = email.split("@")[1].toLowerCase().trim();
      if (!domainsMap.has(domain)) {
        domainsMap.set(domain, {
          domain,
          totalAccounts: 0,
          activeAccounts: 0,
          disconnectedAccounts: 0,
          pausedAccounts: 0
        });
      }
      
      const stats = domainsMap.get(domain)!;
      stats.totalAccounts += 1;
      
      if (status === "active" || status === "ACTIVE") stats.activeAccounts += 1;
      else if (status === "disconnected" || status === "DISCONNECTED") stats.disconnectedAccounts += 1;
      else stats.pausedAccounts += 1;
    }
  });

  const domains = Array.from(domainsMap.values()).sort((a, b) => b.totalAccounts - a.totalAccounts);
  const totalDisconnected = domains.reduce((sum, d) => sum + d.disconnectedAccounts, 0);

  // 4. Process Subscriptions
  let totalMRR = 0;
  const subscriptions: ZapmailSubscription[] = [];

  subscriptionsData.forEach((sub: any) => {
    if (sub.subscriptionStatus === "ACTIVE" || sub.subscriptionStatus === "active") {
      const cost = parseFloat(sub.price || 0);
      totalMRR += cost;
      
      const rawDate = sub.periodEnd || "N/A";
      const nextPayment = rawDate !== "N/A" ? rawDate.substring(0, 10) : rawDate;
      
      subscriptions.push({
        id: sub.id || sub.subscriptionId,
        cost,
        currency: "USD",
        nextPayment
      });
    }
  });

  subscriptions.sort((a, b) => a.nextPayment.localeCompare(b.nextPayment));

  return {
    domains,
    subscriptions,
    totalMRR,
    totalDisconnected,
    totalAccounts: accounts.length
  };
}
