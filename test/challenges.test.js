import test from "node:test";
import assert from "node:assert/strict";
import { simulate, summary, sameDemand } from "../dist/simulation.js";
const c = await import("../dist/challenges.js").catch(() => ({}));
test("four usable challenge definitions", () =>
  assert.equal(c.CHALLENGES?.length, 4));
test("queue lesson requires comparison and measured answer", () => {
  const b = c.baselineFor("lines"),
    r = simulate({ ...b.settings, policy: "shared" });
  const a = summary(b),
    s = summary(r);
  const answer =
    s.meanWait < a.meanWait
      ? "shared"
      : s.meanWait > a.meanWait
        ? "separate"
        : "tie";
  assert.equal(c.evaluateChallenge("lines", b, answer).passed, false);
  assert.equal(c.evaluateChallenge("lines", r, answer).passed, true);
  assert.equal(c.evaluateChallenge("lines", r, "wrong").passed, false);
  assert.equal(
    c.evaluateChallenge("lines", simulate({ ...r.settings, rate: 1 }), answer)
      .passed,
    false,
  );
});
test("staffing target fails baseline and can be met within four baristas", () => {
  const b = c.baselineFor("rush");
  assert.equal(c.evaluateChallenge("rush", b).passed, false);
  let feasible = [];
  for (let n = 1; n <= 4; n++) {
    const r = simulate({ ...b.settings, baristas: n });
    assert.ok(sameDemand(b, r));
    if (c.evaluateChallenge("rush", r).passed) feasible.push(n);
  }
  assert.ok(feasible.length > 0);
  assert.ok(feasible[0] > 1);
});
test("abandonment lesson exposes selection bias and requires longer patience", () => {
  const b = c.baselineFor("patience"),
    r = simulate({ ...b.settings, patience: 600 });
  assert.ok(summary(b).left > summary(r).left);
  assert.ok(summary(b).meanWait < summary(r).meanWait);
  assert.equal(c.evaluateChallenge("patience", b, "left").passed, false);
  assert.equal(c.evaluateChallenge("patience", r, "mean").passed, false);
  assert.equal(c.evaluateChallenge("patience", r, "left").passed, true);
});

test("wrong conclusions provide feedback distinct from the unanswered question", () => {
  for (const [id, change, wrong] of [
    ["lines", { policy: "shared" }, "separate"],
    ["patience", { patience: 600 }, "mean"],
  ]) {
    const r = simulate({ ...c.baselineFor(id).settings, ...change });
    const result = c.evaluateChallenge(id, r, wrong);
    assert.equal(result.passed, false);
    assert.notEqual(result.message, c.evaluateChallenge(id, r).message);
    assert.match(result.message, /not quite/i);
  }
});
test("staffing confirms the measured minimum for each day, not any passing team", () => {
  const day1 = simulate({ ...c.baselineFor("rush").settings, baristas: 4 });
  const answer = c.evaluateChallenge("rush", day1);
  assert.match(answer.message, /smallest.*4 baristas/i);
  const day2 = c.baselineFor("rush", 2);
  assert.equal(day2.settings.seed, 2);
  const three = c.evaluateChallenge(
    "rush",
    simulate({ ...day2.settings, baristas: 3 }),
  );
  const four = c.evaluateChallenge(
    "rush",
    simulate({ ...day2.settings, baristas: 4 }),
  );
  assert.equal(three.passed, true);
  assert.equal(four.passed, false);
  assert.match(three.message, /smallest.*3 baristas/i);
  assert.match(four.message, /3 baristas/i);
});

test("nolal lesson requires the tradeoff on the same day", () => {
  const definition = c.CHALLENGES.find((x) => x.id === "nolal");
  assert.ok(definition, "fourth experiment exists");
  const baseline = c.baselineFor("nolal");
  const relaxed = simulate({ ...baseline.settings, nolal: 100 });
  assert.ok(sameDemand(baseline, relaxed));
  const a = summary(baseline),
    b = summary(relaxed);
  assert.deepEqual([a.correct, a.accepted, a.left], [44, 0, 9]);
  assert.deepEqual([b.correct, b.accepted, b.left], [39, 14, 0]);
  assert.equal(
    c.evaluateChallenge("nolal", baseline, "tradeoff").passed,
    false,
  );
  assert.equal(c.evaluateChallenge("nolal", relaxed, "tradeoff").passed, true);
  const wrong = c.evaluateChallenge("nolal", relaxed, "everyone");
  assert.equal(wrong.passed, false);
  assert.match(wrong.message, /44.*39/);
  assert.notEqual(wrong.message, c.evaluateChallenge("nolal", relaxed).message);
  assert.equal(
    c.evaluateChallenge(
      "nolal",
      simulate({ ...relaxed.settings, mistakes: 0 }),
      "tradeoff",
    ).passed,
    false,
  );
});
