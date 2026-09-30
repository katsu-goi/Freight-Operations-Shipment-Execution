"use client";

import { useState } from "react";
import type { AiTrainingExample, AiTrainingJob } from "@/types";

export default function TrainingClient({
  initialExamples,
  initialJobs,
}: {
  initialExamples: AiTrainingExample[];
  initialJobs: AiTrainingJob[];
}) {
  const [examples, setExamples] = useState(initialExamples);
  const [jobs, setJobs] = useState(initialJobs);
  const [kind, setKind] = useState<"routing" | "bol_parse">("routing");
  const [input, setInput] = useState("");
  const [expected, setExpected] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submitExample(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ai/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, input, expectedOutput: expected, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save example");
      setExamples((prev) => [data.example, ...prev].slice(0, 50));
      setInput("");
      setExpected("");
      setNotes("");
      setMsg(`Saved correction #${examples.length + 1}. It will be used as AI context from now on.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to save example");
    } finally {
      setBusy(false);
    }
  }

  async function runTraining() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ai/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Training run failed");
      setJobs((prev) => [data.job, ...prev].slice(0, 20));
      setMsg(`Training snapshot completed with ${data.job.example_count} active examples.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Training run failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Add a correction</h2>
        <p className="text-xs text-slate-500 mb-4">Paste the original input + the correct output.</p>
        <form onSubmit={submitExample} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-500">
            Task
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "routing" | "bol_parse")}
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-2 text-slate-900 dark:text-white [&>option]:text-slate-900"
            >
              <option value="routing">Route recommendation</option>
              <option value="bol_parse">Bill of Lading parse</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-500">
            Original input
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
              minLength={10}
              rows={4}
              placeholder="e.g. Origin Manila → Davao, 8000kg Road…"
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-500">
            Correct output (JSON or text)
            <textarea
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              required
              rows={4}
              placeholder='e.g. {"routes":[…]} or corrected BoL fields'
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-500">
            Notes (optional)
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why this correction matters"
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </label>
          {msg && <p className="text-xs text-slate-500 dark:text-slate-400">{msg}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-60 px-4 py-2.5 text-xs font-bold text-white transition cursor-pointer"
            >
              {busy ? "Saving…" : "Save correction"}
            </button>
            <button
              type="button"
              onClick={runTraining}
              disabled={busy}
              className="rounded-xl bg-slate-900 hover:bg-slate-700 dark:bg-white dark:text-slate-900 px-4 py-2.5 text-xs font-bold text-white transition cursor-pointer disabled:opacity-60"
            >
              Run training
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Training jobs ({jobs.length})
          </h2>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {jobs.map((j) => (
              <div key={j.id} className="text-xs rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
                <span className="font-bold">{j.status}</span> · {j.example_count} examples ·{" "}
                {String(j.created_at).slice(0, 16).replace("T", " ")}
                <p className="text-slate-500 mt-0.5">{j.summary}</p>
              </div>
            ))}
            {jobs.length === 0 && <p className="text-xs text-slate-400">No training runs yet.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Learned examples ({examples.length})
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {examples.map((e) => (
              <div key={e.id} className="text-xs rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
                <span className="font-mono font-bold">[{e.kind}]</span>{" "}
                {e.input.slice(0, 120)}
                {e.input.length > 120 ? "…" : ""}
              </div>
            ))}
            {examples.length === 0 && <p className="text-xs text-slate-400">No corrections yet — add the first one.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
