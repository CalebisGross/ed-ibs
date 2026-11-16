import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const url = process.env.ED_IBS_URL ?? "http://127.0.0.1:43117/";
const chrome = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const outDir = process.env.ARTIFACT_DIR ?? "/opt/cursor/artifacts";

const consoleMessages = [];
const pageErrors = [];
await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--use-gl=angle",
    "--window-size=1440,900",
  ],
});

const page = await browser.newPage();
page.on("console", (message) => {
  consoleMessages.push({ type: message.type(), text: message.text() });
});
page.on("pageerror", (error) => {
  pageErrors.push(String(error));
});
page.on("response", (response) => {
  if (response.status() >= 400) {
    consoleMessages.push({ type: "error", text: `${response.status()} ${response.url()}` });
  }
});

async function text(id) {
  return page.$eval(`[data-testid="${id}"]`, (node) => node.textContent ?? "");
}

async function setRange(testId, value) {
  await page.$eval(
    `[data-testid="${testId}"]`,
    (element, next) => {
      const input = element;
      const prototype = Object.getPrototypeOf(input);
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      setter?.call(input, String(next));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value,
  );
}

async function assertPanelsDisjoint(page, label) {
  const hits = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("section.pane, .see-why-panel, .replay-scrubber, .stage-rail")];
    const boxes = nodes
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          node,
          id: node.getAttribute("data-testid") || String(node.className),
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((box) => box.width > 2 && box.height > 2);
    const found = [];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.node.contains(b.node) || b.node.contains(a.node)) continue;
        const overlapW = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapH = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapW > 1 && overlapH > 1) {
          found.push(`${a.id} overlaps ${b.id} by ${Math.round(overlapW)}x${Math.round(overlapH)}`);
        }
      }
    }
    return found;
  });
  if (hits.length > 0) throw new Error(`Overlapping panels at ${label}: ${hits.join("; ")}`);
}

/**
 * Panel boxes can be disjoint while the words inside them collide, sit on a plot,
 * or render too small to read. This checks the ink, not the panel chrome.
 */
async function assertReadableCopy(page, label) {
  const hits = await page.evaluate(() => {
    const hosts = [
      ...document.querySelectorAll(
        [
          ".see-why-box",
          ".see-why-readouts dt",
          ".see-why-readouts dd",
          ".see-why-heat-col",
          ".see-why-heat-row",
          ".see-why-heat-corner",
          ".see-why-cell",
          ".see-why-tick",
          ".see-why-axis-label",
          ".see-why-legend li",
          ".see-why h2",
          ".see-why h3",
          ".see-why-panel-head p",
          ".plot-caption",
          ".readouts dt",
          ".readouts dd",
          ".bench .fader > span",
          ".bench .fader b",
          ".bench .fader small",
          ".bench .status-item b",
          ".bench .status-item div",
          ".bench .status-item small",
          ".bench .pane-head p",
          ".bench .legend p",
          ".bench .conflict p",
          ".bench .note",
        ].join(", "),
      ),
    ];
    const overlap = (a, b) => {
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return w > 1 && h > 1;
    };
    const inkOf = (node) => {
      const found = [];
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const value = walker.currentNode.textContent ?? "";
        if (!value.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        for (const rect of range.getClientRects()) {
          if (rect.width > 1 && rect.height > 1) found.push(rect);
        }
      }
      return found;
    };
    const onScreen = (rect) =>
      rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    const clipAmount = (rect, node) => {
      let worst = 0;
      let parent = node.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        const clips = ["hidden", "clip", "auto", "scroll"].includes(style.overflowX) || ["hidden", "clip", "auto", "scroll"].includes(style.overflowY);
        if (clips) {
          const box = parent.getBoundingClientRect();
          if (overlap(rect, box)) {
            const past = Math.max(box.left - rect.left, rect.right - box.right, box.top - rect.top, rect.bottom - box.bottom, 0);
            if (past > worst) worst = past;
          }
        }
        parent = parent.parentElement;
      }
      return worst;
    };
    const items = hosts.map((node) => ({
      node,
      label: (node.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 48),
      ink: inkOf(node).filter((rect) => onScreen(rect) && clipAmount(rect, node) <= 2),
    }));
    const found = [];
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        if (a.node.contains(b.node) || b.node.contains(a.node)) continue;
        const hit = a.ink.some((left) => b.ink.some((right) => overlap(left, right)));
        if (hit) found.push(`overlap "${a.label}" x "${b.label}"`);
      }
    }
    const plots = [...document.querySelectorAll(".see-why-plot-frame, .plot-host canvas")];
    for (const item of items) {
      if (item.node.classList.contains("see-why-tick") || item.node.classList.contains("see-why-axis-label")) {
        for (const plot of document.querySelectorAll(".see-why-plot-frame")) {
          const frame = plot.getBoundingClientRect();
          if (item.ink.some((rect) => overlap(rect, frame))) found.push(`on plot "${item.label}"`);
        }
        continue;
      }
      for (const plot of plots) {
        const frame = plot.getBoundingClientRect();
        if (item.ink.some((rect) => overlap(rect, frame))) found.push(`on plot "${item.label}"`);
      }
    }
    for (const tick of document.querySelectorAll(".see-why-tick")) {
      for (const rect of inkOf(tick)) {
        if (!onScreen(rect) || clipAmount(rect, tick) > 2) continue;
        if (rect.height < 9) found.push(`tick ${rect.height.toFixed(1)}px "${(tick.textContent ?? "").trim()}"`);
      }
    }
    const fullyOutside = (rect, node) => {
      let parent = node.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        const clipsY = ["hidden", "clip", "auto", "scroll"].includes(style.overflowY);
        const clipsX = ["hidden", "clip", "auto", "scroll"].includes(style.overflowX);
        if (clipsY) {
          const box = parent.getBoundingClientRect();
          if (box.width > 2 && box.height > 2 && onScreen(box) && !overlap(rect, box)) {
            const verticalMiss = rect.bottom < box.top + 1 || rect.top > box.bottom - 1;
            if (verticalMiss) return true;
          }
        }
        parent = parent.parentElement;
      }
      return false;
    };
    for (const item of items) {
      const rects = inkOf(item.node);
      const past = rects.some((rect) => onScreen(rect) && clipAmount(rect, item.node) > 2);
      const buried = rects.some((rect) => fullyOutside(rect, item.node));
      if (past || buried) found.push(`clipped "${item.label}"`);
    }
    for (const node of document.querySelectorAll(".bench .viewport-host")) {
      const box = node.getBoundingClientRect();
      if (box.width < 2) continue;
      if (box.height < 200) found.push(`viewport ${Math.round(box.height)}px tall`);
    }
    return found.slice(0, 12);
  });
  if (hits.length > 0) throw new Error(`Unreadable copy at ${label}: ${hits.join("; ")}`);
}

async function clickButton(label) {
  await page.evaluate((name) => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === name);
    if (!button) throw new Error(`Missing button ${name}`);
    button.click();
  }, label);
}

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
// Chrome 157 does not emit the networkIdle lifecycle event for this document
// even after every resource has finished. Wait for load, then for Puppeteer's
// in-flight request count to stay at zero. The later solver checks still gate readiness.
await page.goto(url, { waitUntil: "load", timeout: 30000 });
await page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 });
await page.waitForSelector('[data-testid="pane-stage"]');
await page.waitForFunction(() => {
  const step = document.querySelector('[data-testid="sim-step"]')?.textContent ?? "";
  const match = step.match(/(\d+)/);
  return match !== null && Number(match[1]) > 40;
}, { timeout: 10000 });
await page.waitForFunction(() => (document.querySelector('[data-testid="stage-status"]')?.textContent ?? "").includes("live rays"), {
  timeout: 8000,
});
await assertPanelsDisjoint(page, "stage 1440x900");
await assertReadableCopy(page, "stage 1440x900");
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
await assertPanelsDisjoint(page, "stage 1280x800");
await assertReadableCopy(page, "stage 1280x800");
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

await setRange("persistence", 450);
await new Promise((resolve) => setTimeout(resolve, 1200));
const audienceStatus = await text("stage-status");
const stageHost = await page.$eval('[data-testid="stage-canvas-host"]', (node) => ({
  width: node.clientWidth,
  height: node.clientHeight,
}));
await page.screenshot({ path: `${outDir}/stage-audience.png`, fullPage: false });
await page.click('[data-testid="cam-side"]');
await new Promise((resolve) => setTimeout(resolve, 500));
await page.screenshot({ path: `${outDir}/stage-side.png`, fullPage: false });
await page.click('[data-testid="cam-fixture"]');
await new Promise((resolve) => setTimeout(resolve, 400));
await page.screenshot({ path: `${outDir}/stage-fixture.png`, fullPage: false });
await page.click('[data-testid="cam-audience"]');

await setRange("throw-slider", 22);
await page.waitForFunction(() => (document.querySelector('[data-testid="stage-status"]')?.textContent ?? "").includes("throw 22.0 m"), {
  timeout: 4000,
});
const afterThrow = await text("stage-status");

await page.click('[data-testid="btn-pause"]');
await page.waitForFunction(() => (document.querySelector('[data-testid="stage-status"]')?.textContent ?? "").includes("paused"));
await new Promise((resolve) => setTimeout(resolve, 250));
const pausedStep = await text("sim-step");
await new Promise((resolve) => setTimeout(resolve, 500));
const pausedStepLater = await text("sim-step");
await page.click('[data-testid="btn-pause"]');

await page.click('[data-testid="btn-power-cut"]');
await page.waitForFunction(() => (document.querySelector('[data-testid="stage-status"]')?.textContent ?? "").includes("source off"), {
  timeout: 4000,
});
const sourceOff = await text("stage-status");
await page.screenshot({ path: `${outDir}/stage-source-off.png`, fullPage: false });
await clickButton("Restore power");
await page.waitForFunction(() => {
  const status = document.querySelector('[data-testid="stage-status"]')?.textContent ?? "";
  return status.includes("source") && !status.includes("source off");
}, { timeout: 4000 });

await page.click('[data-testid="mode-engineering"]');
await page.waitForSelector('[data-testid="pane-mechanical"]');
await page.waitForFunction(() => document.querySelectorAll("section.pane h2").length >= 4);
const engineeringPanes = await page.$$eval("section.pane h2", (nodes) => nodes.map((node) => node.textContent));
await assertPanelsDisjoint(page, "engineering 1440x900");
await assertReadableCopy(page, "engineering 1440x900");
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
await assertPanelsDisjoint(page, "engineering 1280x800");
await assertReadableCopy(page, "engineering 1280x800");
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
await page.screenshot({ path: `${outDir}/workbench-desktop.png`, fullPage: false });

const before = {
  frequency: await text("readout-frequency"),
  amplitude: await text("readout-amplitude"),
  step: await text("sim-step"),
  state: await text("sim-state"),
  webgl: await text("webgl-status"),
};

await setRange("fader-curb", 1000);
await page.waitForFunction(() => {
  const freq = document.querySelector('[data-testid="readout-frequency"]')?.textContent ?? "";
  return freq.includes("11.");
}, { timeout: 5000 });
const afterCurb = await text("readout-frequency");
await setRange("thickness", 160);
await new Promise((resolve) => setTimeout(resolve, 200));
const afterThickness = await text("readout-frequency");

await setRange("fader-torque", 0);
await setRange("fader-brake", 1000);
const amplitudeBeforeBrake = await text("readout-amplitude");
await new Promise((resolve) => setTimeout(resolve, 1200));
const amplitudeAfterBrake = await text("readout-amplitude");

await page.click('[data-testid="btn-pause"]');
await page.waitForFunction(() => document.querySelector('[data-testid="sim-state"]')?.textContent === "paused");
const engineeringPaused = await text("sim-step");
await page.click('[data-testid="btn-reset"]');
await page.waitForFunction(() => (document.querySelector('[data-testid="sim-step"]')?.textContent ?? "").includes("step 0"));
const afterReset = await text("sim-step");
await page.click('[data-testid="btn-chopper"]');
const chopper = await text("btn-chopper");

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.click('[data-testid="mode-stage"]');
await page.waitForSelector('[data-testid="pane-stage"]');
await new Promise((resolve) => setTimeout(resolve, 400));
const mobileHost = await page.$eval('[data-testid="stage-canvas-host"]', (node) => ({
  width: node.clientWidth,
  height: node.clientHeight,
}));
await page.screenshot({ path: `${outDir}/stage-mobile.png`, fullPage: false });

const fps = await text("readout-fps");
const errors = consoleMessages.filter((message) => message.type === "error");
const report = {
  url,
  chrome,
  userAgent: await browser.userAgent(),
  audienceStatus,
  stageHost,
  afterThrow,
  pausedStep,
  pausedStepLater,
  sourceOff,
  engineeringPanes,
  before,
  afterCurb,
  afterThickness,
  amplitudeBeforeBrake,
  amplitudeAfterBrake,
  engineeringPaused,
  afterReset,
  chopper,
  mobileHost,
  fps,
  consoleErrors: errors,
  pageErrors,
  consoleMessages,
};
await writeFile(`${outDir}/browser-verify.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
