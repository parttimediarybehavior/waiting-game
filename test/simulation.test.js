import test from "node:test";
import assert from "node:assert/strict";
const m = await import("../dist/simulation.js").catch(() => ({}));
const cfg = {
  mistakes: 0,
  baristas: 1,
  rate: 2,
  service: 60,
  variability: "low",
  pattern: "steady",
  patience: Infinity,
  policy: "shared",
  seed: 42,
};
const demand = [
  { id: 0, arrival: 0, duration: 60 },
  { id: 1, arrival: 10, duration: 60 },
  { id: 2, arrival: 20, duration: 60 },
];
test("model exports required behavior", () =>
  assert.equal(typeof m.simulate, "function"));
test("FIFO hand count and opening utilization", () => {
  const r = m.simulate(cfg, demand);
  assert.deepEqual(
    r.customers.map((c) => c.start - c.arrival),
    [0, 50, 100],
  );
  assert.equal(r.end, 1200);
  const s = m.summary(r);
  assert.equal(s.meanWait, 50);
  assert.equal(s.p90, 100);
  assert.equal(s.utilization, 0.15);
  assert.equal(s.served, 3);
});
test("patience boundary takes service; earlier deadline leaves", () => {
  let r = m.simulate({ ...cfg, patience: 50 }, demand);
  assert.deepEqual(
    r.customers.map((c) => c.status),
    ["served", "served", "left"],
  );
  assert.equal(r.customers[1].start, 60);
  assert.equal(r.customers[2].leave, 70);
  assert.equal(m.summary(r).leftWait, 50);
});
test("two baristas and live counts", () => {
  let r = m.simulate({ ...cfg, baristas: 2 }, demand);
  assert.deepEqual(
    r.customers.map((c) => c.start),
    [0, 10, 60],
  );
  let s = m.snapshot(r, 30);
  assert.equal(s.serving, 2);
  assert.equal(s.waiting, 1);
  assert.equal(s.served, 0);
  assert.equal(s.meanWait, 0);
});
test("drain is separate from opening and utilization excludes drain", () => {
  let r = m.simulate(cfg, [{ id: 0, arrival: 1190, duration: 60 }]);
  assert.equal(r.end, 1250);
  assert.equal(m.snapshot(r, 1200).phase, "draining");
  assert.equal(m.summary(r).utilization, 10 / 1200);
  assert.equal(m.summary(r).phase, "complete");
});
test("empty input is valid with undefined waits", () => {
  const s = m.summary(m.simulate(cfg, []));
  assert.equal(s.arrived, 0);
  assert.equal(s.meanWait, null);
  assert.equal(s.p90, null);
  assert.equal(s.utilization, 0);
});
test("shared queue avoids stranding customer behind long drink", () => {
  const d = [
    { id: 0, arrival: 0, duration: 100 },
    { id: 1, arrival: 0, duration: 10 },
    { id: 2, arrival: 1, duration: 10 },
  ];
  const a = m.simulate({ ...cfg, baristas: 2 }, d),
    b = m.simulate({ ...cfg, baristas: 2, policy: "separate" }, d);
  assert.equal(a.customers[2].start, 10);
  assert.equal(b.customers[2].start, 100);
});
test("same seed preserves customer demand across staff and queue changes", () => {
  const a = m.simulate(cfg),
    b = m.simulate({ ...cfg, baristas: 4, policy: "separate" });
  assert.equal(m.sameDemand(a, b), true);
  assert.deepEqual(
    m.generateDemand(cfg),
    m.generateDemand({ ...cfg, baristas: 4 }),
  );
  assert.equal(
    m.sameDemand(a, m.simulate({ ...cfg, seed: 43, pattern: "unpredictable" })),
    false,
  );
});
test("invalid settings and demand rejected instead of looping", () => {
  for (const change of [
    { rate: 0 },
    { service: NaN },
    { baristas: 0 },
    { seed: NaN },
    { patience: -1 },
    { policy: "oops" },
  ])
    assert.throws(() => m.simulate({ ...cfg, ...change }));
  assert.throws(() => m.simulate(cfg, [{ id: 0, arrival: -1, duration: 60 }]));
  assert.throws(() =>
    m.simulate(cfg, [{ id: 0, arrival: 1200, duration: 60 }]),
  );
});
test("conservation, bounded utilization, and frame-independent sampling", () => {
  for (let seed = 1; seed <= 40; seed++) {
    let r = m.simulate({
      ...cfg,
      seed,
      mistakes: 40,
      nolal: seed % 3 === 0 ? 0 : 100,
      rate: 4,
      service: 150,
      pattern: "unpredictable",
      variability: "high",
      patience: 120,
      baristas: (seed % 4) + 1,
      policy: seed % 2 ? "shared" : "separate",
    });
    const expected = m.summary(r);
    for (let t = 0; t < r.end; t += 17) {
      let s = m.snapshot(r, t);
      assert.equal(s.arrived, s.served + s.left + s.waiting + s.serving);
      assert.equal(s.served, s.correct + s.accepted);
      assert.ok(s.utilization >= 0 && s.utilization <= 1);
    }
    assert.deepEqual(m.summary(r), expected);
    assert.equal(expected.served + expected.left, r.customers.length);
    assert.ok(
      r.customers.every((c) => c.start === null || c.start >= c.arrival),
    );
  }
});

test("remakes occupy the barista; accepting a mix-up changes quality, not first drink time", () => {
  const d = [
    {
      id: 0,
      arrival: 0,
      duration: 60,
      mishap: 0,
      acceptance: 0.5,
      source: 0.1,
    },
    {
      id: 1,
      arrival: 10,
      duration: 60,
      mishap: 0.99,
      acceptance: 0.5,
      source: 0.9,
    },
  ];
  const strict = m.simulate({ ...cfg, mistakes: 40, nolal: 0 }, d);
  const relaxed = m.simulate({ ...cfg, mistakes: 40, nolal: 100 }, d);
  assert.equal(strict.customers[1].start, 120);
  assert.equal(relaxed.customers[1].start, 60);
  assert.equal(m.sameDemand(strict, relaxed), true);
  assert.equal(m.snapshot(strict, 59).remakes, 0);
  assert.equal(m.snapshot(strict, 60).remakes, 1);
  assert.equal(m.snapshot(strict, 60).served, 0);
  assert.equal(m.snapshot(strict, 60).correct, 0);
  assert.equal(m.summary(strict).correct, 2);
  assert.equal(m.summary(strict).accepted, 0);
  assert.equal(m.summary(strict).meanTotal, 145);
  assert.equal(m.summary(strict).utilization, 0.15);
  assert.equal(m.summary(relaxed).accepted, 1);
  assert.equal(m.summary(relaxed).correct, 1);
  assert.equal(m.summary(relaxed).meanTotal, 85);
});
test("quality randomness replays independently of staffing and tolerance", () => {
  const a = m.simulate({ ...cfg, mistakes: 40, nolal: 0 });
  const b = m.simulate({ ...cfg, mistakes: 40, nolal: 100, baristas: 4 });
  assert.ok(a.customers.some((c) => c.incident));
  assert.deepEqual(
    a.customers.map((c) => c.incident),
    b.customers.map((c) => c.incident),
  );
  assert.ok(m.sameDemand(a, b));
  assert.equal(m.summary(a).accepted, 0);
  assert.equal(m.summary(b).remakes, 0);
  assert.equal(m.summary(m.simulate({ ...cfg, mistakes: 0 })).remakes, 0);
  for (const x of [
    { mistakes: -1 },
    { mistakes: 41 },
    { nolal: NaN },
    { nolal: 101 },
  ])
    assert.throws(() => m.simulate({ ...cfg, ...x }));
});
test("incident stories follow events and include customer flusters and barista slips", () => {
  const r = m.simulate({ ...cfg, baristas: 2, mistakes: 40, nolal: 100 }, [
    { id: 0, arrival: 0, duration: 60, mishap: 0, acceptance: 0, source: 0 },
    { id: 1, arrival: 0, duration: 60, mishap: 0, acceptance: 0, source: 0.9 },
  ]);
  assert.equal(m.storiesAt(r, 59).length, 0);
  const stories = m.storiesAt(r, 60);
  assert.equal(stories.length, 2);
  assert.match(stories.map((x) => x.text).join(" "), /latte.*sugar/i);
  assert.equal(m.summary(r).accepted, 2);
});

test("quiet counters report real handovers without revealing the future or crowding incidents", () => {
  const r = m.simulate({ ...cfg, baristas: 1, mistakes: 0 }, [
    { id: 0, arrival: 0, duration: 60 },
    { id: 1, arrival: 10, duration: 60 },
    { id: 2, arrival: 20, duration: 60 },
    { id: 3, arrival: 300, duration: 60 },
  ]);
  assert.equal(m.storiesAt(r, 59).length, 0);
  assert.match(m.storiesAt(r, 60)[0]?.text ?? "", /straight to the counter/i);
  assert.equal(m.storiesAt(r, 120).length, 1, "do not narrate every handover");
  assert.match(m.storiesAt(r, 180).at(-1).text, /waited 1\smin 40\ss/);
  assert.ok(m.storiesAt(r, 359).every((e) => e.time <= 359));
  assert.equal(m.storiesAt(r, 360).at(-1).time, 360);
});
