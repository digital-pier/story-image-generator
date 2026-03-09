# Anonymous Confession Story Package Generator (Next.js)

Production-ready Next.js app for generating full YouTube suspense/horror confession story packages for faceless channels.

## Features

- Next.js 14 App Router + TypeScript + Tailwind CSS
- API route (`app/api/generate/route.ts`) running on Node runtime
- Story package generation via OpenAI API
- Scene image generation via OpenAI Images API
- Structured API error diagnostics (status/code/type/request_id/context) shown in UI
- Inputs for premise, style controls, duration, and manual word-count override
- Automatic word target formula: `targetMinutes * 145` (130-160 WPM compatible)
- Outputs:
  - Video title
  - Story summary
  - Full story script
  - Narration script (11Labs-ready)
  - YouTube description
  - YouTube tags
  - 3-7 scene cards with image prompts mapped to story beats
  - Project slug
- Copy buttons per section
- Download buttons for:
  - Full JSON package
  - Story TXT
  - Image prompts TXT

## Project Structure

- `app/page.tsx` - main UI
- `app/api/generate/route.ts` - generation endpoint
- `components/StoryForm.tsx` - input form + output rendering + downloads
- `components/OutputSection.tsx` - reusable output card with copy
- `components/SceneCard.tsx` - scene and image prompt card with copy
- `lib/wordcount.ts` - target word count + scene estimates
- `lib/prompts.ts` - prompt builders
- `lib/generator.ts` - OpenAI story generation + OpenAI image generation + validation
- `lib/types.ts` - shared TypeScript interfaces

## Environment

Create `.env.local`:

```bash
cp .env.example .env.local
```

Set your keys:

```env
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_IMAGE_REQUEST_DELAY_MS=250
```

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run start
```

## Hostinger Deployment (Node-Compatible Hosting)

1. Ensure hosting plan supports Node.js apps and lets you run `npm install`, `npm run build`, and `npm run start`.
2. Upload project files (or deploy from Git).
3. Configure environment variables in Hostinger panel:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional)
   - `OPENAI_IMAGE_MODEL` (optional)
   - `OPENAI_IMAGE_REQUEST_DELAY_MS` (optional, default `250`)
   - `NODE_ENV=production`
4. Install dependencies on server:
   ```bash
   npm install
   ```
5. Build app:
   ```bash
   npm run build
   ```
6. Start app:
   ```bash
   npm run start
   ```
7. Point your domain/subdomain to the Node app process and ensure `PORT` is handled by hosting environment.

## API Contract

`POST /api/generate`

Request body:

```json
{
  "premise": "string",
  "setting": "string (optional)",
  "tone": "string (optional)",
  "intensity": "string (optional)",
  "endingType": "string (optional)",
  "titleSeed": "string (optional)",
  "targetMinutes": 10,
  "manualWordCount": 1450
}
```

Response shape matches the required structured package format and includes scene-mapped image prompts plus generated image URLs when image generation succeeds.

## Example Output

See: `examples/sample-output.json`
