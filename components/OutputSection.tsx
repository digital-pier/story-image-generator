"use client";

import { useState } from "react";

interface OutputSectionProps {
  title: string;
  content: string;
}

export default function OutputSection({ title, content }: OutputSectionProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <section className="rounded-xl border border-line bg-panel/80 p-4 shadow-horror">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-cyanGlow">{title}</h3>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-line bg-panelSoft px-3 py-1 text-sm font-medium text-slate-200 transition hover:border-cyanGlow hover:text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{content}</pre>
    </section>
  );
}
