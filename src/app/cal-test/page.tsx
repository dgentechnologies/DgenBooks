"use client";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
export default function P() {
  const [d, setD] = useState<Date | undefined>(new Date());
  return (
    <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
      <Calendar mode="single" selected={d} onSelect={setD} />
    </div>
  );
}
