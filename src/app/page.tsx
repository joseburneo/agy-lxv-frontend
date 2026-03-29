import { BarChart3, Mail, Users, MousePointerClick } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground mt-1 text-sm">Welcome to the Agency OS backend interface.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Active Campaigns</h3>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground mt-1">+2 from last month</p>
        </div>

        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Emails Sent</h3>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">45,231</div>
          <p className="text-xs text-muted-foreground mt-1">+12.5% from last month</p>
        </div>

        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Opportunities</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">143</div>
          <p className="text-xs text-muted-foreground mt-1">+19.0% from last month</p>
        </div>

        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Avg Open Rate</h3>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">68.2%</div>
          <p className="text-xs text-muted-foreground mt-1">+2.4% from last month</p>
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
            {/* Placeholder for chart or list */}
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
             <button className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
               Generate Brief
             </button>
             <button className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
               Sync Instantly Data
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
