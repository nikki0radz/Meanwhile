(() => {
  // update-policy.js
  function parseRelease(data) {
    if (!data || data.appId !== "uk.co.nikkiradz.meanwhile" || data.platform !== "android" || !Number.isSafeInteger(data.build) || data.build < 1 || typeof data.version !== "string" || !/^\d+\.\d+\.\d+$/.test(data.version) || typeof data.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(data.sha256)) throw Error("The update information is invalid.");
    const url = new URL(data.url);
    if (url.protocol !== "https:" || url.hostname !== "raw.githubusercontent.com" || url.port || url.username || url.password || url.search || url.hash || url.pathname !== `/nikki0radz/Meanwhile/main/downloads/Meanwhile-${data.version}.apk`) throw Error("The update download address is not trusted.");
    return { version: data.version, build: data.build, url: url.href, sha256: data.sha256, notes: typeof data.notes === "string" ? data.notes.slice(0, 1500) : "" };
  }
  function newerRelease(data, installedBuild) {
    const release = parseRelease(data);
    if (!Number.isSafeInteger(installedBuild) || installedBuild < 1) throw Error("Could not read the installed app version.");
    return release.build > installedBuild ? release : null;
  }

  // app-updates.js
  var native = window.MeanwhileNative;
  var FEED = "https://raw.githubusercontent.com/nikki0radz/Meanwhile/main/app-update.json";
  var installed = null;
  var available = null;
  var checking = false;
  var lastChecked = 0;
  var status = "Check for the latest version of Meanwhile.";
  function card() {
    if (!native?.native) return "";
    return `<div class="card" id="app-update-settings"><div class="row"><h2>App updates</h2><span class="pill">${installed ? "v" + esc(installed.version) : "Android"}</span></div><p class="hint" role="status">${esc(status)}</p>${available ? `<p>${esc(available.notes)}</p><button class="primary" onclick="MeanwhileUpdates.download()">Download v${esc(available.version)}</button>` : ""}<div class="button-row"><button class="secondary" onclick="MeanwhileUpdates.check(true)" ${checking ? "disabled" : ""}>${checking ? "Checking\u2026" : "Check for updates"}</button></div><p class="small" style="margin-top:12px">Download and open the APK to update. Keep Meanwhile installed so your local notes remain on this phone. Android asks you to approve installation.</p></div>`;
  }
  function banner() {
    if (!available || localStorage.getItem("meanwhile-update-dismissed") === String(available.build)) return "";
    return `<aside id="app-update-banner" class="app-update-banner" aria-label="App update available"><div><strong>Meanwhile v${esc(available.version)} is available</strong><p class="small">${esc(available.notes || "An update is ready to download.")}</p></div><div class="button-row"><button class="primary" onclick="MeanwhileUpdates.download()">Download update</button><button class="secondary" onclick="MeanwhileUpdates.dismiss()">Later</button></div></aside>`;
  }
  function display() {
    document.getElementById("app-update-settings")?.replaceWith(document.createRange().createContextualFragment(card()));
    document.getElementById("app-update-banner")?.remove();
    const html = banner();
    if (html) document.querySelector(".shell header")?.insertAdjacentHTML("afterend", html);
  }
  async function check(manual = false) {
    if (!native?.native || checking || !manual && Date.now() - lastChecked < 36e5) return;
    checking = true;
    status = "Checking for updates\u2026";
    display();
    try {
      installed = await native.getInfo();
      const build = Number(installed.build);
      const response = await fetch(FEED, { cache: "no-store", signal: AbortSignal.timeout(12e3) });
      if (!response.ok) throw Error("Could not reach the update service.");
      available = newerRelease(await response.json(), build);
      lastChecked = Date.now();
      status = available ? `Version ${available.version} is available. Your installed version is ${installed.version}.` : "You have the latest published version.";
      if (manual && available) localStorage.removeItem("meanwhile-update-dismissed");
    } catch {
      status = "Could not check for updates. Check your connection and try again; your app is still available offline.";
    } finally {
      checking = false;
      display();
    }
  }
  window.MeanwhileUpdates = { check, download() {
    if (!available) return;
    toast("Opening update download", "Download the APK, then open it to update Meanwhile. Do not uninstall first.");
    window.location.href = available.url;
  }, dismiss() {
    if (available) localStorage.setItem("meanwhile-update-dismissed", String(available.build));
    display();
  } };
  var previous = settingsPage;
  settingsPage = function() {
    return previous().replace("<section>", "<section>" + card());
  };
  if (native?.native) {
    window.addEventListener("meanwhile:resume", () => check());
    window.addEventListener("online", () => check());
    setTimeout(() => check(), 1800);
    if (view === "settings") render();
  }
})();
