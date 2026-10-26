import {
  DEFAULTS,
  OPEN,
  simulate,
  snapshot,
  summary,
  sameDemand,
  queueSeries,
  storiesAt,
} from "./simulation.js";
import { CHALLENGES, baselineFor, evaluateChallenge } from "./challenges.js";
import { formatDuration as fmt, count } from "./format.js";
import { createScene } from "./scene.js";
const $ = (id) => document.getElementById(id),
  drawScene = createScene($("scene"));
const keys = [
  "baristas",
  "rate",
  "service",
  "pattern",
  "variability",
  "patience",
  "seed",
  "mistakes",
  "nolal",
];
let draft = { ...DEFAULTS },
  run = simulate(draft),
  time = 0,
  playing = false,
  started = false,
  dirty = false,
  recorded = false,
  history = [],
  baseline = null,
  activeChallenge = null,
  completed = new Set(),
  runNumber = 0,
  series = queueSeries(run),
  lastFrame = null,
  frameId = null,
  lastPaint = 0;
const clock = (n) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
function setControls() {
  for (const key of keys) $(key).value = String(draft[key]);
  updateLabels();
}
function updateLabels() {
  $("mistakes-value").textContent = `${draft.mistakes}%`;
  $("nolal-value").textContent = `${draft.nolal}%`;
  $("staff-value").textContent =
    `${draft.baristas} ${draft.baristas === 1 ? "person" : "people"}`;
  $("rate-value").textContent = `${draft.rate} / min on average`;
  $("service-value").textContent = `${draft.service} sec`;
  document
    .querySelectorAll("[data-policy]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.policy === draft.policy)),
    );
  $("policy-note").textContent =
    draft.policy === "shared"
      ? "Next in line goes to the next free barista."
      : "Join a shortest line. No switching once you’re in.";
  $("pending").textContent = dirty
    ? "Changes ready. Start a new run to apply them."
    : started
      ? "Replay keeps exactly the same customers."
      : "Settings apply when you open the café.";
  $("pending").classList.toggle("dirty", dirty);
  updatePlayButton();
}
function updatePlayButton() {
  const live = started && time < run.end;
  $("apply-settings").hidden = !(dirty && live);
  $("play").textContent = playing
    ? "Pause"
    : dirty && !live
      ? "Run these settings"
      : time >= run.end
        ? "Run again"
        : started
          ? "Resume"
          : "Open the café";
}
function readControls() {
  for (const key of keys) {
    const value = $(key).value;
    draft[key] = ["pattern", "variability"].includes(key)
      ? value
      : value === ""
        ? NaN
        : Number(value);
  }
  dirty = true;
  $("error").textContent = "";
  updateLabels();
}
for (const key of keys) $(key).addEventListener("input", readControls);
for (const button of document.querySelectorAll("[data-policy]"))
  button.addEventListener("click", () => {
    draft.policy = button.dataset.policy;
    dirty = true;
    updateLabels();
  });
function schedule() {
  if (playing && frameId === null) frameId = requestAnimationFrame(tick);
}
function tick(now) {
  frameId = null;
  if (!playing) return;
  if (lastFrame !== null)
    time = Math.min(
      run.end,
      time +
        Math.min((now - lastFrame) / 1000, 0.25) * Number($("speed").value),
    );
  lastFrame = now;
  if (time >= run.end) {
    finish();
    return;
  }
  if (now - lastPaint > 70) {
    render();
    lastPaint = now;
  }
  schedule();
}
function startRun(config, autoplay = true) {
  try {
    const next = simulate(config);
    run = next;
    draft = { ...next.settings };
    series = queueSeries(run);
    time = 0;
    started = autoplay;
    playing = autoplay;
    dirty = false;
    recorded = false;
    lastFrame = null;
    $("error").textContent = "";
    $("answer").value = "";
    setControls();
    render();
    schedule();
    return true;
  } catch (e) {
    $("error").textContent = e.message;
    return false;
  }
}
function finish() {
  playing = false;
  started = true;
  time = run.end;
  if (!recorded) {
    history.unshift({ run, number: ++runNumber });
    history = history.slice(0, 6);
    recorded = true;
    $("run-announcement").textContent =
      `Run complete. ${summary(run).served} served and ${summary(run).left} left.`;
    renderHistory();
  }
  updatePlayButton();
  render();
  renderComparison();
  renderChallengeResult();
}
$("play").addEventListener("click", () => {
  if (!playing && ((dirty && !started) || time >= run.end)) {
    startRun(draft);
    return;
  }
  playing = !playing;
  started = true;
  lastFrame = null;
  updateLabels();
  render();
  schedule();
});
$("apply-settings").addEventListener("click", () => startRun(draft));
$("finish").addEventListener("click", finish);
$("restart").addEventListener("click", () => startRun(run.settings));
$("new-seed").addEventListener("click", () => {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  draft.seed = a[0];
  dirty = true;
  setControls();
});
$("speed").addEventListener("change", () => {
  lastFrame = null;
});
$("pin").addEventListener("click", () => {
  if (time >= run.end) {
    baseline = run;
    renderComparison();
    renderHistory();
    $("pin").textContent = "✓ This run is pinned";
  }
});
function chart() {
  const points = series.filter((p) => p.time <= time);
  const end = Math.max(OPEN, time),
    max = Math.max(4, ...points.map((p) => p.waiting));
  const x = (t) => 36 + (t / end) * 590,
    y = (v) => 124 - (v / max) * 102;
  let d = `M36 124`;
  for (const p of points)
    d += ` H${x(p.time).toFixed(2)} V${y(p.waiting).toFixed(2)}`;
  d += ` H${x(time).toFixed(2)}`;
  const area = d + ` V124 H36 Z`;
  $("queue-chart").innerHTML =
    `<path d="M36 22H626M36 73H626M36 124H626" stroke="#e6e8de" fill="none"/><text x="23" y="26" text-anchor="end" fill="#788373" font-size="9">${max}</text><text x="23" y="128" text-anchor="end" fill="#788373" font-size="9">0</text><path d="${area}" fill="#d9e6d4" opacity=".7"/><path d="${d}" stroke="#5e8267" stroke-width="2" fill="none"/><text x="36" y="149" fill="#788373" font-size="9">0 min</text><text x="330" y="149" text-anchor="middle" fill="#788373" font-size="9">${Math.round(end / 120)} min</text><text x="626" y="149" text-anchor="end" fill="#788373" font-size="9">${Math.ceil(end / 60)} min</text>${time > OPEN ? `<path d="M${x(OPEN)} 15V128" stroke="#cf7b54" stroke-dasharray="4 4"/><text x="${x(OPEN) - 5}" y="12" text-anchor="end" font-size="8" fill="#a65532">doors close</text>` : ""}`;
  const peak = Math.max(0, ...points.map((p) => p.waiting));
  $("queue-chart").setAttribute(
    "aria-label",
    `Queue length over time. Peak ${peak} waiting by ${clock(time)}.`,
  );
  $("chart-text").textContent = started
    ? `Peak queue: ${peak} customers · ${time >= OPEN ? "Arrivals stopped at 20 minutes." : "Doors open for 20 minutes."}`
    : "Open the café to see the line grow and shrink.";
}
function render() {
  const s = snapshot(run, time);
  drawScene(run, s);
  $("clock").textContent = clock(time);
  $("status").textContent =
    s.phase === "complete"
      ? "Run complete"
      : s.phase === "draining"
        ? "Doors closed · finishing drinks"
        : playing
          ? "Café open · coffee’s on"
          : started
            ? "Paused · take your time"
            : "Ready when you are";
  $("served").textContent = s.served;
  $("waiting").textContent = s.waiting;
  $("left").textContent = s.left;
  $("mean-wait").textContent = fmt(s.meanWait);
  $("max-wait").textContent = fmt(s.maxWait);
  for (const key of ["correct", "accepted", "remakes"])
    $(key).textContent = s[key];
  $("total-time").textContent = fmt(s.meanTotal);
  const stories = storiesAt(run, time);
  const latest = stories.at(-1);
  const story = latest
    ? `${clock(latest.time)} · ${latest.text}`
    : s.phase === "complete"
      ? "No mix-ups or walkouts this time. A quiet counter."
      : "A fresh pot. Plenty of room for human error.";
  if ($("story-current").textContent !== story)
    $("story-current").textContent = story;
  $("stories").replaceChildren(
    ...stories.map((event) => {
      const item = document.createElement("li");
      item.textContent = `${clock(event.time)} · ${event.text}`;
      return item;
    }),
  );
  $("pin").disabled = s.phase !== "complete";
  $("pin").textContent =
    baseline === run ? "✓ This run is pinned" : "＋ Pin this run to compare";
  $("chart-phase").textContent =
    s.phase === "complete"
      ? "The full run"
      : s.phase === "draining"
        ? "Finishing the queue"
        : "Live queue length";
  $("scene-note").textContent =
    s.phase === "complete"
      ? `${count(s.served, "drink")} handed over. ${count(s.left, "customer")} left the line.`
      : s.phase === "draining"
        ? "No new arrivals. Everyone still here gets a turn—or leaves."
        : s.arrived
          ? `${count(s.arrived, "arrival")} · ${count(s.serving, "drink")} in the making`
          : "Your first customers are just around the corner.";
  chart();
  if (s.phase === "complete") {
    if (!s.arrived) {
      $("takeaway-title").textContent = "A very quiet day.";
      $("takeaway-copy").textContent =
        "Nobody arrived. Try another day’s customers.";
    } else if (s.left) {
      $("takeaway-title").textContent = "The people who left count, too.";
      $("takeaway-copy").textContent =
        `${s.left} of ${s.arrived} customers gave up. The ${fmt(s.meanWait)} average wait describes only customers who got served. Compare departures before calling this a good result.`;
    } else if (s.meanWait > 300) {
      $("takeaway-title").textContent =
        "They stayed. That doesn’t make it a short wait.";
      $("takeaway-copy").textContent =
        `Average queue wait: ${fmt(s.meanWait)}. The longest was ${fmt(s.maxWait)}. Patience kept the line intact, but it didn’t create more capacity.`;
    } else if (s.accepted) {
      $("takeaway-title").textContent =
        "Served isn’t always what they intended.";
      $("takeaway-copy").textContent =
        `${count(s.accepted, "customer")} said “nolal” and kept a mix-up; ${s.correct} got their intended drink. Replay with a lower allowance to see the extra remake time and its effect on the queue.`;
    } else {
      $("takeaway-title").textContent = "Everyone got their intended drink.";
      $("takeaway-copy").textContent =
        `The average wait was ${fmt(s.meanWait)}; 90% waited ${fmt(s.p90)} or less. Replay with another queue policy or team size to see what changes.`;
    }
  } else {
    $("takeaway-title").textContent =
      "A little breathing room goes a long way.";
    $("takeaway-copy").textContent =
      "When every barista is busy, even a small cluster of arrivals can create a long line. Try adding one person and replaying the same customers.";
  }
  updatePlayButton();
  if (s.phase !== "complete") {
    renderComparison();
    $("answer-controls").hidden = true;
    if (activeChallenge)
      $("challenge-result").textContent =
        "Run the experiment to see what happens.";
  }
}
function renderComparison() {
  const current = time >= run.end ? summary(run) : null,
    b = baseline ? summary(baseline) : null;
  $("comparison").hidden = !current && !b;
  if (!current && !b) return;
  $("comparison-title").textContent = b
    ? "Same café. Another possibility."
    : "Your run, up close";
  $("baseline-label").textContent = activeChallenge
    ? "Challenge baseline"
    : "Pinned run";
  $("comparison-note").textContent = b
    ? sameDemand(baseline, run)
      ? "Same customers & drinks"
      : "Different demand — compare with care"
    : "Pin a run to try a comparison";
  const rows = [
    ["Customers arrived", "arrived", String],
    ["Drinks handed over", "served", String],
    ["Got their intended drink", "correct", String],
    ["Accepted a mix-up · nolal", "accepted", String],
    ["Remakes requested", "remakes", String],
    ["Average arrival → final drink · served", "meanTotal", fmt],
    ["Left before service", "left", String],
    ["Average wait · served", "meanWait", fmt],
    ["90th-percentile wait · served", "p90", fmt],
    ["Longest wait · served", "maxWait", fmt],
    ["Average wait · people who left", "leftWait", fmt],
    [
      "Barista utilization · while open",
      "utilization",
      (v) => `${Math.round(v * 100)}%`,
    ],
  ];
  const describe = (r) =>
    `${count(r.settings.baristas, "barista")} · ${r.settings.policy}`;
  const patience = (r) =>
    r.settings.patience === Infinity ? "Unlimited" : fmt(r.settings.patience);
  const configuration = `<tr><td>Team & queue</td><td>${baseline ? describe(baseline) : "—"}</td><td>${describe(run)}</td></tr><tr><td>Patience before leaving</td><td>${baseline ? patience(baseline) : "—"}</td><td>${patience(run)}</td></tr>`;
  const qualitySettings = `<tr><td>Mix-up chance / nolal allowance</td><td>${baseline ? `${baseline.settings.mistakes}% / ${baseline.settings.nolal}%` : "—"}</td><td>${run.settings.mistakes}% / ${run.settings.nolal}%</td></tr>`;
  $("comparison-body").innerHTML =
    configuration +
    qualitySettings +
    rows
      .map(
        ([label, key, f]) =>
          `<tr><td>${label}</td><td>${b ? f(b[key]) : "—"}</td><td>${current ? f(current[key]) : started ? "Run in progress" : "Not started"}</td></tr>`,
      )
      .join("");
}
function renderHistory() {
  $("history").replaceChildren();
  for (const item of history) {
    const b = document.createElement("button");
    const s = summary(item.run);
    b.textContent = `Run #${item.number} · ${count(item.run.settings.baristas, "barista")} · ${fmt(s.meanWait)} wait${baseline === item.run ? " · Pinned ✓" : " · Pin to compare"}`;
    b.setAttribute("aria-pressed", String(baseline === item.run));
    b.disabled = !!activeChallenge;
    b.addEventListener("click", () => {
      baseline = item.run;
      renderHistory();
      renderComparison();
      render();
    });
    $("history").append(b);
  }
}
function renderCards() {
  $("challenge-cards").innerHTML = CHALLENGES.map(
    (c) =>
      `<button class="challenge-card ${activeChallenge === c.id ? "active" : ""}" data-challenge="${c.id}"><span class="card-number ${completed.has(c.id) ? "done" : ""}">${completed.has(c.id) ? "✓ Explored" : c.number}</span><span class="card-arrow" aria-hidden="true">↗</span><h3>${c.title}</h3><p>${c.description}</p></button>`,
  ).join("");
  for (const b of document.querySelectorAll("[data-challenge]"))
    b.addEventListener("click", () => enterChallenge(b.dataset.challenge));
}
function configureChallengeControls() {
  const c = CHALLENGES.find((c) => c.id === activeChallenge);
  for (const key of keys) {
    $(key).disabled = !!c && key !== c.control;
    $(key).classList.toggle("highlight-control", !!c && key === c.control);
  }
  for (const b of document.querySelectorAll("[data-policy]"))
    b.disabled = !!c && c.control !== "policy";
  $("new-seed").disabled = !!c;
  $("locked-note").hidden = !c;
  $("locked-note").textContent = c
    ? c.id === "nolal"
      ? "Experiment: change only nolal allowance. Mix-ups stay at 40% on the same day, so you can see the tradeoff."
      : "Experiment: only the highlighted control changes. Other settings stay fixed and mix-ups are off, so the comparison stays fair."
    : "";
  $("another-day").hidden = c?.id !== "rush";
  document
    .querySelector(".policy-setting")
    .classList.toggle("highlight-control", c?.control === "policy");
  $("pin").hidden = !!c;
  renderHistory();
}
function enterChallenge(id, seed) {
  const c = CHALLENGES.find((c) => c.id === id);
  activeChallenge = id;
  baseline = baselineFor(id, seed);
  $("challenge-panel").hidden = false;
  $("challenge-title").textContent = c.title;
  $("challenge-tag").textContent = c.tag;
  $("challenge-instruction").textContent = c.instruction;
  startRun(baseline.settings, false);
  configureChallengeControls();
  renderCards();
  $("playground").scrollIntoView({ behavior: "smooth" });
  $("play").focus({ preventScroll: true });
  renderComparison();
}
$("another-day").addEventListener("click", () => {
  completed.delete("rush");
  enterChallenge(
    "rush",
    run.settings.seed === 42 ? 2 : run.settings.seed === 2 ? 42 : 2,
  );
});
function renderChallengeResult() {
  if (!activeChallenge) return;
  const result = evaluateChallenge(activeChallenge, run);
  $("challenge-result").textContent = result.message;
  const needsAnswer = activeChallenge !== "rush";
  $("answer-controls").hidden = !needsAnswer;
  if (needsAnswer) {
    $("answer-label").textContent =
      activeChallenge === "lines"
        ? "Which queue had the lower average wait in this comparison?"
        : activeChallenge === "nolal"
          ? "What changed when everyone accepted a mix-up?"
          : "Which metric exposes the customers missing from the served-customer average?";
    const opts =
      activeChallenge === "lines"
        ? [
            ["shared", "One shared line"],
            ["separate", "Separate lines"],
            ["tie", "They tied"],
          ]
        : activeChallenge === "nolal"
          ? [
              ["everyone", "More people got their intended drink"],
              ["tradeoff", "Fewer walkouts, but fewer intended drinks"],
              ["unchanged", "Only the waiting time changed"],
            ]
          : [
              ["mean", "Average wait among served"],
              ["left", "Customers who left the line"],
            ];
    $("answer").innerHTML =
      '<option value="">Choose what you observed…</option>' +
      opts
        .map(([v, label]) => `<option value="${v}">${label}</option>`)
        .join("");
  }
  if (result.passed) {
    completed.add(activeChallenge);
    renderCards();
  }
}
$("check-answer").addEventListener("click", () => {
  if (!activeChallenge || time < run.end) return;
  const result = evaluateChallenge(activeChallenge, run, $("answer").value);
  $("challenge-result").textContent = result.message;
  if (result.passed) {
    completed.add(activeChallenge);
    renderCards();
  }
});
$("exit-challenge").addEventListener("click", () => {
  activeChallenge = null;
  baseline = null;
  draft.mistakes = DEFAULTS.mistakes;
  draft.nolal = DEFAULTS.nolal;
  dirty = true;
  setControls();
  $("challenge-panel").hidden = true;
  configureChallengeControls();
  renderCards();
  renderComparison();
  render();
});
setControls();
renderCards();
render();
