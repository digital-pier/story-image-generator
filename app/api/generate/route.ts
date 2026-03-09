import { NextRequest, NextResponse } from "next/server";
import { generateStoryPackage } from "@/lib/generator";
import { StoryInput } from "@/lib/types";

export const runtime = "nodejs";

type GeneratePayload = {
  premise?: string;
  setting?: string;
  tone?: string;
  intensity?: string;
  endingType?: string;
  titleSeed?: string;
  targetMinutes?: number;
  manualWordCount?: number;
};

function parseInput(payload: GeneratePayload): StoryInput {
  const premise = payload.premise?.trim();
  const targetMinutes = Number(payload.targetMinutes);

  if (!premise) {
    throw new Error("Story premise is required.");
  }

  if (!Number.isFinite(targetMinutes) || targetMinutes <= 0) {
    throw new Error("Target video length (minutes) must be greater than 0.");
  }

  const maybeWordCount = payload.manualWordCount;
  const manualWordCount =
    maybeWordCount !== undefined && maybeWordCount !== null && Number(maybeWordCount) > 0
      ? Number(maybeWordCount)
      : undefined;

  return {
    premise,
    setting: payload.setting?.trim() || undefined,
    tone: payload.tone?.trim() || undefined,
    intensity: payload.intensity?.trim() || undefined,
    endingType: payload.endingType?.trim() || undefined,
    titleSeed: payload.titleSeed?.trim() || undefined,
    targetMinutes,
    manualWordCount
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GeneratePayload;
    const input = parseInput(body);
    const storyPackage = await generateStoryPackage(input);
    return NextResponse.json(storyPackage, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate package.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
