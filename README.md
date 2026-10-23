# Meanwhile

A buildless, browser-local UX prototype for therapy debriefs, chosen practice, next-session preparation, and reminder previews. Publish the repository root on a static host such as GitHub Pages.

## Included
- Text capture and simulated three-second voice capture, pause/resume, editable sample transcript, silent playback preview.
- Two-step debrief with an editable takeaway and optional practice item; original words retained.
- Searchable session notes, preparation, custom sections, weekly thoughts, editable appointment and reminder preferences.
- Browser-local persistence and JSON export. Sample data is fictional demonstration content based on the requested use case.

## Deliberate demo boundaries
No microphone audio, transcription service, AI requests, OS notification permissions, or background reminder delivery. The summary gathers saved text; it is not an AI model. Browser storage is not encrypted or a backup. The service worker caches the app shell after the first successful online load. Offline access requires that initial visit and service-worker activation. Real device reminders are future implementation work.

## Next implementation
Use the same static UI in an Android Capacitor project. Store notes and audio locally with an appropriate encryption and backup design. Add native local notifications for session end, chosen practice days, and prep lead time. Reschedule when appointment details change and when alarms are lost or permissions change; account for Europe/London DST, device timezone changes, recurrence exceptions and battery restrictions. Ask for notification permission in context; separately check exact-alarm access where needed. Keep lock-screen content discreet by default, with an explicit detailed-preview opt-in.

Real recording can be local and offline. Cloud transcription/AI requires a connection, user choice to send the selected material, and a backend holding API secrets. Queue optional transcription offline. Do not put API keys or therapy records into the source repository. Never treat a timer running in a browser tab as reliable closed-app scheduling.

## Run and publish

No build step or dependencies. Serve this folder with any static server. On GitHub, open Settings → Pages, choose **Deploy from a branch**, select **main** and **/(root)**, and save. Then open the Pages address GitHub supplies. In a supported Android browser, use Add to Home screen / Install app when offered. The cached interface and saved text can work offline after the initial load; this does not enable background notifications.

Files: `index.html` contains the UI and demo logic; `sw.js` caches app files; `manifest.webmanifest` and the icons provide install metadata. Increment the cache version in `sw.js` when shipping changed assets.
