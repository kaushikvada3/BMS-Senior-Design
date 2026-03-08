import { createBootLiquidRenderer } from "./boot-liquid.js";

const sourceCanvas = document.getElementById("startup-source-canvas");
const liquidCanvas = document.getElementById("startup-liquid-canvas");
const stageEl = document.getElementById("startup-stage");
const detailEl = document.getElementById("startup-detail");
const percentEl = document.getElementById("startup-percent");
const progressFillEl = document.getElementById("startup-progress-fill");

const EXIT_DURATION_MS = 760;
const TARGET_FPS = 45;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
const STAGE_LABELS = {
  bootstrap: "Initializing dashboard...",
  modelDownload: "Loading 3D model...",
  modelProcess: "Preparing 3D model...",
  finalize: "Finalizing startup...",
};

const state = {
  stage: "bootstrap",
  stageLabel: "",
  detail: "Preparing startup surface...",
  percent: 0,
  bytesLoaded: 0,
  bytesTotal: 0,
  ready: false,
  errored: false,
};
const noopRenderer = {
  ready: false,
  render() {},
  resize() {},
  destroy() {},
};

const sourceCtx = sourceCanvas.getContext("2d", { alpha: true });
let liquidRenderer = createBootLiquidRenderer({
  canvas: liquidCanvas,
  sourceCanvas,
});
let sourceSize = { width: 1, height: 1 };
let animationFrameId = 0;
let lastFrameAt = 0;
let exitStarted = false;

if (!sourceCtx) {
  liquidRenderer.destroy();
  liquidRenderer = noopRenderer;
}

if (!sourceCtx || !liquidRenderer.ready) {
  document.body.classList.add("no-shader");
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function formatBytes(value) {
  const size = Math.max(0, Number(value) || 0);
  if (size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const scaled = size / (1024 ** exponent);
  if (exponent === 0) {
    return `${Math.round(scaled)} ${units[exponent]}`;
  }
  return `${scaled.toFixed(1)} ${units[exponent]}`;
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function resizeSourceCanvas() {
  const viewportWidth = Math.max(1, window.innerWidth || 1);
  const viewportHeight = Math.max(1, window.innerHeight || 1);
  const aspect = viewportWidth / viewportHeight;

  let width = 960;
  let height = Math.round(width / aspect);
  if (height > 560) {
    height = 560;
    width = Math.round(height * aspect);
  }
  if (width < 640) {
    width = 640;
    height = Math.round(width / aspect);
  }
  if (height < 360) {
    height = 360;
    width = Math.round(height * aspect);
  }

  sourceCanvas.width = width;
  sourceCanvas.height = height;
  sourceSize = { width, height };

  if (liquidRenderer.ready) {
    liquidRenderer.resize();
  }
}

function drawAmbientGlow(ctx, x, y, radius, colorStops) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  for (const stop of colorStops) {
    gradient.addColorStop(stop.at, stop.color);
  }
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawTelemetryCard(ctx, x, y, width, height, alpha) {
  ctx.save();
  roundedRectPath(ctx, x, y, width, height, 18);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 1.8})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  const barInset = 16;
  const lineY = y + 18;
  for (let index = 0; index < 3; index += 1) {
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * (0.85 - (index * 0.18))})`;
    roundedRectPath(ctx, x + barInset, lineY + (index * 18), width - (barInset * 2), 6, 3);
    ctx.fill();
  }
  ctx.restore();
}

function renderSourceScene(nowMs) {
  if (!sourceCtx) return;

  const { width, height } = sourceSize;
  const time = nowMs * 0.001;
  sourceCtx.clearRect(0, 0, width, height);

  const baseGradient = sourceCtx.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, "rgba(12, 18, 28, 0.72)");
  baseGradient.addColorStop(0.55, "rgba(18, 24, 34, 0.42)");
  baseGradient.addColorStop(1, "rgba(7, 10, 16, 0.74)");
  sourceCtx.fillStyle = baseGradient;
  sourceCtx.fillRect(0, 0, width, height);

  drawAmbientGlow(sourceCtx, width * 0.22, height * 0.28, width * 0.38, [
    { at: 0, color: "rgba(255, 255, 255, 0.10)" },
    { at: 0.45, color: "rgba(208, 216, 228, 0.06)" },
    { at: 1, color: "rgba(255, 255, 255, 0)" },
  ]);
  drawAmbientGlow(sourceCtx, width * 0.78, height * 0.72, width * 0.34, [
    { at: 0, color: "rgba(245, 239, 232, 0.08)" },
    { at: 0.48, color: "rgba(231, 236, 246, 0.05)" },
    { at: 1, color: "rgba(255, 255, 255, 0)" },
  ]);

  sourceCtx.save();
  sourceCtx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  sourceCtx.lineWidth = 1;
  const gridGap = 34;
  for (let x = -gridGap; x < width + gridGap; x += gridGap) {
    const offset = Math.sin((time * 0.8) + (x * 0.012)) * 4;
    sourceCtx.beginPath();
    sourceCtx.moveTo(x + offset, 0);
    sourceCtx.lineTo(x - offset, height);
    sourceCtx.stroke();
  }
  sourceCtx.restore();

  const drift = Math.sin(time * 0.7) * 14;
  drawTelemetryCard(sourceCtx, width * 0.08 + drift, height * 0.14, width * 0.22, height * 0.24, 0.045);
  drawTelemetryCard(sourceCtx, width * 0.70 - drift, height * 0.18, width * 0.18, height * 0.18, 0.04);
  drawTelemetryCard(sourceCtx, width * 0.12 - drift * 0.35, height * 0.66, width * 0.20, height * 0.16, 0.035);
  drawTelemetryCard(sourceCtx, width * 0.66 + drift * 0.3, height * 0.64, width * 0.22, height * 0.20, 0.04);

  const centerX = width * 0.5;
  const centerY = height * 0.5;
  sourceCtx.save();
  sourceCtx.translate(centerX, centerY);
  sourceCtx.rotate(time * 0.12);
  sourceCtx.strokeStyle = "rgba(255, 255, 255, 0.10)";
  sourceCtx.lineWidth = 1.5;
  sourceCtx.beginPath();
  sourceCtx.arc(0, 0, Math.min(width, height) * 0.16, 0, Math.PI * 2);
  sourceCtx.stroke();
  sourceCtx.beginPath();
  sourceCtx.arc(0, 0, Math.min(width, height) * 0.11, 0, Math.PI * 2);
  sourceCtx.stroke();
  sourceCtx.restore();

  drawAmbientGlow(sourceCtx, centerX, centerY, Math.min(width, height) * 0.18, [
    { at: 0, color: "rgba(255, 255, 255, 0.09)" },
    { at: 0.52, color: "rgba(255, 255, 255, 0.04)" },
    { at: 1, color: "rgba(255, 255, 255, 0)" },
  ]);

  sourceCtx.save();
  sourceCtx.globalCompositeOperation = "lighter";
  sourceCtx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  sourceCtx.lineWidth = 2;
  sourceCtx.beginPath();
  sourceCtx.moveTo(width * 0.24, centerY);
  sourceCtx.lineTo(width * 0.40, centerY);
  sourceCtx.moveTo(width * 0.60, centerY);
  sourceCtx.lineTo(width * 0.76, centerY);
  sourceCtx.stroke();
  sourceCtx.restore();
}

function resolveStageLabel(nextState) {
  const explicitLabel = String(nextState.stageLabel || "").trim();
  if (explicitLabel) {
    return explicitLabel;
  }
  return STAGE_LABELS[nextState.stage] || "Initializing dashboard...";
}

function resolveDetail(nextState) {
  const explicitDetail = String(nextState.detail || "").trim();
  if (explicitDetail) {
    return explicitDetail;
  }
  if (nextState.bytesTotal > 0) {
    return `${formatBytes(nextState.bytesLoaded)} / ${formatBytes(nextState.bytesTotal)}`;
  }
  if (nextState.bytesLoaded > 0) {
    return `${formatBytes(nextState.bytesLoaded)} loaded`;
  }
  if (nextState.errored) {
    return "The startup flow reported an error.";
  }
  if (nextState.ready) {
    return "Preparing dashboard handoff...";
  }
  return "Preparing startup surface...";
}

function applyState(patch = {}) {
  Object.assign(state, patch || {});

  const percent = clamp01((Number(state.percent) || 0) / 100);
  stageEl.textContent = resolveStageLabel(state);
  detailEl.textContent = resolveDetail(state);
  percentEl.textContent = `${Math.round(percent * 100)}%`;
  progressFillEl.style.transform = `scaleX(${percent.toFixed(4)})`;

  document.body.classList.toggle("is-error", Boolean(state.errored));
  document.body.classList.toggle("is-ready", Boolean(state.ready));
}

function frame(nowMs) {
  animationFrameId = window.requestAnimationFrame(frame);
  if ((nowMs - lastFrameAt) < FRAME_INTERVAL_MS) {
    return;
  }
  lastFrameAt = nowMs;
  renderSourceScene(nowMs);
  if (liquidRenderer.ready) {
    liquidRenderer.render(nowMs);
  }
}

function handleResize() {
  resizeSourceCanvas();
}

window.__bmsStartupApplyState = function __bmsStartupApplyState(nextState) {
  applyState(nextState);
  return { ok: true };
};

window.__bmsStartExitTransition = function __bmsStartExitTransition(reason) {
  if (!exitStarted) {
    exitStarted = true;
    document.body.dataset.exitReason = reason || "";
    document.body.classList.add("is-exiting");
  }
  return EXIT_DURATION_MS;
};

window.addEventListener("resize", handleResize, { passive: true });
window.addEventListener("beforeunload", () => {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
  }
  if (liquidRenderer.ready) {
    liquidRenderer.destroy();
  }
});

resizeSourceCanvas();
applyState();
animationFrameId = window.requestAnimationFrame(frame);
