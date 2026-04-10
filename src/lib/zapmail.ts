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

  // 1. Fetch all connected accounts
  let accounts: any[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = `${BASE_URL}/v2/onebox/connected-accounts?page=${page}&limit=50`;
    const res = await fetch(url, { headers, next: { revalidate: 60 } }); // Cache for 60 seconds
    
    if (!res.ok) {
        console.error(`Failed to fetch Zapmail accounts page ${page}`, await res.text());
        break; // stop on error
    }
    
    const data = await res.json();
    accounts = accounts.concat(data.data || []);
    
    hasNextPage = !!data.pagination?.hasNextPage;
    if (hasNextPage) page++;
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
      
      if (status === "active") stats.activeAccounts += 1;
      else if (status === "disconnected") stats.disconnectedAccounts += 1;
      else stats.pausedAccounts += 1;
    }
  });

  const domains = Array.from(domainsMap.values()).sort((a, b) => b.totalAccounts - a.totalAccounts);
  const totalDisconnected = domains.reduce((sum, d) => sum + d.disconnectedAccounts, 0);

  // 4. Process Subscriptions
  let totalMRR = 0;
  const subscriptions: ZapmailSubscription[] = [];

  subscriptionsData.forEach((sub: any) => {
    if (sub.status === "active") {
      const cost = parseFloat(sub.amount || 0);
      totalMRR += cost;
      
      const rawDate = sub.currentPeriodEnd || "N/A";
      // ensure we just get YYYY-MM-DD
      const nextPayment = rawDate !== "N/A" ? rawDate.substring(0, 10) : rawDate;
      
      subscriptions.push({
        id: sub.id,
        cost,
        currency: (sub.currency || "usd").toUpperCase(),
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
