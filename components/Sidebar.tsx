"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { id: "nav-collect-data", icon: "lucide:link", href: "/home" },
  { id: "nav-create-moodboard", icon: "lucide:layout-grid", href: "/moodboard" },
  { id: "nav-projects", icon: "lucide:folder-closed", href: "/projects" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 glass-bg rounded-[3rem] flex flex-col items-center py-10 gap-8 shrink-0">
      <div className="sidebar-vertical-text font-bold text-sm tracking-[0.3em] text-slate-800 opacity-80 uppercase mb-4">
        DoubleA
      </div>
      <div className="flex flex-col gap-5">
        {navLinks.map((link) => {
          // Check if active (also matching "/" if it's the home link to be safe)
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/') || (pathname === '/' && link.href === '/home');

          return (
            <Link
              key={link.id}
              href={link.href}
              id={link.id}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isActive
                ? "bg-[#f59e0b] text-white shadow-lg shadow-orange-500/30 scale-105"
                : "bg-white text-slate-500 hover:text-slate-900 shadow-sm border border-white/80 hover:scale-105"
                }`}
            >
              <Icon icon={link.icon} className="text-lg" />
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
