"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MoodboardPage from "../page";
import { Icon } from "@iconify/react";

interface CanvasItem {
  id: string;
  image: string;
  productName: string;
  itemCode: string;
  price: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export default function SavedMoodboardPage() {
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const [initialItems, setInitialItems] = useState<CanvasItem[] | null>(null);
  const [isLoadingMoodboard, setIsLoadingMoodboard] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMoodboard = async () => {
      try {
        const response = await fetch("/api/openmoodboard");
        if (!response.ok) throw new Error("Failed to fetch moodboards");
        const data = await response.json();
        const found = data.find(
          (mb: { moodboardname: string }) => mb.moodboardname === name
        );
        if (found) {
          const items: CanvasItem[] = JSON.parse(found.moodboardjson);
          setInitialItems(items);
        } else {
          setError(`Moodboard "${name}" not found.`);
        }
      } catch (err) {
        console.error("Failed to load moodboard:", err);
        setError("Failed to load moodboard. Please try again.");
      } finally {
        setIsLoadingMoodboard(false);
      }
    };
    fetchMoodboard();
  }, [name]);

  if (isLoadingMoodboard) {
    return (
      <main className="flex-1 min-h-[120vh] glass-bg rounded-[2.5rem] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 bg-violet-200 rounded-full blur animate-ping opacity-50"></div>
            <Icon icon="lucide:loader-2" className="animate-spin text-5xl text-violet-500 relative z-10" />
          </div>
          <p className="text-gray-500 font-medium animate-pulse">
            Loading &quot;{name}&quot;...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 min-h-[120vh] glass-bg rounded-[2.5rem] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center">
            <Icon icon="lucide:alert-circle" className="text-4xl text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">{error}</h2>
          <a
            href="/projects"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all mt-2"
          >
            <Icon icon="lucide:arrow-left" className="text-lg" />
            Back to Projects
          </a>
        </div>
      </main>
    );
  }

  return <MoodboardPage initialCanvasItems={initialItems || []} moodboardName={name} />;
}
