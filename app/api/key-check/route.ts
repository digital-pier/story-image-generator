import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ProviderErrorDetails } from "@/lib/types";

export const runtime = "nodejs";

type KeyCheckResponse = {
  ok: boolean;
  message: string;
  key_preview: string;
  model: string;
  auth_ok: boolean;
  generation_ok: boolean;
  details?: ProviderErrorDetails;
};

function getOpenAIKeyPreview(): string {
  const key = process.env.OPENAI_API_KEY;
  return key ? `${key.slice(0, 20)}...` : "missing";
}

function isInsufficientQuota(details: {
  code?: string;
  type?: string;
  message?: string;
}): boolean {
  return (
    details.code === "insufficient_quota" ||
    details.type === "insufficient_quota" ||
    /exceeded your current quota/i.test(details.message || "")
  );
}

function toProviderErrorDetails(error: unknown, context: string): ProviderErrorDetails {
  const maybeError = error as {
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
    (typeof maybeError.error?.message === "string" ? maybeError.error.message.trim() : "") ||
    (typeof maybeError.message === "string" ? maybeError.message.trim() : "") ||
    "An unknown OpenAI error occurred.";

  return {
    provider: "openai",
    context,
    message,
    status,
    code,
    type,
    param,
    request_id: maybeError.request_id,
    retryable:
      !isInsufficientQuota({ code, type, message }) &&
      (status === 429 || (typeof status === "number" && status >= 500))
  };
}

export async function POST() {
  const keyPreview = getOpenAIKeyPreview();
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    return NextResponse.json<KeyCheckResponse>({
      ok: false,
      message: "OPENAI_API_KEY is missing.",
      key_preview: keyPreview,
      model,
      auth_ok: false,
      generation_ok: false
    });
  }

  const openai = new OpenAI({ apiKey });

  try {
    await openai.models.list();
  } catch (error) {
    const details = toProviderErrorDetails(error, "key_check_auth");
    return NextResponse.json<KeyCheckResponse>({
      ok: false,
      message: "OpenAI key authentication check failed.",
      key_preview: keyPreview,
      model,
      auth_ok: false,
      generation_ok: false,
      details
    });
  }

  try {
    await openai.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "Return the exact word OK."
        },
        {
          role: "user",
          content: "Confirm."
        }
      ]
    });

    return NextResponse.json<KeyCheckResponse>({
      ok: true,
      message: "API key is valid and generation test succeeded.",
      key_preview: keyPreview,
      model,
      auth_ok: true,
      generation_ok: true
    });
  } catch (error) {
    const details = toProviderErrorDetails(error, "key_check_generation");
    const message = isInsufficientQuota(details)
      ? "Key auth succeeded, but generation failed due to insufficient quota on this project/account."
      : "Key auth succeeded, but generation test failed.";

    return NextResponse.json<KeyCheckResponse>({
      ok: false,
      message,
      key_preview: keyPreview,
      model,
      auth_ok: true,
      generation_ok: false,
      details
    });
  }
}
