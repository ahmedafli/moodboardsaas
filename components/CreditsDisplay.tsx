"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/utils/supabase/client";

export default function CreditsDisplay() {
  const [credits, setCredits] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCredits() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setCredits(data.credits);
      }
    }

    // Fetch immediately on mount
    fetchCredits();

    // Setup an interval to poll for changes (useful after generating an image)
    const interval = setInterval(fetchCredits, 5000);
    return () => clearInterval(interval);
  }, [supabase]);

  if (credits === null) return null;

  return (
    <div className="flex items-center gap-2 bg-indigo-500/10 text-indigo-600 px-4 py-1.5 rounded-full font-bold text-sm border border-indigo-500/20 shadow-sm">
      <Icon icon="lucide:coins" className="text-lg" />
      <span>{credits} Credits</span>
    </div>
  );
}
