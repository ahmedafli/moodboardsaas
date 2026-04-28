"use client";

import { useRouter, usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

import CreditsDisplay from "./CreditsDisplay";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [packageName, setPackageName] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fallback to email prefix if they didn't set a display name
        setDisplayName(user.user_metadata?.display_name || user.email?.split("@")[0] || "User");
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPackage() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_credits")
        .select("package")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setPackageName(data?.package ?? null);
      }
    }

    loadPackage();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = "session=; path=/; max-age=0";
    router.push("/login");
  }

  return (
    <header className="h-16 glass-bg rounded-3xl flex items-center justify-between px-8 shrink-0 relative z-40">
      <div className="flex items-center gap-4 min-w-0">
        {pathname === "/inpaint" && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">AI Studio</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-900 truncate">Furniture Placement Generator</span>
          </div>
        )}

        {!!packageName && (
          <div
            className="text-xs font-extrabold tracking-wide uppercase text-indigo-700 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full whitespace-nowrap"
            title={`Package: ${packageName}`}
          >
            {packageName}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 shrink-0">
        <CreditsDisplay />
        <button
          id="header-logout-btn"
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors text-sm font-bold cursor-pointer bg-transparent border-none p-0"
        >
          <Icon icon="lucide:log-out" className="text-lg" />
          <span>Logout</span>
        </button>

        <div className="w-px h-6 bg-slate-200/50"></div>

        <div className="relative group">
          <div className="flex items-center justify-center h-10 px-4 rounded-full bg-slate-800 text-white text-sm font-bold shadow-md cursor-pointer hover:scale-105 transition-transform border-2 border-white">
            {displayName || "..."}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
        </div>
      </div>
    </header>
  );
}

