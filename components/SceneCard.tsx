"use client";

import { useState } from "react";
import { StoryScene } from "@/lib/types";

interface SceneCardProps {
  scene: StoryScene;
}

export default function SceneCard({ scene }: SceneCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const payload = `Scene ${scene.scene_number}: ${scene.scene_title}\n\nStory Beat:\n${scene.story_text}\n\nImage Prompt:\n${scene.image_prompt}`;
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <article className="rounded-xl border border-line bg-panel/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-base font-semibold text-amber-200">
          Scene {scene.scene_number}: {scene.scene_title}
        </h4>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-line bg-panelSoft px-3 py-1 text-xs font-medium text-slate-100 transition hover:border-cyanGlow"
        >
          {copied ? "Copied" : "Copy Scene"}
        </button>
      </div>
      <p className="mb-3 whitespace-pre-wrap text-sm text-slate-200">{scene.story_text}</p>
      <div className="rounded-md border border-line bg-ink/70 p-3">
        <p className="mb-1 text-xs uppercase tracking-wide text-cyanGlow">Image Prompt</p>
        <p className="text-sm text-slate-200">{scene.image_prompt}</p>
      </div>
      {scene.image_url ? (
        <div className="mt-3 overflow-hidden rounded-md border border-line">
          <img
            src={scene.image_url}
            alt={`Generated scene ${scene.scene_number}`}
            className="h-auto w-full object-cover"
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400">Image generation unavailable for this scene.</p>
      )}
    </article>
  );
}
