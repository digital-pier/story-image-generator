import { StoryInput } from "./types";

export function buildImagePromptGeneratorPrompt(): string {
  return [
    "Image prompt requirements:",
    "- Create moody cinematic prompts with realistic suspense-horror atmosphere.",
    "- Focus on places and objects: rooms, roads, basements, forests, hallways, windows, doors, cars, phones, notebooks, streetlights, shadows, silhouettes.",
    "- Never center a visible human face.",
    "- If a person is implied, use terms like silhouette, shadow, obscured figure, distant figure, back view.",
    "- Keep style dark, eerie, low saturation, and not gory.",
    "- Make each prompt usable for AI image generation and YouTube thumbnail-style suspense visuals."
  ].join("\n");
}

export function buildStoryPrompt(
  input: StoryInput,
  targetWordCount: number,
  sceneCount: number
): string {
  return `You are creating a production-ready anonymous confession-style YouTube story package.

Return ONLY valid JSON. Do not wrap in markdown.

Content requirements:
- First-person confession/secret tone.
- Believable, emotionally engaging, suspenseful.
- Strong opening hook, gradual tension build, memorable closing line.
- Natural spoken pacing for narration.
- Suitable for suspense/horror storytelling. No explicit sexual content, heavy gore, copyrighted characters, direct imitation of specific creators, or celebrity references.

Generation targets:
- target word count: approximately ${targetWordCount} words.
- scene count: ${sceneCount} scenes.
- image prompts: one per scene, scene-mapped, never exceeding 7.

User inputs:
- premise: ${input.premise}
- setting/location: ${input.setting || "Not specified"}
- tone: ${input.tone || "Not specified"}
- intensity: ${input.intensity || "Not specified"}
- ending type: ${input.endingType || "Not specified"}
- title seed: ${input.titleSeed || "Not specified"}
- target minutes: ${input.targetMinutes}

${buildImagePromptGeneratorPrompt()}

Required JSON shape:
{
  "video_title": "string",
  "story_summary": "string",
  "full_story_script": "string",
  "narration_script": "string",
  "youtube_description": "string",
  "youtube_tags": ["string"],
  "scenes": [
    {
      "scene_number": 1,
      "scene_title": "string",
      "story_text": "string",
      "image_needed": true,
      "image_prompt": "string"
    }
  ]
}

Rules:
- scenes must be between 3 and 7 items.
- scene_number must be sequential starting at 1.
- youtube_tags should include 8-15 relevant tags.
- narration_script should be clean spoken text without visual stage directions.
- youtube_description should include an engaging hook paragraph and a short CTA.`;
}
