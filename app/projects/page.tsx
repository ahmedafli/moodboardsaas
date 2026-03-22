"use client";

import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface MoodboardEntry {
  moodboardname: string;
  moodboardjson: string;
  createdAt: string;
}

export default function ProjectsPage() {
  const [moodboards, setMoodboards] = useState<MoodboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchMoodboards = async () => {
      try {
        const webhookUrl = process.env.NEXT_PUBLIC_OPEN_MOODBOARD_WEBHOOK as string;
        const response = await fetch(webhookUrl);
        if (response.ok) {
          const data = await response.json();
          setMoodboards(data);
        }
      } catch (error) {
        console.error("Failed to fetch moodboards:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMoodboards();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleOpen = (name: string) => {
    router.push(`/moodboard/${encodeURIComponent(name)}`);
  };

  const handleDelete = (name: string) => {
    // Placeholder — no delete webhook yet
    alert(`Delete functionality for "${name}" coming soon.`);
  };

  return (
    <main className="flex-1 min-h-[120vh] glass-bg rounded-[2.5rem] flex flex-col p-6 md:p-10 lg:p-12 overflow-y-auto relative z-0">
      <div className="flex-1 flex flex-col w-full h-full gap-8 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <span className="bg-amber-100 text-amber-600 p-2.5 rounded-xl">
                <Icon icon="lucide:folder-open" className="text-2xl" />
              </span>
              My Projects
            </h1>
            <p className="text-gray-500 mt-2 text-sm ml-1">
              Browse and manage your saved moodboards
            </p>
          </div>

          <button
            onClick={() => router.push("/moodboard")}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all"
          >
            <Icon icon="lucide:plus" className="text-lg" />
            New Moodboard
          </button>
        </div>

        {/* Content */}
        <div className="w-full bg-white/40 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-lg border border-white/60">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-24 gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-200 rounded-full blur animate-ping opacity-50"></div>
                <Icon icon="lucide:loader-2" className="animate-spin text-5xl text-amber-500 relative z-10" />
              </div>
              <p className="text-gray-500 font-medium animate-pulse">Loading projects...</p>
            </div>
          ) : moodboards.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-white/60 shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 backdrop-blur-md">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">
                      Moodboard Name
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">
                      Date Created
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {moodboards.map((mb, index) => {
                    // Parse JSON to get item count
                    let itemCount = 0;
                    try {
                      const items = JSON.parse(mb.moodboardjson);
                      itemCount = Array.isArray(items) ? items.length : 0;
                    } catch { /* ignore */ }

                    return (
                      <tr key={index} className="bg-white/60 hover:bg-indigo-50/40 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Icon icon="lucide:layout-dashboard" className="text-lg text-violet-500" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{mb.moodboardname}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{itemCount} {itemCount === 1 ? "item" : "items"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Icon icon="lucide:calendar" className="text-gray-400 text-base" />
                            {formatDate(mb.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpen(mb.moodboardname)}
                              className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-lg font-semibold transition-all"
                            >
                              <Icon icon="lucide:external-link" className="text-sm" />
                              Open
                            </button>
                            <button
                              onClick={() => handleDelete(mb.moodboardname)}
                              className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Icon icon="lucide:trash-2" className="text-sm" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-white flex flex-col items-center justify-center py-20 px-4 text-center shadow-inner">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                <Icon icon="lucide:folder-open" className="text-5xl text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">No Projects Yet</h3>
              <p className="text-gray-500 max-w-sm mb-6">
                Create your first moodboard to see it here.
              </p>
              <button
                onClick={() => router.push("/moodboard")}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all"
              >
                <Icon icon="lucide:plus" className="text-lg" />
                New Moodboard
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
