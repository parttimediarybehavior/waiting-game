import { formatDuration } from "./format.js";
/** Pure event simulation. Times are seconds; arrival window is [0, OPEN). */
export const OPEN = 20 * 60;
export const DEFAULTS = Object.freeze({
  baristas: 2,
  rate: 2,
  service: 45,
  variability: "high",
  pattern: "unpredictable",
  patience: 300,
  policy: "shared",
  seed: 42,
  mistakes: 15,
  nolal: 60,
});
export function settings(input = {}) {
  const s = { ...DEFAULTS, ...input };
  if (!Number.isInteger(s.baristas) || s.baristas < 1 || s.baristas > 4)
    throw new Error("Choose 1–4 baristas.");
  if (!Number.isFinite(s.rate) || s.rate < 0.5 || s.rate > 4)
    throw new Error("Arrivals must be 0.5–4 per minute.");
  if (!Number.isFinite(s.service) || s.service < 30 || s.service > 150)
    throw new Error("Drink time must be 30–150 seconds.");
  if (!Number.isInteger(s.seed) || s.seed < 0 || s.seed > 4294967295)
    throw new Error("Seed must be a whole number from 0 to 4294967295.");
  if (
    !(
      s.patience === Infinity ||
      (Number.isFinite(s.patience) && s.patience > 0)
    )
  )
    throw new Error("Patience must be positive.");
  for (const [key, max] of [
    ["mistakes", 40],
    ["nolal", 100],
  ])
    if (!Number.isFinite(s[key]) || s[key] < 0 || s[key] > max)
      throw new Error(
        `${key === "mistakes" ? "Mix-ups" : "Nolal allowance"} must be 0–${max}%.`,
      );
  for (const [key, values] of Object.entries({
    policy: ["shared", "separate"],
    pattern: ["steady", "unpredictable"],
    variability: ["low", "high"],
  }))
    if (!values.includes(s[key])) throw new Error(`Unknown ${key}.`);
  return s;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function generateDemand(input) {
  const s = settings(input),
    arrivalRandom = rng(s.seed),
    drinkRandom = rng(s.seed ^ 0x91e10da5),
    qualityRandom = rng(s.seed ^ 0x37a45f91),
    out = [];
  let t = 0;
  while (true) {
    t +=
      s.pattern === "steady"
        ? 60 / s.rate
        : (-Math.log(1 - arrivalRandom()) * 60) / s.rate;
    if (t >= OPEN) break;
    out.push({
      id: out.length,
      mishap: qualityRandom(),
      acceptance: qualityRandom(),
      source: qualityRandom(),
      arrival: t,
      duration:
        s.service *
        (s.variability === "low" ? 1 : drinkRandom() < 0.5 ? 0.4 : 1.6),
    });
  }
  return out;
}
export function simulate(input, suppliedDemand) {
  const s = settings(input),
    demand = suppliedDemand ?? generateDemand(s);
  const ids = new Set();
  const customers = demand
    .map((c) => {
      if (
        !Number.isInteger(c.id) ||
        ids.has(c.id) ||
        !Number.isFinite(c.arrival) ||
        c.arrival < 0 ||
        c.arrival >= OPEN ||
        !Number.isFinite(c.duration) ||
        c.duration <= 0
      )
        throw new Error("Invalid customer demand.");
      for (const key of ["mishap", "acceptance", "source"])
        if (
          c[key] !== undefined &&
          (!Number.isFinite(c[key]) || c[key] < 0 || c[key] >= 1)
        )
          throw new Error("Invalid customer disposition.");
      ids.add(c.id);
      const incident =
        (c.mishap ?? 1) < s.mistakes / 100
          ? (c.source ?? 0) < 0.5
            ? "customer"
            : "barista"
          : null;
      const accepted = incident !== null && (c.acceptance ?? 1) < s.nolal / 100;
      return {
        ...c,
        incident,
        accepted,
        remake: incident !== null && !accepted,
        firstFinish: null,
        start: null,
        finish: null,
        leave: null,
        server: null,
        line: null,
        status: "pending",
      };
    })
    .sort((a, b) => a.arrival - b.arrival || a.id - b.id);
  const demandKey = JSON.stringify(
    customers.map(({ id, arrival, duration, mishap, acceptance, source }) => [
      id,
      arrival,
      duration,
      mishap,
      acceptance,
      source,
    ]),
  );
  const servers = Array(s.baristas).fill(null),
    queues = Array.from(
      { length: s.policy === "shared" ? 1 : s.baristas },
      () => [],
    );
  let cursor = 0,
    rotation = 0,
    t = 0;
  function dispatch() {
    for (let i = 0; i < servers.length; i++)
      if (servers[i] === null) {
        let c = queues[s.policy === "shared" ? 0 : i].shift();
        if (c) {
          c.start = t;
          c.firstFinish = t + c.duration;
          c.finish = c.firstFinish + (c.remake ? c.duration : 0);
          c.server = i;
          c.status = "served";
          servers[i] = c;
        }
      }
  }
  while (
    cursor < customers.length ||
    servers.some(Boolean) ||
    queues.some((q) => q.length)
  ) {
    const nextArrival = customers[cursor]?.arrival ?? Infinity;
    const nextFinish = Math.min(...servers.map((c) => c?.finish ?? Infinity));
    const nextExpiry = Math.min(
      ...queues.flat().map((c) => c.arrival + s.patience),
    );
    t = Math.min(nextArrival, nextFinish, nextExpiry);
    if (!Number.isFinite(t)) throw new Error("Simulation cannot advance.");
    for (let i = 0; i < servers.length; i++)
      if (servers[i]?.finish === t) servers[i] = null;
    dispatch(); // Service at the exact patience boundary is accepted.
    for (const queue of queues)
      for (let i = queue.length - 1; i >= 0; i--)
        if (queue[i].arrival + s.patience <= t) {
          const [c] = queue.splice(i, 1);
          c.leave = t;
          c.status = "left";
        }
    while (cursor < customers.length && customers[cursor].arrival === t) {
      const c = customers[cursor++];
      let line = 0;
      if (s.policy === "separate") {
        const lengths = queues.map((q, i) => q.length + (servers[i] ? 1 : 0));
        const min = Math.min(...lengths);
        for (let n = 0; n < s.baristas; n++) {
          const i = (rotation + n) % s.baristas;
          if (lengths[i] === min) {
            line = i;
            rotation = (i + 1) % s.baristas;
            break;
          }
        }
      }
      c.line = line;
      queues[line].push(c);
      dispatch();
    }
  }
  return { settings: s, customers, end: Math.max(OPEN, t), demandKey };
}
const avg = (values) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export function snapshot(run, time) {
  const t = Math.max(0, Math.min(time, run.end)),
    arrived = run.customers.filter((c) => c.arrival <= t);
  const started = arrived.filter((c) => c.start !== null && c.start <= t),
    served = started.filter((c) => c.finish <= t),
    left = arrived.filter((c) => c.leave !== null && c.leave <= t);
  const serving = started.filter((c) => c.finish > t),
    waiting = arrived.filter(
      (c) =>
        (c.start === null || c.start > t) && (c.leave === null || c.leave > t),
    );
  const waits = started.map((c) => c.start - c.arrival).sort((a, b) => a - b);
  const elapsed = Math.min(t, OPEN),
    busy = started.reduce(
      (sum, c) => sum + Math.max(0, Math.min(c.finish, elapsed) - c.start),
      0,
    );
  return {
    time: t,
    phase: t >= run.end ? "complete" : t >= OPEN ? "draining" : "open",
    arrived: arrived.length,
    served: served.length,
    correct: served.filter((c) => !c.accepted).length,
    accepted: served.filter((c) => c.accepted).length,
    remakes: started.filter((c) => c.remake && c.firstFinish <= t).length,
    meanTotal: avg(served.map((c) => c.finish - c.arrival)),
    left: left.length,
    serving: serving.length,
    waiting: waiting.length,
    waitingCustomers: waiting,
    servingCustomers: serving,
    meanWait: avg(waits),
    maxWait: waits.length ? waits.at(-1) : null,
    p90: waits.length ? waits[Math.ceil(waits.length * 0.9) - 1] : null,
    leftWait: avg(left.map((c) => c.leave - c.arrival)),
    utilization: elapsed ? busy / (run.settings.baristas * elapsed) : 0,
  };
}
export const summary = (run) => snapshot(run, run.end);
export const sameDemand = (a, b) => a.demandKey === b.demandKey;
export function queueSeries(run) {
  const times = new Set([0, OPEN, run.end]);
  for (const c of run.customers)
    for (const t of [c.arrival, c.start, c.finish, c.leave])
      if (t !== null) times.add(t);
  return [...times]
    .sort((a, b) => a - b)
    .map((t) => ({ time: t, waiting: snapshot(run, t).waiting }));
}

/** Stories describe only events that have happened, including after instant finish. */
export function storiesAt(run, time) {
  const events = [];
  for (const c of run.customers) {
    const who = `Customer ${c.id + 1}`;
    if (c.leave !== null && c.leave <= time)
      events.push({
        time: c.leave,
        id: c.id,
        text: `${who}: “That’s my limit.” Left after ${Math.round((c.leave - c.arrival) / 60)} minutes in line.`,
      });
    if (!c.incident && c.finish !== null && c.finish <= time) {
      const wait = c.start - c.arrival;
      events.push({
        time: c.finish,
        id: c.id,
        quiet: true,
        text:
          wait < 1
            ? `${who}: “Straight to the counter. Lovely.” Intended drink in hand.`
            : `${who}: “That’s my coffee.” Intended drink in hand; waited ${formatDuration(wait)} in line.`,
      });
    }
    if (!c.incident || c.firstFinish === null || c.firstFinish > time) continue;
    const slip =
      c.incident === "customer"
        ? `${who}: “Wanted a latte. Got flustered and ordered coffee.”`
        : `Barista, order ${c.id + 1}: “Three sugars… was that two or four?”`;
    events.push({
      time: c.firstFinish,
      id: c.id,
      text:
        slip +
        (c.accepted
          ? c.incident === "customer"
            ? " Nolal! Latte can be tomorrow’s treat."
            : " Customer: “Nolal. I’ll take it.”"
          : " “Actually, could you redo that?” The barista starts a remake."),
    });
    if (c.remake && c.finish <= time)
      events.push({
        time: c.finish,
        id: c.id,
        text: `${who}: “That’s the one.” Remake ready; the barista can take the next order.`,
      });
  }
  // Keep incidents; use a real handover to break a quiet stretch, at most
  // once per two café minutes. Filtering elapsed events keeps replay honest.
  let last = -Infinity;
  return events
    .sort((a, b) => a.time - b.time || a.id - b.id)
    .filter((event) => {
      if (event.quiet && event.time - last < 120) return false;
      last = event.time;
      return true;
    })
    .slice(-6);
}
