"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen main-bg text-slate-800 flex overflow-hidden p-4 gap-4">
      <Sidebar />
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <Navbar />
        {children}
      </div>
    </div>
  );
}
