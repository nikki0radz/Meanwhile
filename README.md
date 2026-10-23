# Meanwhile

A personal therapy companion with a local notebook, voice capture and on-request AI.

## Included

Dashboard, next-session preparation and answers, talking points, reflection responses, 155 optional About Me prompts, appearance and AI preferences, searchable history and JSON export. Existing v0.2 notes and preparation migrate without deleting the old fields. Notes are not synced between devices.

## Live AI backend (v0.3)

The repository now contains a Cloudflare Worker (`worker/index.js`) and real browser audio capture (`ai.js`). Notification previews are still previews: native Android notification delivery is the next packaging step.

### Cloudflare deployment
1. Keep the existing Worker **meanwhile**, connected to this repository.
2. In **Settings → Variables and Secrets**, add these as **Secrets**:
   - `OPENAI_API_KEY`: your OpenAI API key (already added).
   - `APP_PASSWORD`: a unique, preferably randomly generated app password of at least 16 characters. This protects paid AI endpoints. Do not use your Cloudflare, email or OpenAI account password; do not commit it.
3. Deploy the latest main commit. The repository's `wrangler.jsonc` sets the Worker entrypoint, builds a strict allowlist of browser assets into `public/`, enables `workers.dev`, and declares both rate-limit bindings. If Workers Builds asks for commands, use **Build command: `npm run build`** and **Deploy command: `npx wrangler deploy`**, with the repository root as the root directory. Wrangler also runs the asset build itself, so a blank build command is fine if the deploy command is already `npx wrangler deploy`.
4. Open `https://meanwhile.nikki0radz.workers.dev/api/health`. It should return `service: meanwhile`, `version: 3`, and `configured: true`. A 404 or HTML response means the old static deployment is still running; inspect the latest build/deploy log.
5. Open the app on the same origin. Tap the initial → **Connect AI**, enter `APP_PASSWORD`, and review the data-sharing text. No OpenAI key is entered into the browser. The signed session stays on this device for up to seven days. Changing `APP_PASSWORD` invalidates existing sessions.
6. Test a short recording, then an AI debrief summary or **Reflections → Generate reflections**.

Do not paste real secrets into chat. No secrets are stored in the repository. Cloudflare permissions for adding Secrets remain a user action. Deployment is through the existing Git integration; this repository does not contain Cloudflare account credentials.

### What is real now
- Microphone permission is requested only after pressing Record. Pause/resume uses MediaRecorder; there is no fixed ten-minute timer. Recordings stop at an 18 MB file-size threshold and can be continued with another clip.
- Original audio saves to IndexedDB before transcription. Failed transcription can be retried or the audio downloaded. Closing an active recording attempts to save its audio in **Settings → My recordings**. Abrupt browser/process termination can still interrupt an in-progress recording; this is not a native background recorder.
- Successful transcripts append to the answer; the same clip is not appended twice. All saved audio is accessible in My recordings. Audio is not part of the JSON export: download recordings separately.
- A debrief has an explicit **Generate with AI** button. AI does not overwrite the original debrief or silently assign homework. Its editable summary and proposed preparation remain distinct from what the user chooses.
- Reflections use selected current background answers, dated recent sessions and older sessions selected by keyword relevance, preparation and saved reflection responses. Context is bounded; it is not an exhaustive search or an independent memory service. Disabling profile context or excluding a category keeps those About Me answers out of new requests. Text already manually included in session notes remains part of those notes.
- **Next session → Summarise my preparation** generates a dated, refreshable brief. Source notes remain visible. AI outputs can be inaccurate and are prompts for review, not diagnoses or clinical assessments.
- The existing communication preferences are sent with AI requests. No paid request happens on page load.

### Backend controls and data handling
- Password-authenticated HMAC sessions; strict origin allowlist plus token authentication. CORS alone is not access protection.
- Eight login attempts/minute per client IP and twelve paid requests/minute per owner bucket via Cloudflare rate-limit bindings. These edge limits are not a global hard spending cap.
- Bounded JSON/audio uploads, bounded source text, constrained structured responses and output tokens; unknown actions rejected. Invalid source IDs are removed before displaying source labels.
- OpenAI key stays server-side; provider error bodies and user notes are not logged by application code. Worker observability is disabled in the configuration. Cloudflare and OpenAI still process requested material according to their service policies; this is not a zero-retention guarantee. Responses requests use `store: false`.
- API responses are never cached by the service worker. API tokens are in a separate localStorage key and excluded from note exports. The app password protects AI usage, not encryption or a local lock on saved therapy notes.
- Model variables default to `AI_MODEL=gpt-4.1-mini` and `TRANSCRIPTION_MODEL=gpt-transcribe`. Change them in configuration/Cloudflare if your project has different model access. There is no silent fallback to another model.

### Checks
Run `npm test` for state, authentication, origin, rate-limit, upload, provider-request and recording-controller tests. Provider calls in tests are mocked; they do not spend API credit or send real therapy content. Live provider and Android-device checks require deployment and the user's own environment.
