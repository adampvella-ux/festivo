import { Suspense } from "react";
import { AppShell } from "@/components/festivo/app-shell";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050810] text-sm text-slate-400">
          Loading Festivo…
        </div>
      }
    >
      <AppShell />
    </Suspense>
  );
}
