"use client";

import { FormEvent, useMemo, useState } from "react";
import OutputSection from "@/components/OutputSection";
import SceneCard from "@/components/SceneCard";
import { ProviderErrorDetails, StoryPackage } from "@/lib/types";

type FormState = {
  premise: string;
  setting: string;
  tone: string;
  intensity: string;
  endingType: string;
  titleSeed: string;
  targetMinutes: string;
  manualWordCount: string;
};

const toneOptions = [
  "Dark and unsettling",
  "Slow-burn suspense",
  "Paranoid and claustrophobic",
  "Melancholic mystery",
  "Fast-paced thriller"
];

const intensityOptions = [
  "Low simmer",
  "Moderate tension",
  "High tension",
  "Relentless suspense",
  "Maximum dread"
];

const endingTypeOptions = [
  "Twist reveal",
  "Ambiguous cliffhanger",
  "Quiet unsettling ending",
  "Karmic consequence",
  "Open-ended warning"
];

const initialForm: FormState = {
  premise: "",
  setting: "",
  tone: "",
  intensity: "",
  endingType: "",
  titleSeed: "",
  targetMinutes: "10",
  manualWordCount: ""
};

function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function StoryForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<StoryPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ProviderErrorDetails | null>(null);

  const estimatedWords = useMemo(() => {
    if (form.manualWordCount.trim()) {
      return Number(form.manualWordCount);
    }

    const minutes = Number(form.targetMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return 0;
    return Math.round(minutes * 145);
  }, [form.manualWordCount, form.targetMinutes]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          premise: form.premise,
          setting: form.setting,
          tone: form.tone,
          intensity: form.intensity,
          endingType: form.endingType,
          titleSeed: form.titleSeed,
          targetMinutes: Number(form.targetMinutes),
          manualWordCount: form.manualWordCount ? Number(form.manualWordCount) : undefined
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Failed to generate story package.");
        setErrorDetails((payload.details as ProviderErrorDetails | undefined) || null);
        setResult(null);
        return;
      }

      setResult(payload as StoryPackage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error occurred.");
      setErrorDetails(null);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  function downloadJsonPackage() {
    if (!result) return;
    downloadBlob(`${result.project_slug}.json`, JSON.stringify(result, null, 2), "application/json");
  }

  function downloadStoryTxt() {
    if (!result) return;
    const content = `${result.video_title}\n\nSummary:\n${result.story_summary}\n\nFull Story Script:\n${result.full_story_script}\n\nNarration Script:\n${result.narration_script}`;
    downloadBlob(`${result.project_slug}-story.txt`, content, "text/plain");
  }

  function downloadPromptsTxt() {
    if (!result) return;
    const lines = result.scenes.map(
      (scene) => `Scene ${scene.scene_number} - ${scene.scene_title}\n${scene.image_prompt}`
    );
    downloadBlob(`${result.project_slug}-image-prompts.txt`, lines.join("\n\n"), "text/plain");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-2xl border border-line bg-panel/80 p-6 shadow-horror">
        <p className="mb-2 text-xs uppercase tracking-[0.22em] text-cyanGlow">Faceless Suspense Studio</p>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">
          Anonymous Confession Story Package Generator
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">
          Turn a rough premise into a full script, narration draft, YouTube metadata, and scene-by-scene image
          prompts for horror/suspense storytelling workflows.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-panel/80 p-6 shadow-horror">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-100">Story premise / confession idea *</label>
          <textarea
            required
            value={form.premise}
            onChange={(e) => setForm((prev) => ({ ...prev, premise: e.target.value }))}
            rows={5}
            placeholder="I found an old phone in my apartment building stairwell, and it keeps receiving voice notes from someone who sounds exactly like me..."
            className="w-full rounded-lg border border-line bg-ink/70 px-3 py-2 text-sm text-white outline-none ring-cyanGlow/30 transition focus:ring"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Setting / location"
            value={form.setting}
            onChange={(value) => setForm((p) => ({ ...p, setting: value }))}
          />
          <SelectInput
            label="Tone"
            value={form.tone}
            options={toneOptions}
            onChange={(value) => setForm((p) => ({ ...p, tone: value }))}
          />
          <SelectInput
            label="Intensity"
            value={form.intensity}
            options={intensityOptions}
            onChange={(value) => setForm((p) => ({ ...p, intensity: value }))}
          />
          <SelectInput
            label="Ending type"
            value={form.endingType}
            options={endingTypeOptions}
            onChange={(value) => setForm((p) => ({ ...p, endingType: value }))}
          />
          <Input
            label="Title idea"
            value={form.titleSeed}
            onChange={(value) => setForm((p) => ({ ...p, titleSeed: value }))}
          />
          <Input
            label="Target video length (minutes) *"
            type="number"
            min="1"
            required
            value={form.targetMinutes}
            onChange={(value) => setForm((p) => ({ ...p, targetMinutes: value }))}
          />
          <Input
            label="Manual word count override"
            type="number"
            min="100"
            value={form.manualWordCount}
            onChange={(value) => setForm((p) => ({ ...p, manualWordCount: value }))}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-line bg-ink/60 p-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Estimated target words (default formula: <code>minutes * 145</code>):{" "}
            <span className="font-semibold text-cyanGlow">{Number.isFinite(estimatedWords) ? estimatedWords : 0}</span>
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-gradient-to-r from-cyanGlow to-emerald-300 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Generating package..." : "Generate"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
            <p className="font-medium">{error}</p>
            {errorDetails && (
              <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-md border border-rose-300/30 bg-black/30 p-2 text-xs text-rose-100">
                {JSON.stringify(errorDetails, null, 2)}
              </pre>
            )}
          </div>
        )}
      </form>

      {result && (
        <section className="mt-8 space-y-4">
          {result.warnings && result.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
              <p className="mb-2 font-medium">Generation warnings ({result.warnings.length})</p>
              <pre className="overflow-auto whitespace-pre-wrap rounded-md border border-amber-300/30 bg-black/30 p-2 text-xs">
                {JSON.stringify(result.warnings, null, 2)}
              </pre>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={downloadJsonPackage}
              className="rounded-lg border border-line bg-panel px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-cyanGlow"
            >
              Download Full JSON Package
            </button>
            <button
              type="button"
              onClick={downloadStoryTxt}
              className="rounded-lg border border-line bg-panel px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-cyanGlow"
            >
              Download Story TXT
            </button>
            <button
              type="button"
              onClick={downloadPromptsTxt}
              className="rounded-lg border border-line bg-panel px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-cyanGlow"
            >
              Download Image Prompts TXT
            </button>
          </div>

          <OutputSection title="Video Title" content={result.video_title} />
          <OutputSection title="Project Slug" content={result.project_slug} />
          <OutputSection title="Story Summary" content={result.story_summary} />
          <OutputSection title="Full Story Script" content={result.full_story_script} />
          <OutputSection title="Narration Script" content={result.narration_script} />
          <OutputSection title="YouTube Description" content={result.youtube_description} />
          <OutputSection title="YouTube Tags" content={result.youtube_tags.join(", ")} />

          <section className="rounded-xl border border-line bg-panel/80 p-4 shadow-horror">
            <h3 className="mb-3 text-lg font-semibold text-cyanGlow">Scenes & Image Prompts</h3>
            <div className="space-y-3">
              {result.scenes.map((scene) => (
                <SceneCard key={scene.scene_number} scene={scene} />
              ))}
            </div>
          </section>
        </section>
      )}
    </div>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  required?: boolean;
  min?: string;
}

function Input({ label, value, onChange, type = "text", required, min }: InputProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-200">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-ink/70 px-3 py-2 text-sm text-white outline-none ring-cyanGlow/30 transition focus:ring"
      />
    </label>
  );
}

interface SelectInputProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function SelectInput({ label, value, options, onChange }: SelectInputProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-ink/70 px-3 py-2 text-sm text-white outline-none ring-cyanGlow/30 transition focus:ring"
      >
        <option value="">No preference</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
