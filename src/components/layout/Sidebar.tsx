import Link from "next/link";
import { LayoutDashboard, Megaphone, FileText, Settings, Rocket } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 h-screen border-r border-border bg-card flex flex-col shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <img src="/logo.png" alt="Luxvance Logo" className="h-8 w-auto object-contain mr-3" />
        <span className="font-semibold text-lg tracking-tight">Agency OS</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <Link href="/" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground">
          <LayoutDashboard className="w-4 h-4 mr-3" />
          Dashboard
        </Link>
        <Link href="/campaigns" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors">
          <Megaphone className="w-4 h-4 mr-3" />
          Active Campaigns
        </Link>
        <Link href="/briefs" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors">
          <FileText className="w-4 h-4 mr-3" />
          Brief Generator
        </Link>
      </nav>
      <div className="p-4 border-t border-border">
        <Link href="/settings" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors">
          <Settings className="w-4 h-4 mr-3" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
