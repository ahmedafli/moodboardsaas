"use client";

import { Icon } from "@iconify/react";

export default function Navbar() {
  return (
    <header className="h-16 glass-bg rounded-3xl flex items-center px-8 justify-end gap-6 shrink-0 relative z-40">
      <button
        id="header-logout-btn"
        className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors text-sm font-bold cursor-pointer bg-transparent border-none p-0"
      >
        <Icon icon="lucide:log-out" className="text-lg" />
        <span>Logout</span>
      </button>

      <div className="w-px h-6 bg-slate-200/50"></div>

      <div className="relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
          alt="User avatar"
          className="w-10 h-10 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform"
        />
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
      </div>
    </header>
  );
}
