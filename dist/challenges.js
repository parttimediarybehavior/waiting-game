import { formatDuration as fmt } from "./format.js";
import { simulate, summary, sameDemand } from "./simulation.js";
export const CHALLENGES = [
  {
    id: "lines",
    number: "01",
    title: "One line or two?",
    tag: "THE QUEUE EXPERIMENT",
    description:
      "Two baristas. The same drinks. Does one shared line make a difference?",
    instruction:
      "Switch to one shared line, run the café, then compare the average and 90th-percentile waits.",
    control: "policy",
    settings: {
      mistakes: 0,
      seed: 67,
      baristas: 2,
      rate: 2,
      service: 45,
      variability: "high",
      pattern: "unpredictable",
      patience: Infinity,
      policy: "separate",
    },
  },
  {
    id: "rush",
    number: "02",
    title: "The rush-hour squeeze",
    tag: "A LITTLE BREATHING ROOM",
    description:
      "Everyone wants coffee. How many baristas does this rush really need?",
    instruction:
      "Serve at least 90% of arrivals with an average wait of 60 seconds or less. Find the smallest team that does it.",
    control: "baristas",
    settings: {
      mistakes: 0,
      seed: 42,
      baristas: 1,
      rate: 3,
      service: 60,
      variability: "high",
      pattern: "unpredictable",
      patience: 300,
      policy: "shared",
    },
  },
  {
    id: "patience",
    number: "03",
    title: "Where did everyone go?",
    tag: "THE AVERAGE TRAP",
    description:
      "Short waits look great on paper. Unless people are walking out.",
    instruction:
      "Raise patience from 2 to 10 minutes. Run again and compare both waiting times and customers who left.",
    control: "patience",
    settings: {
      mistakes: 0,
      seed: 42,
      baristas: 2,
      rate: 3,
      service: 60,
      variability: "high",
      pattern: "unpredictable",
      patience: 120,
      policy: "shared",
    },
  },
  {
    id: "nolal",
    number: "04",
    title: "Eh, I’ll take it?",
    tag: "THE NOLAL EXPERIMENT",
    description:
      "Fix every wrong drink, or let it slide? The queue feels the difference.",
    instruction:
      "The baseline remakes every mix-up. Raise nolal allowance to 100%, run the same day, and compare intended drinks, accepted mix-ups and walkouts.",
    control: "nolal",
    settings: {
      mistakes: 40,
      nolal: 0,
      seed: 42,
      baristas: 2,
      rate: 2,
      service: 45,
      variability: "high",
      pattern: "unpredictable",
      patience: 300,
      policy: "shared",
    },
  },
];
export const baselineFor = (id, seed) => {
  const c = CHALLENGES.find((c) => c.id === id);
  if (!c) throw new Error("Unknown challenge");
  return simulate({
    ...c.settings,
    ...(id === "rush" && seed !== undefined ? { seed } : {}),
  });
};
export function evaluateChallenge(id, run, answer = "") {
  const c = CHALLENGES.find((c) => c.id === id);
  if (!c) return { passed: false, message: "Choose a challenge first." };
  const baseline = baselineFor(
      id,
      id === "rush" ? run.settings.seed : undefined,
    ),
    s = summary(run),
    b = summary(baseline);
  if (
    !sameDemand(baseline, run) ||
    Object.keys(baseline.settings).some(
      (k) => k !== c.control && baseline.settings[k] !== run.settings[k],
    )
  )
    return {
      passed: false,
      message:
        "Use the challenge’s fixed demand and change only its highlighted control.",
    };
  if (id === "rush") {
    const meetsTarget = (x) =>
      x.arrived > 0 &&
      x.served / x.arrived >= 0.9 &&
      x.meanWait !== null &&
      x.meanWait <= 60;
    const minimum = [1, 2, 3, 4].find((baristas) =>
      meetsTarget(summary(simulate({ ...baseline.settings, baristas }))),
    );
    const met = meetsTarget(s),
      passed = met && run.settings.baristas === minimum;
    const figures = `${s.served} of ${s.arrived} served (${Math.round((100 * s.served) / s.arrived)}%), average wait ${fmt(s.meanWait)}.`;
    const day = ` This day brought ${s.arrived} arrivals; 3 per minute means 60 on average, not a promise. Another day can need a different team.`;
    return {
      passed,
      message:
        figures +
        (passed
          ? ` Target met. The smallest team for this day is ${minimum} baristas. We checked all four team sizes.`
          : met
            ? ` Target met, but ${minimum} baristas also pass. Try that smaller team.`
            : minimum
              ? " Target: at least 90% served and no more than 1 min average wait. Try a larger team."
              : " None of the teams up to four meet both targets on this day. Try another day.") +
        day,
    };
  }
  if (id === "lines") {
    if (run.settings.policy !== "shared")
      return {
        passed: false,
        message: "Try the same customers with one shared line first.",
      };
    const correct =
      s.meanWait < b.meanWait
        ? "shared"
        : s.meanWait > b.meanWait
          ? "separate"
          : "tie";
    return {
      passed: answer === correct,
      message:
        answer === correct
          ? `Exactly. ${correct === "tie" ? "Both policies tie" : correct === "shared" ? "The shared line has the lower average" : "Separate lines have the lower average"} in this run. Check the 90th percentile too; one average does not describe every customer.`
          : answer
            ? `Not quite. The shared line averaged ${fmt(s.meanWait)}; separate lines averaged ${fmt(b.meanWait)}. Choose the smaller wait (or a tie).`
            : "Compare the two average waits, then choose the result you observe.",
    };
  }
  if (id === "nolal") {
    if (run.settings.nolal !== 100)
      return {
        passed: false,
        message:
          "Try 100% nolal allowance first, then compare it with remaking every mix-up.",
      };
    const figures = `Intended drinks: ${b.correct} → ${s.correct}. Accepted mix-ups: ${b.accepted} → ${s.accepted}. Walkouts: ${b.left} → ${s.left}. Average queue wait: ${fmt(b.meanWait)} → ${fmt(s.meanWait)}.`;
    return {
      passed: answer === "tradeoff",
      message:
        answer === "tradeoff"
          ? `Yes. ${figures} More people leave with a drink, but fewer get what they intended. A faster café is not automatically a better café for everyone. This is one synthetic day, not a rule for every café.`
          : answer
            ? `Not quite. ${figures} Count the intended drinks as well as the people served.`
            : "Compare intended drinks and walkouts together. What did accepting the mix-ups change?",
    };
  }
  if (run.settings.patience !== 600)
    return {
      passed: false,
      message:
        "Try 10-minute patience so you can see who the short-patience average leaves out.",
    };
  return {
    passed: answer === "left",
    message:
      answer === "left"
        ? `Yes. ${b.left} customers left the baseline; ${s.left} left this run. The short-patience average hides customers who gave up. Neither waiting time nor departures tells the whole story alone.`
        : answer
          ? `Not quite. An average among served customers excludes everyone who left. Compare the departures: ${b.left} before, ${s.left} now.`
          : "Choose a conclusion below, using both columns of the comparison.",
  };
}
