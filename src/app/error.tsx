"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg p-8 text-center text-slate-100">
      <h1 className="text-xl font-semibold text-red-300">Something broke</h1>
      <p className="mt-3 break-words text-sm text-slate-400">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg border border-slate-500 px-4 py-2 text-sm hover:bg-slate-800"
      >
        Try again
      </button>
    </div>
  );
}
