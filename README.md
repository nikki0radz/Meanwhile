# Meanwhile

A personal, offline-capable therapy companion prototype. No build step or dependencies: publish this repository root with a static host. On GitHub Pages choose **main / (root)**.

## Current experience
- **Dashboard:** next appointment countdown, latest session debrief, chosen preparation, talking points and expandable searchable history.
- **Next session:** session-specific practice items and answers, talking points, captured thoughts, general preparation and custom sections.
- **Reflections:** optional demo prompts informed by saved excerpts and simple keyword rules; responses remain linked to their originating session. Chosen prompts can be added to talking points.
- **About me:** 155 optional, editable questions across 12 categories. Open answers, yes/no/sometimes/not-sure choices, 1–10 ratings and written context. Search and answer filters; no submission or score.
- **Profile settings:** tap the initial at top right. Light/dark/system appearance, tone, verbosity, emoji preference, summary focus, custom communication instructions and profile-context exclusions.
- **Voice-first capture throughout:** simulated recording, pause/resume, appendable editable sample transcripts and silent playback preview.
- **Debrief flow:** original words → prominent next-session preparation prompt → save. “Choose later” leaves a visible dashboard prompt.
- Weekly appointments roll forward in device-local time. Session preparation remains accessible in history, with an option to carry unfinished practice forward. Editing an appointment copies preparation to the changed date when that date has no preparation yet.

## Data and migration
Data remains in browser localStorage under `meanwhile-v1`. Existing notes, practice, thoughts, preparation and custom sections migrate to session-specific preparation without deleting the old fields. A pre-migration snapshot is saved under `meanwhile-before-v2` when possible. Export includes current notes, background, preferences, reflection responses and preparation history. Browser storage is not encrypted, synced or a backup; clearing it removes the data.

## Demo boundaries
No real audio is recorded. No transcription or AI service is called. Notification settings and previews do not schedule device alerts. Custom AI instructions are saved but cannot be interpreted by the scripted preview. Reflection prompts are not clinical assessments, diagnoses or established patterns.

## Offline and installation
`sw.js` caches the app shell after the first successful online load. Allow service-worker activation before relying on offline loading. Supported Android browsers can offer Add to Home screen / Install app. Installation does not enable background scheduled notifications. Increment the cache name when updating assets. All static paths are relative for repository-based GitHub Pages hosting.

## AI integration boundary
`window.Meanwhile.buildAIContext()` returns preferences, eligible current About Me answers (respecting the master switch and section exclusions), session notes, preparation history and reflection responses. It performs no network request. A future backend should retrieve relevant context within its token budget, use dated sources, distinguish suggestions from observations, and let the user review suggested links. Do not infer a diagnosis or claim a repeating pattern from keyword overlap. Keep API secrets in a backend, never the repository. Add explicit user controls before sending selected personal context to an AI provider.

## Android reminders
The intended native integration is Capacitor local notifications: session-end debrief/preparation, selected practice weekdays, and the configured prep lead time. Request device notification permissions in context; check exact-alarm settings as appropriate. Reschedule after appointment edits, permission changes, reboot, and timezone changes. Keep lock-screen text discreet by default.

## Source files
- `index.html`: app shell
- `styles.css`: responsive light and dark themes
- `questions.js`: stable questionnaire IDs and optional prompts
- `app.js`: local state, migration, scheduling, views and UX demos
- `sw.js`, `manifest.webmanifest`, icons: offline and install metadata

## Validation
JavaScript syntax checked; UI exercised for profile settings, dark mode, mixed answers and voice pause/transcription. State-level checks cover legacy migration, weekly rollover through UK daylight-saving changes, one-off appointments, context exclusions, unique question IDs and HTML escaping.
