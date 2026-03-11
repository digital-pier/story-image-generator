import { NextRequest, NextResponse } from "next/server";
import { generateStoryPackage } from "@/lib/generator";
import { ProviderErrorDetails, StoryInput } from "@/lib/types";

export const runtime = "nodejs";

type GeneratePayload = {
  premise?: string;
  title?: string;
  targetMinutes?: number;
};

type DetailedError = Error & {
  status?: number;
  details?: ProviderErrorDetails;
};

function getOpenAIKeyPreview(): string {
  const key = process.env.OPENAI_API_KEY;
  return key ? `${key.slice(0, 7)}...` : "missing";
}

function badRequest(message: string): DetailedError {
  const error = new Error(message) as DetailedError;
  error.status = 400;
  error.details = {
    provider: "app",
    context: "request_validation",
    message,
    status: 400,
    retryable: false
  };
  return error;
}

function parseInput(payload: GeneratePayload): StoryInput {
  const premise = payload.premise?.trim();
  const title = payload.title?.trim();
  const targetMinutes = Number(payload.targetMinutes);

  if (!premise) {
    throw badRequest("Story premise is required.");
  }

  if (!Number.isFinite(targetMinutes) || targetMinutes <= 0) {
    throw badRequest("Target video length (minutes) must be greater than 0.");
  }

  return {
    premise,
    title: title || undefined,
    targetMinutes
  };
}

function toErrorDetails(error: unknown): ProviderErrorDetails {
  const maybeError = error as DetailedError;

  if (maybeError.details) {
    return maybeError.details;
  }

  const message = maybeError.message || "Failed to generate package.";
  const status = typeof maybeError.status === "number" ? maybeError.status : 500;

  return {
    provider: "app",
    context: "api_generate",
    message,
    status,
    retryable: status >= 500
  };
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const body = (await request.json()) as GeneratePayload;
    const input = parseInput(body);

    console.info("[api/generate] request", {
      premise_length: input.premise.length,
      target_minutes: input.targetMinutes,
      has_title: Boolean(input.title)
    });

    const storyPackage = await generateStoryPackage(input);

    console.info("[api/generate] success", {
      duration_ms: Date.now() - start,
      project_slug: storyPackage.project_slug,
      warning_count: storyPackage.warnings?.length || 0
    });

    return NextResponse.json(storyPackage, { status: 200 });
  } catch (error) {
    const details = toErrorDetails(error);
    const detailsWithKeyPreview: ProviderErrorDetails = {
      ...details,
      api_key_preview: getOpenAIKeyPreview()
    };
    const status = typeof details.status === "number" ? details.status : 500;
    const maybeError = error as { message?: string; stack?: string };

    console.error("[api/generate] failed", {
      duration_ms: Date.now() - start,
      ...detailsWithKeyPreview
    });
    console.error("[api/generate] explicit error details", {
      status,
      details_json: JSON.stringify(detailsWithKeyPreview),
      raw_message: maybeError.message,
      raw_stack: maybeError.stack
    });

    return NextResponse.json(
      {
        error: details.message,
        details: detailsWithKeyPreview
      },
      { status }
    );
  }
}
