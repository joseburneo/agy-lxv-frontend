"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Megaphone, FileText, Settings, Server } from "lucide-react";
import { SyncButton } from "@/components/SyncButton";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen border-r border-border bg-card flex flex-col shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <img src="/logo.png" alt="Luxvance Logo" className="h-8 w-auto object-contain mr-3" />
        <span className="font-semibold text-lg tracking-tight">Agency OS</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <Link 
          href="/" 
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            pathname === "/" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mr-3" />
          Dashboard
        </Link>
        <Link 
          href="/campaigns" 
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            pathname?.startsWith("/campaigns") ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          }`}
        >
          <Megaphone className="w-4 h-4 mr-3" />
          Campaign Monitor
        </Link>
        <Link 
          href="/briefs" 
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            pathname?.startsWith("/briefs") ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          }`}
        >
          <FileText className="w-4 h-4 mr-3" />
          Brief Generator
        </Link>
        <Link 
          href="/infrastructure" 
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            pathname?.startsWith("/infrastructure") ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          }`}
        >
          <Server className="w-4 h-4 mr-3" />
          Infrastructure
        </Link>
      </nav>
      <div className="p-4 border-t border-border space-y-1">
        <SyncButton />
        <Link 
          href="/settings" 
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            pathname?.startsWith("/settings") ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          }`}
        >
          <Settings className="w-4 h-4 mr-3" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
