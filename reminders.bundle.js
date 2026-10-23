(() => {
  // reminder-model.js
  var REMINDER_HORIZON_DAYS = 56;
  var MAX_SCHEDULED_NOTIFICATIONS = 400;
  var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var localMinute = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  var num = (v, min, max, f) => Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Math.round(Number(v)))) : f;
  var str = (v, n = 1400) => typeof v === "string" ? v.slice(0, n) : "";
  var id = (v, f) => typeof v === "string" && /^[A-Za-z0-9:_-]{1,200}$/.test(v) ? v : f;
  function notificationId(key) {
    let h = 2166136261;
    for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return 1e4 + (h >>> 0) % 2e9;
  }
  function normalizeReminderConfig(r = {}, now = /* @__PURE__ */ new Date()) {
    const c = r.config || {}, f = c.fallback || {}, seen = /* @__PURE__ */ new Set();
    const rows = (values, kind) => (values || []).slice(0, kind === "custom" ? 200 : 12).filter((x) => x && typeof x === "object").map((x, i) => {
      let key = id(x.id, kind + "-" + i);
      if (seen.has(key)) key = kind + "-" + i;
      seen.add(key);
      return { id: key, enabled: x.enabled !== false, done: !!x.done, minutes: num(x.minutes, 0, 10080, kind === "before" ? 30 : 0), content: ["appointment", "summary", "topics", "debrief", "preparation", "both", "custom"].includes(x.content) ? x.content : kind === "before" ? "appointment" : kind === "after" ? "debrief" : "custom", title: str(x.title, 100), custom: str(x.custom), discreet: x.discreet !== false, repeatCount: num(x.repeatCount, 0, 3, 0), repeatMinutes: num(x.repeatMinutes, 5, 240, 15), at: str(x.at, 30), target: ["prep", "reflections", "debrief"].includes(x.target) ? x.target : kind === "after" ? "debrief" : "prep", taskId: id(x.taskId, ""), sessionId: id(x.sessionId, ""), sessionKey: str(x.sessionKey, 30) };
    });
    return { version: 1, before: rows(Array.isArray(c.before) ? c.before : [{ id: "before-default", enabled: r.brief !== false, minutes: r.lead || 30, content: "topics", discreet: r.private !== false }], "before"), after: rows(Array.isArray(c.after) ? c.after : [{ id: "after-default", enabled: r.debrief !== false, minutes: 0, content: "debrief", discreet: r.private !== false }], "after"), custom: rows(Array.isArray(c.custom) ? c.custom : [], "custom"), snoozeMinutes: num(c.snoozeMinutes, 5, 240, 15), fallback: { mode: ["off", "weekly", "interval", "inactive"].includes(f.mode) ? f.mode : !r.config && r.practice ? "weekly" : "off", weekdays: (Array.isArray(f.weekdays) ? f.weekdays : !r.config ? r.practiceDays || [] : []).filter((x) => weekdays.includes(x)), days: num(f.days, 1, 30, 3), time: /^([01]\d|2[0-3]):[0-5]\d$/.test(f.time || "") ? f.time : /^([01]\d|2[0-3]):[0-5]\d$/.test(r.practiceTime || "") ? r.practiceTime : "18:00", anchor: Number.isFinite(+new Date(f.anchor)) ? f.anchor : now.toISOString(), discreet: f.discreet !== false, custom: str(f.custom) } };
  }
  function reminderMessage(r, kind, data, key, at) {
    if (r.discreet !== false) return { title: "A moment for yourself", body: "Your notes are ready when you are." };
    const c = data.contexts?.[key] || {}, session = new Date(key), minutes = Number.isFinite(+session) ? Math.max(0, Math.round((session - at) / 6e4)) : 0;
    const topics = (c.agenda || []).slice(0, 3).map((x) => x.text).join(" \u2022 "), preparation = (c.tasks || []).filter((x) => !x.done).slice(0, 3).map((x) => x.title).join(" \u2022 ");
    const source = JSON.stringify({ prep: c.prep || "", tasks: c.tasks || [], agenda: c.agenda || [], thoughts: (c.thoughts || []).filter((t) => !t.destination || t.destination === "prep"), sections: c.sections || [] });
    const summary = (c.aiBrief?.source === source ? c.aiBrief.text : "") || topics || preparation || c.prep || "Open your notes to see your preparation.";
    const values = { minutes, summary, talking_points: topics || "Open your talking points.", preparation: preparation || "Open your chosen preparation.", date: Number.isFinite(+session) ? session.toLocaleDateString("en-GB") : "your next session", time: Number.isFinite(+session) ? session.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "" };
    const custom = str(r.custom).replace(/\{(minutes|summary|talking_points|preparation|date|time)\}/g, (_, k) => String(values[k]));
    let title = r.title || (kind === "prep" ? "Your therapy session" : kind === "debrief" ? "A moment after therapy" : "A thought to return to"), body;
    if (kind === "prep") {
      const timing2 = minutes ? `Your therapy appointment is in ${minutes} minutes.` : "Your therapy appointment is starting.";
      body = r.content === "summary" ? timing2 + " " + summary : r.content === "topics" ? timing2 + " Don\u2019t forget: " + (topics || "open your talking points.") : r.content === "custom" ? custom : timing2;
    } else if (kind === "debrief") body = r.content === "preparation" ? "What would you like to prepare before next time?" : r.content === "both" ? "What stayed with you? Debrief your session, then choose what to prepare before next time." : r.content === "custom" ? custom : "What stayed with you? Capture a debrief while it is fresh.";
    else body = custom || preparation || "Return to the preparation you chose. Open your notes when you are ready.";
    return { title: title.slice(0, 100), body: body.slice(0, 1400) };
  }
  function buildConfiguredReminderPlan(data, now = /* @__PURE__ */ new Date()) {
    if (!data.reminders?.nativeEnabled) return [];
    const c = normalizeReminderConfig(data.reminders, now), end = new Date(now);
    end.setDate(end.getDate() + REMINDER_HORIZON_DAYS);
    const plan = [];
    const add = (r, kind, at, key, group2, base, limit) => {
      if (!r.enabled || r.done || !Number.isFinite(+at)) return;
      if (r.taskId) {
        const task = Object.values(data.contexts || {}).flatMap((x) => x.tasks || []).find((t) => t.id === r.taskId);
        if (!task || task.done) return;
      }
      for (let i = 0; i <= (r.repeatCount || 0); i++) {
        const time = new Date(+at + i * (r.repeatMinutes || 15) * 6e4);
        if (time <= now || time > end || limit && time >= limit) continue;
        plan.push({ id: notificationId(`${group2}:${r.id}:${base || +at}:${i}`), ...reminderMessage(r, kind, data, key, time), at: time, kind, sessionKey: key, ruleId: r.id, taskId: r.taskId || "", target: r.target || (kind === "debrief" ? "debrief" : "prep"), discreet: r.discreet !== false });
      }
    };
    const seed = new Date(data.appointment), duration = Number(data.duration);
    if (Number.isFinite(+seed) && duration >= 10 && duration <= 240) {
      let session = new Date(seed);
      if (data.weekly) {
        session.setDate(seed.getDate() + Math.floor((now - seed) / (7 * 864e5)) * 7);
        while (+session + duration * 6e4 + 10080 * 6e4 < +now) session.setDate(session.getDate() + 7);
      }
      let count = 0;
      while (session <= end && count++ < 30) {
        const key = localMinute(session);
        for (const r of c.before) add(r, "prep", new Date(+session - r.minutes * 6e4), key, "before", +session, +session);
        for (const r of c.after) add(r, "debrief", new Date(+session + (duration + r.minutes) * 6e4), key, "after", +session);
        if (!data.weekly) break;
        session.setDate(session.getDate() + 7);
      }
    }
    for (const r of c.custom) add(r, "practice", new Date(r.at), r.sessionKey || data.currentKey, "custom");
    const unplanned = (data.contexts?.[data.currentKey]?.tasks || []).filter((t) => !t.done && !c.custom.some((r) => r.enabled && !r.done && r.taskId === t.id && +new Date(r.at) + r.repeatCount * r.repeatMinutes * 6e4 > +now)), f = c.fallback;
    if (unplanned.length && f.mode !== "off") {
      const [h, m] = f.time.split(":").map(Number), r = { id: "fallback", enabled: true, discreet: f.discreet, custom: f.custom || unplanned.slice(0, 3).map((x) => x.title).join(" \u2022 "), content: "custom", target: "prep" };
      let day;
      if (f.mode === "weekly") {
        day = new Date(now);
        day.setHours(h, m, 0, 0);
        for (let i = 0; i <= REMINDER_HORIZON_DAYS; i++) {
          if (f.weekdays.includes(weekdays[day.getDay()])) add(r, "practice", new Date(day), data.currentKey, "fallback");
          day.setDate(day.getDate() + 1);
        }
      } else {
        const origin = new Date(f.mode === "inactive" ? data.lastOpenedAt || now : f.anchor);
        day = new Date(origin);
        day.setDate(day.getDate() + f.days);
        day.setHours(h, m, 0, 0);
        if (f.mode === "inactive" && day < new Date(+origin + f.days * 864e5)) day.setDate(day.getDate() + 1);
        let n = 0;
        while (day <= end && n++ < 100) {
          add(r, "practice", new Date(day), data.currentKey, "fallback");
          day.setDate(day.getDate() + f.days);
        }
      }
    }
    const seen = /* @__PURE__ */ new Set();
    return plan.sort((a, b) => a.at - b.at).filter((x) => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    }).slice(0, MAX_SCHEDULED_NOTIFICATIONS);
  }

  // reminders-ui.js
  var section = "";
  var known = null;
  var draft = null;
  var group = "";
  var editing = "";
  function config() {
    if (!state.reminders.config || known !== state.reminders.config) {
      known = state.reminders.config = normalizeReminderConfig(state.reminders);
    }
    return known;
  }
  function persistReminder() {
    window.MeanwhileReminderModel.config();
    window.MeanwhileReminders.persist();
  }
  function snapshot() {
    config();
    return { appointment: state.appointment, duration: state.duration, weekly: state.weekly, currentKey: currentKey(), contexts: state.contexts, reminders: { ...state.reminders, nativeEnabled: true }, lastOpenedAt: localStorage.getItem("meanwhile-last-open") };
  }
  function opened() {
    localStorage.setItem("meanwhile-last-open", (/* @__PURE__ */ new Date()).toISOString());
    window.MeanwhileNative?.sync();
  }
  function when(at) {
    const d = new Date(at);
    return Number.isFinite(+d) ? d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Choose a date and time";
  }
  var sections = [["reminders", "\u25F7", "Reminder settings", "Times, messages and individual nudges."], ["notifications", "\u2667", "Notification settings", "Phone permission, precise timing and a test reminder."], ["appearance", "\u25D0", "Appearance settings", "Themes and your accent colour."], ["ai", "\u2727", "AI settings", "How AI communicates, context and connection."], ["profile", "\u25CE", "My profile", "Your background and About Me answers."], ["backup", "\u21A5", "Backup & data", "Encrypted backups, imports and exports."], ["recordings", "\u25C9", "Saved recordings", "Listen, download or transcribe."], ["updates", "\u21BB", "App updates", "Check for a new Android version."]];
  var oldSettings = settingsPage;
  settingsPage = function() {
    const t = document.createElement("template");
    t.innerHTML = oldSettings();
    const cards = new Map([...t.content.querySelectorAll(".settings-stack > .card")].map((c) => [c.querySelector("h2")?.textContent, c.outerHTML]));
    if (!section) return pageHeading("Settings", "Make Meanwhile yours.", "Choose what you\u2019d like to adjust.") + `<div class="settings-menu">${sections.filter(([id2]) => id2 !== "updates" || window.MeanwhileNative?.native).map(([id2, icon, title, sub]) => `<button class="settings-menu-item" onclick="MeanwhileReminders.open('${id2}')"><span class="settings-menu-icon" aria-hidden="true">${icon}</span><span><strong>${title}</strong><span>${sub}</span></span><span aria-hidden="true">\u2197</span></button>`).join("")}</div>`;
    if (section === "reminders") return remindersPage();
    const entry = sections.find(([id2]) => id2 === section);
    const names = { notifications: ["Phone permissions"], appearance: ["Appearance"], ai: ["How I want AI to communicate", "AI connection"], profile: ["Your profile"], backup: ["Cloud backup", "Your data", "Bring your notes with you"], recordings: ["My recordings"], updates: ["App updates"] };
    return subheading(entry[2], entry[3]) + `<div class="settings-stack">${names[section].map((n) => cards.get(n) || "").join("")}</div></div>`;
  };
  var previousGo = go;
  go = function(next) {
    if (next === "settings") section = "";
    previousGo(next);
  };
  function subheading(title, sub) {
    return `<div class="settings-subpage"><button class="link settings-back" onclick="MeanwhileReminders.open('')">\u2190 Settings</button>${pageHeading("Settings", title, sub)}`;
  }
  var labels = { appointment: "Appointment only", summary: "Appointment + summary", topics: "Appointment + talking points", debrief: "Debrief nudge", preparation: "Choose preparation", both: "Debrief + preparation", custom: "My message" };
  var timing = (g) => g === "before" ? "before therapy" : g === "after" ? "after the session ends" : "one-off";
  function item(r, g) {
    const time = g === "custom" ? when(r.at) : r.minutes + " minutes " + timing(g);
    return `<article class="reminder-item ${!r.enabled || r.done ? "reminder-muted" : ""}"><div class="row"><div><h3>${esc(r.title || time)}</h3><p class="small">${r.title ? esc(time) + " \xB7 " : ""}${r.discreet ? "Private message" : labels[r.content]}${r.repeatCount ? ` \xB7 ${r.repeatCount} extra nudge${r.repeatCount > 1 ? "s" : ""}, ${r.repeatMinutes} min apart` : ""}${r.done ? " \xB7 Done" : ""}</p></div><input type="checkbox" aria-label="Enable ${esc(r.title || time)}" ${r.enabled && !r.done ? "checked" : ""} onchange="MeanwhileReminders.enable('${g}','${r.id}',this.checked)"></div><div class="reminder-item-actions"><button class="link" onclick="MeanwhileReminders.edit('${g}','${r.id}')">Edit</button><button class="link" onclick="MeanwhileReminders.preview('${g}','${r.id}')">Preview</button>${g === "custom" ? `<button class="link" onclick="MeanwhileReminders.openContent('${r.id}')">Open</button><button class="link" onclick="MeanwhileReminders.snoozeRule('${r.id}')">Snooze</button><button class="link" onclick="MeanwhileReminders.done('${r.id}')">${r.done ? "Reopen" : "Mark reminder done"}</button>` : ""}<button class="link" onclick="MeanwhileReminders.remove('${g}','${r.id}')">Remove</button></div></article>`;
  }
  function remindersPage() {
    const c = config(), plan = buildConfiguredReminderPlan(snapshot()), f = c.fallback, up = c.custom.filter((r) => !r.done && new Date(r.at) >= /* @__PURE__ */ new Date()), past = c.custom.filter((r) => r.done || !Number.isFinite(+new Date(r.at)) || new Date(r.at) < /* @__PURE__ */ new Date());
    return subheading("Your reminder rhythm", "A nudge at the time you choose, in the words you want.") + `<div class="settings-stack"><div class="notice">${window.MeanwhileNative?.native ? "Enabled reminders schedule local phone notifications when notification permission is allowed." : "Website preview: edit and preview reminders here. Phone delivery needs the next Android app update."}</div>${[["before", "Before therapy", "One reminder or a few. Choose appointment details, your summary, talking points, or your own wording."], ["after", "After therapy", "Times are measured from the end of your appointment."]].map(([g, title, sub]) => `<section class="card"><div class="row"><h2>${title}</h2><button class="secondary" onclick="MeanwhileReminders.edit('${g}')">\uFF0B Add ${c[g].length ? "extra " : ""}reminder</button></div><p class="hint">${sub}</p>${c[g].map((r) => item(r, g)).join("") || '<p class="empty">No reminders here yet.</p>'}</section>`).join("")}<section class="card"><div class="row"><h2>Individual reminders</h2><button class="primary" onclick="MeanwhileReminders.edit('custom')">\uFF0B Add reminder</button></div><p class="hint">Your schedule can change every week. Choose actual dates for a thought, question or something you want to try.</p>${up.map((r) => item(r, "custom")).join("") || '<p class="empty">Nothing scheduled yet.</p>'}${past.length ? `<details class="history-details"><summary>Past & completed (${past.length})</summary>${past.map((r) => item(r, "custom")).join("")}</details>` : ""}</section><section class="card"><h2>If I haven\u2019t chosen a reminder</h2><p class="hint">Optional fallback nudges for unfinished preparation with no individual reminder. They stop when it\u2019s done or gets its own reminder.</p><label class="field"><span>How should I be reminded?</span><select onchange="MeanwhileReminders.fallback('mode',this.value)">${opts([["off", "No automatic fallback"], ["weekly", "On selected weekdays"], ["interval", "Every few days"], ["inactive", "After I haven\u2019t opened the app"]], f.mode)}</select></label>${f.mode === "weekly" ? `<div class="choices">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<button class="choice ${f.weekdays.includes(d) ? "selected" : ""}" aria-pressed="${f.weekdays.includes(d)}" onclick="MeanwhileReminders.day('${d}')">${d}</button>`).join("")}</div>` : ""}${["interval", "inactive"].includes(f.mode) ? `<label class="field"><span>${f.mode === "inactive" ? "Days without opening the app" : "Every how many days?"}</span><input type="number" min="1" max="30" value="${f.days}" onchange="MeanwhileReminders.fallback('days',this.value)"></label>` : ""}${f.mode !== "off" ? `<label class="field"><span>Reminder time</span><input type="time" value="${f.time}" onchange="MeanwhileReminders.fallback('time',this.value)"></label><label class="field"><span>Optional message</span><textarea maxlength="1400" placeholder="Leave blank to use your preparation" onchange="MeanwhileReminders.fallback('custom',this.value)">${esc(f.custom)}</textarea></label><label class="task"><input type="checkbox" ${f.discreet ? "checked" : ""} onchange="MeanwhileReminders.fallback('discreet',this.checked)"><span>Hide personal details in fallback notifications</span></label>` : ""}</section><section class="card"><h2>Snooze & gentle repeats</h2><label class="field"><span>When I tap Snooze, remind me again after</span><select onchange="MeanwhileReminders.snoozeLength(this.value)">${opts([5, 10, 15, 30, 60, 120].map((m) => [String(m), m + " minutes"]), String(c.snoozeMinutes))}</select></label><p class="hint">Each reminder can send up to three extra nudges. These are notifications, not ringing alarms; Android controls sound and vibration.</p><button class="link" onclick="MeanwhileReminders.open('notifications')">Phone notification settings \u2192</button></section><section class="card"><h2>Coming up</h2><p class="hint">${plan.length} planned nudges, refreshed when the app opens or your notes change.</p><details class="history-details"><summary>Preview the next reminders</summary>${plan.slice(0, 12).map((p) => `<div class="history-item"><p class="meta">${esc(when(p.at))}</p><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>`).join("") || "<p>No upcoming reminders.</p>"}</details></section></div></div>`;
  }
  function opts(values, value) {
    return values.map(([v, t]) => `<option value="${v}" ${v === value ? "selected" : ""}>${t}</option>`).join("");
  }
  function fresh(g) {
    return { id: uid(), enabled: true, done: false, minutes: g === "before" ? 30 : 0, content: g === "before" ? "appointment" : g === "after" ? "debrief" : "custom", title: "", custom: "", discreet: true, repeatCount: 0, repeatMinutes: 15, at: "", target: g === "after" ? "debrief" : "prep", taskId: "", sessionId: "", sessionKey: currentKey() };
  }
  function edit(g, id2, options = {}) {
    if (!["before", "after", "custom"].includes(g)) return;
    group = g;
    editing = id2 || "";
    draft = JSON.parse(JSON.stringify(config()[g].find((r) => r.id === id2) || { ...fresh(g), ...options }));
    editor();
  }
  function preview(r, g) {
    const at = g === "before" ? new Date(+(schedule().next || /* @__PURE__ */ new Date()) - Number(r.minutes) * 6e4) : g === "after" ? new Date(+(schedule().next || /* @__PURE__ */ new Date()) + (Number(state.duration) + Number(r.minutes)) * 6e4) : new Date(r.at);
    const n = reminderMessage(r, g === "before" ? "prep" : g === "after" ? "debrief" : "practice", snapshot(), r.sessionKey || currentKey(), at);
    return `<div class="notification-sample"><span class="small">\u274B Meanwhile \xB7 preview</span><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></div>`;
  }
  function editor() {
    const r = draft;
    if (!r) return;
    const contents = group === "before" ? [["appointment", "Appointment time only"], ["summary", "Appointment + preparation summary"], ["topics", "Appointment + talking points"], ["custom", "Write my own message"]] : group === "after" ? [["debrief", "A nudge to debrief"], ["preparation", "Choose what to prepare"], ["both", "Debrief, then choose preparation"], ["custom", "Write my own message"]] : [["custom", "My reminder message"]];
    const tasks = Object.values(state.contexts).flatMap((c) => c.tasks.filter((t) => !t.done));
    showModal(`<div class="eyebrow">${timing(group)}</div><h2>${editing ? "Edit" : "Add"} reminder</h2><label class="field"><span>${group === "custom" ? "When should this appear?" : "How many minutes " + timing(group) + "?"}</span><input id="reminder-time" type="${group === "custom" ? "datetime-local" : "number"}" ${group === "custom" ? `min="${localMinute(/* @__PURE__ */ new Date())}"` : 'min="0" max="10080"'} value="${esc(group === "custom" ? r.at : r.minutes)}" oninput="MeanwhileReminders.draft('${group === "custom" ? "at" : "minutes"}',this.value)"></label>${group === "custom" ? `<div class="choices"><button class="choice" onclick="MeanwhileReminders.quickDate('tomorrow')">Tomorrow</button><button class="choice" onclick="MeanwhileReminders.quickDate('monday')">Next Monday</button></div>` : ""}<label class="field"><span>What should it show?</span><select onchange="MeanwhileReminders.draft('content',this.value,true)">${opts(contents, r.content)}</select></label><label class="field"><span>Optional title</span><input type="text" maxlength="100" value="${esc(r.title)}" oninput="MeanwhileReminders.draft('title',this.value)"></label>${r.content === "custom" ? `<label class="field"><span>Reminder message</span><textarea maxlength="1400" oninput="MeanwhileReminders.draft('custom',this.value)" placeholder="Remind me to\u2026">${esc(r.custom)}</textarea><button class="voice-small" onclick="MeanwhileReminders.voiceMessage()">\u25C9 Say the reminder</button></label><p class="small">Optional placeholders: {minutes}, {summary}, {talking_points}, {preparation}.</p>` : ""}${group === "custom" ? `<label class="field"><span>Open when tapped</span><select onchange="MeanwhileReminders.draft('target',this.value)">${opts([["prep", "Next-session preparation"], ["reflections", "Reflections"], ["debrief", "Start a debrief"]], r.target)}</select></label><label class="field"><span>Link to preparation (optional)</span><select onchange="MeanwhileReminders.draft('taskId',this.value)"><option value="">No linked preparation</option>${tasks.map((t) => `<option value="${t.id}" ${r.taskId === t.id ? "selected" : ""}>${esc(t.title.slice(0, 100))}</option>`).join("")}</select></label>` : ""}<label class="task"><input type="checkbox" ${r.discreet ? "checked" : ""} onchange="MeanwhileReminders.draft('discreet',this.checked,true)"><span>Hide personal details on the lock screen</span></label><p class="small">${r.discreet ? "The preview uses a generic message. Turn this off to show your selected content." : "Your chosen text may be visible on your lock screen."}</p><div class="split"><label class="field"><span>Extra nudges after this reminder</span><select onchange="MeanwhileReminders.draft('repeatCount',this.value)">${opts([0, 1, 2, 3].map((n) => [String(n), n ? n + " extra nudge" + (n > 1 ? "s" : "") : "Just once"]), String(r.repeatCount))}</select></label><label class="field"><span>Minutes between nudges</span><input type="number" min="5" max="240" value="${r.repeatMinutes}" oninput="MeanwhileReminders.draft('repeatMinutes',this.value)"></label></div>${group === "before" ? '<p class="small">Before-therapy repeats stop when the session starts.</p>' : ""}<div id="reminder-preview">${preview(r, group)}</div><p id="reminder-error" role="status" class="hint"></p><div class="actions"><button class="secondary" onclick="closeModal()">Cancel</button><button class="primary" onclick="MeanwhileReminders.saveRule(false)">Save reminder</button><button class="secondary" onclick="MeanwhileReminders.saveRule(true)">Save & add another</button></div>`, "Edit reminder");
  }
  function saveRule(another) {
    const r = draft;
    if (!r) return;
    let error = group === "custom" && (!Number.isFinite(+new Date(r.at)) || new Date(r.at) <= /* @__PURE__ */ new Date()) ? "Choose a future date and time, or cancel to leave it for later." : group !== "custom" && (!Number.isFinite(r.minutes) || r.minutes < 0 || r.minutes > 10080) ? "Choose 0\u201310080 minutes." : r.content === "custom" && !r.custom.trim() ? "Add a message, by voice or text." : r.repeatMinutes < 5 || r.repeatMinutes > 240 ? "Choose 5\u2013240 minutes between nudges." : "";
    if (error) {
      $("#reminder-error").textContent = error;
      return;
    }
    const rows = config()[group], i = rows.findIndex((x) => x.id === editing);
    if (i >= 0) rows[i] = { ...r, done: false };
    else if (rows.length < (group === "custom" ? 200 : 12)) rows.push({ ...r, done: false });
    else {
      $("#reminder-error").textContent = "Remove an older reminder before adding another.";
      return;
    }
    const g = group, copy = { ...r };
    persistReminder();
    closeModal();
    render();
    toast("Reminder saved", window.MeanwhileNative?.native ? "Your phone reminder plan was updated." : "Saved for this website preview and the next app update.");
    if (another) edit(g, null, { ...copy, id: uid(), at: g === "custom" ? "" : copy.at });
  }
  function nextDate(which) {
    const d = /* @__PURE__ */ new Date();
    d.setHours(18, 0, 0, 0);
    d.setDate(d.getDate() + (which === "tomorrow" ? 1 : (1 - d.getDay() + 7) % 7 || 7));
    return localMinute(d);
  }
  function link(title, options = {}) {
    edit("custom", null, { title: title.slice(0, 100), custom: title, ...options });
  }
  window.MeanwhileReminders = { persist: () => {
    globalSave();
    window.MeanwhileNative?.sync();
  }, open(s) {
    section = s;
    closeModal();
    view = "settings";
    render();
    window.scrollTo(0, 0);
  }, edit, saveRule, draft(k, value, redraw = false) {
    if (!draft) return;
    draft[k] = ["minutes", "repeatCount", "repeatMinutes"].includes(k) ? Number(value) : value;
    if (redraw) editor();
    else {
      const el = $("#reminder-preview");
      if (el) el.innerHTML = preview(draft, group);
    }
  }, quickDate(day) {
    draft.at = nextDate(day);
    $("#reminder-time").value = draft.at;
    const el = $("#reminder-preview");
    if (el) el.innerHTML = preview(draft, group);
  }, voiceMessage() {
    openCapture({ title: "What should your reminder say?", existing: draft.custom, onSave: (text) => {
      draft.custom = text;
      editor();
    } });
  }, preview(g, id2) {
    const r = config()[g].find((r2) => r2.id === id2);
    if (r) showModal(`<h2>Notification preview</h2>${preview(r, g)}<p class="hint">This preview does not schedule a browser alert.</p><div class="actions"><button class="secondary" onclick="MeanwhileReminders.edit('${g}','${id2}')">Edit</button><button class="primary" onclick="closeModal()">Done</button></div>`);
  }, enable(g, id2, value) {
    const r = config()[g].find((r2) => r2.id === id2);
    if (r) {
      r.enabled = value;
      if (value) r.done = false;
      persistReminder();
      render();
    }
  }, remove(g, id2) {
    const c = config(), old = c[g].find((r) => r.id === id2);
    c[g] = c[g].filter((r) => r.id !== id2);
    persistReminder();
    render();
    showModal('<h2>Reminder removed</h2><p class="hint">Your notes have not changed.</p><div class="actions"><button id="undo-reminder" class="secondary">Undo</button><button class="primary" onclick="closeModal()">Done</button></div>');
    $("#undo-reminder").onclick = () => {
      config()[g].push(old);
      persistReminder();
      closeModal();
      render();
    };
  }, done(id2) {
    const r = config().custom.find((r2) => r2.id === id2);
    if (r) {
      r.done = !r.done;
      persistReminder();
      render();
    }
  }, snoozeLength(v) {
    config().snoozeMinutes = Number(v);
    persistReminder();
    render();
  }, fallback(k, v) {
    const f = config().fallback;
    f[k] = k === "days" ? Math.max(1, Math.min(30, Math.round(Number(v) || 1))) : v;
    if (["mode", "days", "time"].includes(k)) f.anchor = (/* @__PURE__ */ new Date()).toISOString();
    persistReminder();
    render();
  }, day(d) {
    const f = config().fallback;
    f.weekdays = f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d];
    persistReminder();
    render();
  }, forTask(id2, key) {
    const t = state.contexts[key]?.tasks.find((t2) => t2.id === id2);
    if (t) link(t.title, { taskId: id2, sessionKey: key });
  }, forThought(id2, key) {
    const t = state.contexts[key]?.thoughts.find((t2) => t2.id === id2);
    if (t) link(t.organisedTitle || t.text, { custom: t.text, target: t.destination === "reflection" ? "reflections" : "prep", sessionKey: key });
  }, forQuestion(id2) {
    const q = suggestions().find((q2) => q2.id === id2);
    if (q) link(q.title, { custom: q.question, target: "reflections" });
  }, snoozeRule(id2) {
    const r = config().custom.find((r2) => r2.id === id2);
    if (!r) return;
    r.at = localMinute(new Date(Date.now() + config().snoozeMinutes * 6e4));
    r.enabled = true;
    r.done = false;
    persistReminder();
    render();
    toast("Reminder snoozed", when(r.at));
  }, snooze(n) {
    const e = n.extra || {}, at = new Date(Date.now() + config().snoozeMinutes * 6e4);
    if (e.kind === "prep" && new Date(e.sessionKey) <= at) {
      toast("Your session starts before then", "Open your preparation now.");
      go("prep");
      return;
    }
    config().custom.push({ ...fresh("custom"), title: n.title, custom: n.body, at: localMinute(at), discreet: e.discreet !== false, target: e.target || "prep", sessionKey: e.sessionKey || currentKey(), taskId: e.taskId || "" });
    persistReminder();
    toast("Reminder snoozed", when(at));
  }, openNotification(e) {
    if (e.target === "debrief") {
      openDebrief();
      return true;
    }
    if (e.target === "reflections") {
      if (config().custom.some((r) => r.id === e.ruleId)) this.openContent(e.ruleId);
      else go("reflections");
      return true;
    }
    return false;
  }, openContent(id2) {
    const r = config().custom.find((r2) => r2.id === id2);
    if (!r) return;
    if (r.target === "debrief") {
      openDebrief();
      return;
    }
    if (r.target === "prep") {
      go("prep");
      return;
    }
    showModal(`<h2>${esc(r.title || "A thought to return to")}</h2><p class="sub transcript">${esc(r.custom)}</p><div class="actions"><button class="secondary" onclick="closeModal()">Close</button><button class="primary" onclick="MeanwhileReminders.answer('${id2}')">\u25C9 Explore this thought</button></div>`);
  }, answer(id2) {
    const r = config().custom.find((r2) => r2.id === id2);
    if (r) openCapture({ title: r.title || "A thought to sit with", description: r.custom, onSave: (text) => {
      context().thoughts.push({ id: uid(), date: (/* @__PURE__ */ new Date()).toISOString(), text: r.custom + "\n\nMy response: " + text, destination: "reflection" });
      globalSave();
      view = "reflections";
      render();
    } });
  } };
  var globalSave = globalThis.save || window.save;
  window.MeanwhileReminderModel = { config, data: snapshot, upcoming: () => buildConfiguredReminderPlan(snapshot()), newRule: fresh, localMinute };
  if (!state.reminders.config) {
    config();
    globalSave();
  }
  opened();
  window.addEventListener("meanwhile:resume", opened);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") opened();
  });
  render();
})();
