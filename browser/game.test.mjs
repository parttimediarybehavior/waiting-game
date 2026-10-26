import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
let server,
  browser,
  page,
  errors = [],
  url;
before(async () => {
  await mkdir("artifacts", { recursive: true });
  server = createServer(async (req, res) => {
    try {
      const p = new URL(req.url, "http://localhost").pathname;
      const data = await readFile(
        path.join(process.cwd(), "dist", p === "/" ? "index.html" : p),
      );
      res.setHeader(
        "Content-Type",
        p.endsWith(".js")
          ? "text/javascript"
          : p.endsWith(".css")
            ? "text/css"
            : "text/html",
      );
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ["--no-sandbox"],
  });
});
after(async () => {
  await browser?.close();
  await new Promise((r) => server?.close(r));
});
beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (!r.url().startsWith(url) && !r.url().startsWith("data:"))
      errors.push("Unexpected external request: " + r.url());
  });
  await page.goto(url);
});
afterEach(async (t) => {
  // Capture each final state; CI uploads these only if the job fails.
  await page?.screenshot({
    path: `artifacts/${t.name.replace(/[^a-z0-9]+/gi, "-")}.png`,
    fullPage: true,
  });
  await page?.close();
  assert.deepEqual(errors, []);
});
test("play pause finish, replay and staged settings", async () => {
  assert.equal(
    await page.title(),
    "The Waiting Game — A little café, a big experiment",
  );
  await page.locator("#play").click();
  await page.waitForTimeout(250);
  assert.equal(await page.locator("#play").textContent(), "Pause");
  await page.locator("#play").click();
  const time = await page.locator("#clock").textContent();
  await page.waitForTimeout(150);
  assert.equal(await page.locator("#clock").textContent(), time);
  await page.locator("#finish").click();
  assert.match(await page.locator("#status").textContent(), /complete/i);
  const served = await page.locator("#served").textContent();
  await page.locator("#pin").click();
  await page.locator("#restart").click();
  await page.locator("#finish").click();
  assert.equal(await page.locator("#served").textContent(), served);
  await page.locator("#baristas").selectOption("4");
  assert.match(await page.locator("#pending").textContent(), /new run/i);
  assert.equal(await page.locator("#served").textContent(), served);
  await page.locator("#play").click();
  await page.locator("#finish").click();
  assert.match(
    await page.locator("#comparison-note").textContent(),
    /Same customers/,
  );
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
});
test("all settings, seed validation and different-demand comparison", async () => {
  await page.locator("#finish").click();
  await page.locator("#pin").click();
  for (const [id, value] of [
    ["rate", "3"],
    ["service", "120"],
  ])
    await page.locator("#" + id).fill(value);
  await page.locator("#pattern").selectOption("steady");
  await page.locator("#variability").selectOption("low");
  await page.locator("#patience").selectOption("Infinity");
  await page.locator('[data-policy="separate"]').click();
  await page.locator(".replay-settings summary").click();
  await page.locator("#seed").fill("");
  await page.locator("#play").click();
  assert.match(await page.locator("#error").textContent(), /seed/i);
  await page.locator("#seed").fill("99");
  await page.locator("#play").click();
  await page.locator("#finish").click();
  assert.match(
    await page.locator("#comparison-note").textContent(),
    /Different demand/,
  );
  await page.locator("#speed").selectOption("20");
  await page.locator("#new-seed").click();
  assert.notEqual(await page.locator("#seed").inputValue(), "99");
});
test("three challenges use honest outcomes and can exit", async () => {
  await page.locator('[data-challenge="rush"]').click();
  assert.equal(await page.locator("#rate").isDisabled(), true);
  await page.locator("#finish").click();
  assert.match(
    await page.locator("#challenge-result").textContent(),
    /Target:/,
  );
  await page.locator("#baristas").selectOption("4");
  await page.locator("#play").click();
  await page.locator("#finish").click();
  assert.match(
    await page.locator("#challenge-result").textContent(),
    /Target met/,
  );
  await page.locator('[data-challenge="lines"]').click();
  await page.locator('[data-policy="shared"]').click();
  await page.locator("#play").click();
  await page.locator("#finish").click();
  await page.locator("#answer").selectOption("shared");
  await page.locator("#check-answer").click();
  assert.match(
    await page.locator("#challenge-result").textContent(),
    /Exactly/,
  );
  await page.locator('[data-challenge="patience"]').click();
  await page.locator("#patience").selectOption("600");
  await page.locator("#play").click();
  await page.locator("#finish").click();
  await page.locator("#answer").selectOption("left");
  await page.locator("#check-answer").click();
  assert.match(await page.locator("#challenge-result").textContent(), /Yes/);
  await page.locator("#exit-challenge").click();
  assert.equal(await page.locator("#rate").isDisabled(), false);
  assert.equal(await page.locator("#challenge-panel").isVisible(), false);
});
test("mobile keyboard and reduced motion stay usable under maximum queue load", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#play").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#play").textContent(), "Pause");
  await page.locator("#baristas").selectOption("1");
  await page.locator("#rate").fill("4");
  await page.locator("#service").fill("150");
  await page.locator("#patience").selectOption("Infinity");
  await page.locator("#apply-settings").click();
  await page.locator("#finish").click();
  assert.match(
    await page.locator("#takeaway-title").textContent(),
    /doesn’t make it a short wait/,
  );
  assert.equal(await page.locator("#people .person").count(), 0);
  assert.doesNotMatch(
    await page.locator("#comparison-body").textContent(),
    /1 baristas/,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
});

test("comparison identifies settings and keyboard can run a visible live café", async () => {
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement.id), "play");
  await page.keyboard.press("Enter");
  await page.locator("#speed").selectOption("20");
  await page.waitForFunction(
    () =>
      Number(document.querySelector("#clock").textContent.split(":")[0]) >= 2,
  );
  assert.ok((await page.locator("#people .person").count()) > 0);
  assert.match(
    await page.locator("#scene").getAttribute("aria-label"),
    /customers? being served/,
  );
  await page.screenshot({ path: "artifacts/live-desktop.png", fullPage: true });
  await page.locator("#finish").click();
  await page.locator("#pin").click();
  await page.locator("#baristas").selectOption("4");
  await page.locator("#play").click();
  await page.locator("#finish").click();
  assert.match(
    await page.locator("#comparison-body").textContent(),
    /2 baristas.*shared/,
  );
  assert.match(
    await page.locator("#comparison-body").textContent(),
    /4 baristas.*shared/,
  );
});

test("staged edits and new customers preserve Pause and Resume until explicit apply", async () => {
  await page.locator("#play").click();
  await page.locator("#baristas").selectOption("1");
  assert.equal(await page.locator("#play").textContent(), "Pause");
  await page.locator("#play").click();
  assert.equal(await page.locator("#play").textContent(), "Resume");
  const before = await page.locator("#clock").textContent();
  await page.locator(".replay-settings summary").click();
  await page.locator("#new-seed").click();
  await page.waitForTimeout(200);
  assert.equal(await page.locator("#clock").textContent(), before);
  assert.equal(await page.locator("#play").textContent(), "Resume");
  await page.locator("#apply-settings").click();
  assert.equal(await page.locator("#play").textContent(), "Pause");
  assert.match(
    await page.locator("#scene").getAttribute("aria-label"),
    /^1 barista\./,
  );
});
test("experiments explain wrong answers and distinguish a new day from a running café", async () => {
  await page.locator('[data-challenge="lines"]').click();
  assert.doesNotMatch(
    await page.locator("#comparison-body").textContent(),
    /Run in progress/,
  );
  await page.locator('[data-policy="shared"]').click();
  await page.locator("#play").click();
  await page.locator("#finish").click();
  const initial = await page.locator("#challenge-result").textContent();
  await page.locator("#answer").selectOption("separate");
  await page.locator("#check-answer").click();
  assert.notEqual(
    await page.locator("#challenge-result").textContent(),
    initial,
  );
  assert.match(
    await page.locator("#challenge-result").textContent(),
    /Not quite/,
  );
  await page.locator('[data-challenge="rush"]').click();
  await page.locator("#baristas").selectOption("4");
  await page.locator("#play").click();
  await page.locator("#finish").click();
  assert.match(
    await page.locator("#challenge-result").textContent(),
    /smallest.*4 baristas/,
  );
  await page.locator("#another-day").click();
  assert.equal(await page.locator("#seed").inputValue(), "2");
  assert.match(await page.locator("#status").textContent(), /Ready/);
  await page.locator("#baristas").selectOption("3");
  await page.locator("#play").click();
  await page.locator("#finish").click();
  assert.match(
    await page.locator("#challenge-result").textContent(),
    /smallest.*3 baristas/,
  );
});
test("nolal comparisons reveal imperfect drinks and real remake costs without changing demand", async () => {
  page.setDefaultTimeout(3000);
  await page.locator("#mistakes").fill("40");
  await page.locator("#nolal").fill("0");
  await page.locator("#patience").selectOption("Infinity");
  await page.locator("#play").click();
  await page.locator("#finish").click();
  const strictTime = await page.locator("#total-time").textContent();
  assert.equal(await page.locator("#accepted").textContent(), "0");
  assert.ok(Number(await page.locator("#remakes").textContent()) > 0);
  assert.equal(await page.locator("#people .person").count(), 0);
  await page.locator("#pin").click();
  await page.locator("#nolal").fill("100");
  await page.locator("#play").click();
  await page.locator("#finish").click();
  assert.equal(await page.locator("#remakes").textContent(), "0");
  assert.ok(Number(await page.locator("#accepted").textContent()) > 0);
  assert.notEqual(await page.locator("#total-time").textContent(), strictTime);
  assert.match(
    await page.locator("#comparison-note").textContent(),
    /Same customers/,
  );
  assert.match(
    await page.locator("#comparison-body").textContent(),
    /0%.*100%/,
  );
  assert.match(await page.locator("#stories").textContent(), /Nolal/);
  assert.match(await page.locator("#takeaway-title").textContent(), /intended/);
  assert.match(
    await page.locator("#history button").first().textContent(),
    /^Run #2/,
  );
  assert.match(
    await page.locator("#history button").nth(1).textContent(),
    /Pinned/,
  );
  const quality = await page.locator("#accepted").textContent();
  await page.locator("#restart").click();
  assert.doesNotMatch(
    await page.locator("#stories").textContent(),
    /Latte can be tomorrow/,
  );
  await page.locator("#finish").click();
  assert.equal(await page.locator("#accepted").textContent(), quality);
  await page.screenshot({
    path: "artifacts/nolal-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator(".about-link").isVisible(), true);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({ path: "artifacts/nolal-mobile.png", fullPage: true });
});

test("nolal experiment exposes both sides of accepting a mix-up", async () => {
  assert.equal(await page.locator('[data-challenge="nolal"]').count(), 1);
  await page.locator('[data-challenge="nolal"]').click();
  assert.equal(await page.locator("#nolal").isEnabled(), true);
  assert.equal(await page.locator("#mistakes").isDisabled(), true);
  assert.doesNotMatch(
    await page.locator("#locked-note").textContent(),
    /mix-ups are off/,
  );
  await page.locator("#nolal").fill("100");
  await page.locator("#play").click();
  await page.locator("#finish").click();
  await page.locator("#answer").selectOption("everyone");
  await page.locator("#check-answer").click();
  assert.match(
    await page.locator("#challenge-result").textContent(),
    /Not quite/,
  );
  await page.locator("#answer").selectOption("tradeoff");
  await page.locator("#check-answer").click();
  assert.match(
    await page.locator('[data-challenge="nolal"]').textContent(),
    /Explored/,
  );
  assert.equal(await page.locator("#correct").textContent(), "39");
  assert.equal(await page.locator("#accepted").textContent(), "14");
});

test("small phones keep playback controls and duration units in view", async () => {
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 800 });
    await page.locator("#finish").click();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    );
    const box = await page.locator("#finish").boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width, "finish is reachable");
    // A duration may wrap between pairs, never between a number and its unit.
    assert.ok(
      await page.locator("#mean-wait").evaluate((el) => {
        const text = el.firstChild;
        const s = text.textContent;
        const index = s.lastIndexOf("s");
        const range = document.createRange();
        range.setStart(text, index - 2);
        range.setEnd(text, index + 1);
        return range.getClientRects().length === 1;
      }),
    );
  }
});
