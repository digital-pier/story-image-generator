export interface StoryInput {
  premise: string;
  setting?: string;
  tone?: string;
  intensity?: string;
  endingType?: string;
  titleSeed?: string;
  targetMinutes: number;
  manualWordCount?: number;
}

export interface StoryScene {
  scene_number: number;
  scene_title: string;
  story_text: string;
  image_needed: boolean;
  image_prompt: string;
  image_url?: string;
}

export interface ProviderErrorDetails {
  provider: "openai" | "app";
  context: string;
  message: string;
  status?: number;
  code?: string;
  type?: string;
  param?: string;
  request_id?: string;
  retryable?: boolean;
  api_key_preview?: string;
}

export interface StoryPackage {
  project_slug: string;
  video_title: string;
  target_minutes: number;
  estimated_word_count: number;
  story_summary: string;
  full_story_script: string;
  narration_script: string;
  youtube_description: string;
  youtube_tags: string[];
  scenes: StoryScene[];
  warnings?: ProviderErrorDetails[];
}
