# Meanwhile

A personal therapy companion with a local notebook, voice capture and on-request AI.

## Included

Dashboard, next-session preparation and answers, talking points, reflection responses, 155 optional About Me prompts, appearance and AI preferences, searchable history and JSON export. Existing v0.2 notes and preparation migrate without deleting the old fields. Notes are not synced between devices.

## Live AI backend (v0.3)

The repository now contains a Cloudflare Worker (`worker/index.js`) and real browser audio capture (`ai.js`). Browser notification previews remain previews; the Android package adds local phone notifications as described below.

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

## Android app (v0.4)

`capacitor.config.json` packages the local web assets as **Meanwhile** (`uk.co.nikkiradz.meanwhile`). The app uses the same Cloudflare AI backend; no API key or app password is embedded in the APK.

### Phone permissions and reminders
In the installed app, tap the initial → **Phone permissions**:
1. **Enable notifications**, then allow Android's notification prompt.
2. **Allow precise timing**, then allow Alarms & reminders in Android settings if offered.
3. **Send a test reminder** and check for it after about ten seconds. Android can delay inexact notifications; Do Not Disturb and battery restrictions can affect banners.
4. Set the appointment and reminder choices below. The scheduled count confirms how many future reminders the plugin retained.

Microphone permission is requested on the first real recording. The app requests no contacts, location, or broad photo/storage access. File exports use Android's share sheet from app cache. Device backups are disabled for this personal notebook; export notes and download important audio yourself.

Local reminders are scheduled for an eight-week rolling horizon, refreshed on edits and app reopen/resume. They include session-end debrief/preparation, selected practice weekdays, and the configured pre-session lead time. Disabled or changed reminders replace old alarms. The planner uses dated local times across daylight-saving changes; reopen the app after travel/timezone changes. Android force-stop can suppress reminders until reopening. The Local Notifications plugin restores stored alarms after supported device reboots. Native delivery still needs confirmation on the actual phone.

Discreet mode uses generic notification text. Detailed mode can show current talking points; future sessions use generic preparation text rather than recycling today's talking points. Notification taps open preparation/history or start a debrief.

### Move notes from the website
Website and app storage are separate. Export the JSON from website Settings, then use **Import notes file** in the installed app. The import offers a preview and retains the previous notebook for undo. Recordings are not in the JSON export; download/share them separately. AI sign-in and notification permission remain device-specific. A native Preferences snapshot supplements WebView notebook storage, but it is not encryption or an off-device backup.

### Build and update
- `npm ci`
- `npm run android:sync`
- Open `android/` in Android Studio 2025.2.1+ with Java 21 / Android SDK 36, or run `android/gradlew assembleRelease` from an appropriate Android environment.
- GitHub Actions → **Build Android app** compiles an unsigned APK on pushes affecting app code. It does not receive signing credentials or AI secrets. Download the `meanwhile-unsigned-apk` artifact, then align/sign it with the retained private update key before installing. An unsigned artifact is not installable.

A signed personal APK can be installed directly without a Play Store listing. Future updates must use the same app ID and signing key and a higher versionCode; keep the private update backup. Do not uninstall the app to update it, as that deletes its local data. APK builds embed a snapshot of the frontend: Cloudflare backend changes apply immediately, but frontend changes need a new app build.

## Encrypted cloud backup (v0.5)

Cloudflare setup: create a **private R2 bucket** named `meanwhile-backups` in the same account. Leave r2.dev/public access and custom domains disabled. `wrangler.jsonc` binds it to this Worker as `BACKUPS`; deploy the latest main commit after creating it. If configuring manually, Workers & Pages → meanwhile → Bindings → Add → R2 bucket: variable `BACKUPS`, bucket `meanwhile-backups`, then redeploy. No R2 access key or new OpenAI key is needed. `/api/health` adds `backupConfigured`.

In Settings → Cloud backup, sign in using the existing Meanwhile app password, then unlock using a separate recovery password (16+ characters). Save that recovery password yourself: there is no recovery/reset for already encrypted data. The password and derived key stay in memory; locking or restarting locks backups. AES-256-GCM with fresh random IVs encrypts on the device; PBKDF2-SHA256 uses 600,000 iterations and a random salt. Cloudflare sees encrypted object sizes and timestamps. Local notes/audio remain unencrypted on the device.

Back up now saves notebook text, preferences, About Me, dated sessions/preparation/reflections and all locally saved recordings/transcripts. Sign-in tokens, app passwords, recovery passwords and signing keys are excluded. Audio uploads are deduplicated by salted content hash, snapshots have unique immutable per-device keys, and read-back is required before success. An empty installation never replaces or creates an empty snapshot. Enabling automatic backups saves after a 15-second pause in changes while the app is open, signed in and unlocked; it does not run as an Android background job. Reconnect/reopen and unlock to resume.

Restore previews a chosen dated snapshot and decrypts/validates its recordings before changing the notebook. It retains the current notebook under Undo last notebook import, preserves local notification permission/AI consent, and adds recordings without removing other local audio. Conflicting audio with the same ID aborts restoration. Notebook changes made during download abort restore. Per-object limits are 8 MB encrypted text and 24 MB audio (+ encryption header); restore supports up to 250 MB audio. Backups currently retain all snapshots and audio, so storage grows; older objects can be managed in R2, but deleting shared clips can break snapshots that reference them. This is single-owner backup/restore, not multi-device live sync.

The updated Android APK uses versionCode 5 and the existing signing identity. Install over the previous app without uninstalling. New cloud functionality requires that new APK; the website updates through Cloudflare deployment. Test backup and restore with sample notes/audio after the bucket is bound. Local automated tests mock R2/provider services; production R2 and physical-device checks are still required.

## App update prompt (v0.6)

The Android app checks the public `app-update.json` in this repository on launch, return to the foreground (at most once per hour), and Settings → App updates → Check for updates. A newer Android build number shows a dismissible banner and a Download update button. Download opens the phone browser; Android still requires the user to open/approve the APK. The app requests no silent-install permission. Offline check failures leave the notebook usable.

Publish a new update only after compiling, signing with the existing private key, verifying its signature and incrementing versionCode. Commit the verified signed installer as `downloads/Meanwhile-VERSION.apk`, then publish `app-update.json` with appId `uk.co.nikkiradz.meanwhile`, platform `android`, version, integer build, SHA-256, short notes, and the matching raw.githubusercontent.com URL. Publish installer and manifest in one commit after the build is complete. The client accepts only this repository's exact HTTPS download path and offers only higher build numbers. Android verifies package signing when installing. Never publish a signing key, password, therapy notes, or an unsigned APK. The public installer contains app code only, no backend secrets or user data. A successful unsigned GitHub Actions build alone does not announce an update.

Existing v0.4/v0.5 installations need to install v0.6 once to gain the updater. Future frontend changes still require a newly signed APK and published release metadata; the prompt does not hot-swap web assets.
