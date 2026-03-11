import OpenAI from "openai";
import { buildStoryPrompt } from "./prompts";
import { ProviderErrorDetails, StoryInput, StoryPackage, StoryScene } from "./types";
import { calculateTargetWordCount, clamp, estimateSceneCount } from "./wordcount";

function createSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 72);
}

function cleanText(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];

  const normalized = tags
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean)
    .slice(0, 20);

  return Array.from(new Set(normalized));
}

function splitScriptIntoChunks(script: string, count: number): string[] {
  const words = script.split(/\s+/).filter(Boolean);
  if (words.length === 0) return Array.from({ length: count }, () => "");

  const chunkSize = Math.ceil(words.length / count);
  const chunks: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    chunks.push(words.slice(start, end).join(" ").trim());
  }

  return chunks;
}

function sanitizeImagePrompt(prompt: string): string {
  const withoutFaceMentions = prompt.replace(/\b(face|facial|portrait|close-up face)\b/gi, "obscured silhouette");
  const styleSuffix = "dark cinematic suspense, realistic, low saturation, moody lighting, no gore, no visible face";
  const base = withoutFaceMentions.trim();
  return base.includes("no visible face") ? base : `${base}, ${styleSuffix}`;
}

function normalizeScenes(
  scenes: unknown,
  desiredCount: number,
  fallbackScript: string
): StoryScene[] {
  const incoming = Array.isArray(scenes) ? scenes : [];

  const parsed: StoryScene[] = incoming
    .slice(0, 7)
    .map((scene, index) => {
      const candidate = scene as Partial<StoryScene>;
      return {
        scene_number: index + 1,
        scene_title: cleanText(candidate.scene_title, `Scene ${index + 1}`),
        story_text: cleanText(candidate.story_text),
        image_needed: true,
        image_prompt: sanitizeImagePrompt(
          cleanText(
            candidate.image_prompt,
            "abandoned hallway with flickering light and distant shadow figure"
          )
        )
      };
    })
    .filter((scene) => scene.story_text.length > 0);

  const targetCount = clamp(desiredCount, 3, 7);

  if (parsed.length >= targetCount) {
    return parsed.slice(0, targetCount).map((scene, index) => ({
      ...scene,
      scene_number: index + 1
    }));
  }

  const chunks = splitScriptIntoChunks(fallbackScript, targetCount);
  const filled = [...parsed];

  while (filled.length < targetCount) {
    const index = filled.length;
    filled.push({
      scene_number: index + 1,
      scene_title: `Scene ${index + 1}`,
      story_text: chunks[index] || "",
      image_needed: true,
      image_prompt: sanitizeImagePrompt(
        "lonely street at night, wet asphalt, distant back-view figure near a streetlight"
      )
    });
  }

  return filled;
}

function safeJsonParse(content: string): unknown {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Model returned non-JSON output.");
    }

    return JSON.parse(withoutFence.slice(start, end + 1));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toProviderErrorDetails(error: unknown, context: string): ProviderErrorDetails {
  const maybeError = error as {
    details?: ProviderErrorDetails;
    message?: string;
    status?: number;
    code?: string;
    type?: string;
    param?: string;
    request_id?: string;
    error?: {
      message?: string;
      code?: string;
      type?: string;
      param?: string;
    };
  };

  if (maybeError.details) {
    return maybeError.details;
  }

  const status = typeof maybeError.status === "number" ? maybeError.status : undefined;
  const code =
    typeof maybeError.code === "string"
      ? maybeError.code
      : typeof maybeError.error?.code === "string"
        ? maybeError.error.code
        : undefined;
  const type =
    typeof maybeError.type === "string"
      ? maybeError.type
      : typeof maybeError.error?.type === "string"
        ? maybeError.error.type
        : undefined;
  const param =
    typeof maybeError.param === "string"
      ? maybeError.param
      : typeof maybeError.error?.param === "string"
        ? maybeError.error.param
        : undefined;
  const message =
    cleanText(maybeError.error?.message) ||
    cleanText(maybeError.message) ||
    "An unknown OpenAI error occurred.";

  const retryable = status === 429 || (typeof status === "number" && status >= 500);

  return {
    provider: "openai",
    context,
    message,
    status,
    code,
    type,
    param,
    request_id: cleanText(maybeError.request_id) || undefined,
    retryable
  };
}

function createDetailedError(error: unknown, context: string): Error {
  const details = toProviderErrorDetails(error, context);
  const wrapped = new Error(details.message) as Error & {
    status?: number;
    details?: ProviderErrorDetails;
  };

  wrapped.status = details.status;
  wrapped.details = details;
  return wrapped;
}

async function withOpenAIRetry<T>(
  operation: () => Promise<T>,
  context: string,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const details = toProviderErrorDetails(error, context);
      const retryable = details.status === 429 || (typeof details.status === "number" && details.status >= 500);

      if (!retryable || attempt === maxAttempts) {
        throw createDetailedError(error, context);
      }

      const waitMs = Math.min(2000 * 2 ** (attempt - 1), 12000);
      console.warn("[openai] retrying request", {
        attempt,
        wait_ms: waitMs,
        ...details
      });
      await sleep(waitMs);
    }
  }

  throw createDetailedError(lastError, context);
}

async function generateSceneImages(
  openai: OpenAI,
  scenes: StoryScene[],
  imageModel: string
): Promise<{ scenes: StoryScene[]; warnings: ProviderErrorDetails[] }> {
  const warnings: ProviderErrorDetails[] = [];
  const results: StoryScene[] = [];
  const delayFromEnv = Number(process.env.OPENAI_IMAGE_REQUEST_DELAY_MS);
  const imageRequestDelayMs = Number.isFinite(delayFromEnv)
    ? clamp(delayFromEnv, 0, 5000)
    : 250;
  let sawRateLimit = false;

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    if (imageRequestDelayMs > 0 && i > 0) {
      await sleep(imageRequestDelayMs);
    }

    if (sawRateLimit) {
      results.push(scene);
      continue;
    }

    try {
      const image = await withOpenAIRetry(
        () =>
          openai.images.generate({
            model: imageModel,
            prompt: scene.image_prompt,
            size: "1024x1024"
          }),
        `image_generation_scene_${scene.scene_number}`
      );

      const output = image.data?.[0];

      if (output?.b64_json) {
        results.push({ ...scene, image_url: `data:image/png;base64,${output.b64_json}` });
        continue;
      }

      if (output?.url) {
        results.push({ ...scene, image_url: output.url });
        continue;
      }

      results.push(scene);
    } catch (error) {
      const details = toProviderErrorDetails(error, `image_generation_scene_${scene.scene_number}`);
      warnings.push(details);
      results.push(scene);
      if (details.status === 429) {
        sawRateLimit = true;
      }
      console.error("[generateSceneImages] scene image generation failed", {
        scene_number: scene.scene_number,
        ...details
      });
    }
  }

  return { scenes: results, warnings };
}

export function validateStoryPackage(
  raw: unknown,
  targetMinutes: number,
  estimatedWordCount: number,
  desiredSceneCount: number
): StoryPackage {
  const obj = (raw || {}) as Record<string, unknown>;

  const fullStory = cleanText(obj.full_story_script);
  const narration = cleanText(obj.narration_script, fullStory);
  const title = cleanText(obj.video_title, "Anonymous Confession from the Dark");
  const summary = cleanText(obj.story_summary, "A confession-style suspense story.");
  const description = cleanText(
    obj.youtube_description,
    "An anonymous confession that spirals into a suspenseful mystery."
  );

  if (!fullStory) {
    throw new Error("Generated package did not include a full story script.");
  }

  const scenes = normalizeScenes(obj.scenes, desiredSceneCount, fullStory);

  if (scenes.length < 3 || scenes.length > 7) {
    throw new Error("Generated scenes are outside the required 3-7 range.");
  }

  return {
    project_slug: createSlug(title) || `story-${Date.now()}`,
    video_title: title,
    target_minutes: targetMinutes,
    estimated_word_count: estimatedWordCount,
    story_summary: summary,
    full_story_script: fullStory,
    narration_script: narration,
    youtube_description: description,
    youtube_tags: cleanTags(obj.youtube_tags),
    scenes
  };
}

export async function generateStoryPackage(input: StoryInput): Promise<StoryPackage> {
  const openAiApiKey = process.env.OPENAI_API_KEY;

  console.log(
    "OPENAI KEY:",
    process.env.OPENAI_API_KEY
      ? `${process.env.OPENAI_API_KEY.slice(0, 7)}...${process.env.OPENAI_API_KEY.slice(-4)}`
      : "missing"
  );

  if (!openAiApiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const targetMinutes = clamp(input.targetMinutes, 1, 180);
  const estimatedWordCount = calculateTargetWordCount(targetMinutes);
  const desiredSceneCount = estimateSceneCount(targetMinutes, estimatedWordCount);

  const openai = new OpenAI({ apiKey: openAiApiKey });
  const storyModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const prompt = buildStoryPrompt(input, estimatedWordCount, desiredSceneCount);

  let completion: Awaited<ReturnType<typeof openai.chat.completions.create>>;

  try {
    completion = await withOpenAIRetry(
      () =>
        openai.chat.completions.create({
          model: storyModel,
          temperature: 0.9,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are an expert YouTube suspense/horror story writer and packaging assistant. Return strict JSON only."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        }),
      "story_generation"
    );
  } catch (error) {
    throw error;
  }

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty story response.");
  }

  const raw = safeJsonParse(content);
  const packageWithoutImages = validateStoryPackage(
    raw,
    targetMinutes,
    estimatedWordCount,
    desiredSceneCount
  );

  const { scenes, warnings } = await generateSceneImages(
    openai,
    packageWithoutImages.scenes,
    imageModel
  );

  return {
    ...packageWithoutImages,
    scenes,
    warnings: warnings.length ? warnings : undefined
  };
}
