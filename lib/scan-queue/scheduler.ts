import { processNextInQueue } from "./process-next";

const TICK_INTERVAL_MS = 17 * 60 * 1000;
const MAX_RUNTIME_MS = 3 * 24 * 60 * 60 * 1000;
const QUIET_START_HOUR_UTC = 0;
const QUIET_END_HOUR_UTC = 12;

let timer: ReturnType<typeof setInterval> | null = null;
let startedAt: Date | null = null;
let lastTickAt: Date | null = null;
let lastResult: string | null = null;
let totalProcessed = 0;
let totalFailed = 0;
let stopReason: string | null = null;
let tickInProgress = false;
let generation = 0;

function isQuietHours(): boolean {
  const hour = new Date().getUTCHours();
  if (QUIET_START_HOUR_UTC < QUIET_END_HOUR_UTC) {
    return hour >= QUIET_START_HOUR_UTC && hour < QUIET_END_HOUR_UTC;
  }
  return hour >= QUIET_START_HOUR_UTC || hour < QUIET_END_HOUR_UTC;
}

function isExpired(): boolean {
  if (!startedAt) return true;
  return Date.now() - startedAt.getTime() > MAX_RUNTIME_MS;
}

async function tick() {
  if (tickInProgress) return;
  tickInProgress = true;
  const myGeneration = generation;

  try {
    if (myGeneration !== generation) return;

    if (isExpired()) {
      stopScheduler("auto_expired_3d");
      return;
    }

    if (isQuietHours()) {
      lastResult = "skipped: quiet hours";
      lastTickAt = new Date();
      return;
    }

    const result = await processNextInQueue();

    if (myGeneration !== generation) return;

    lastTickAt = new Date();

    if (!result) {
      stopScheduler("queue_empty");
      return;
    }

    if (result.success) {
      totalProcessed++;
      lastResult = `scanned ${result.domain} → ${result.score}`;
    } else {
      totalFailed++;
      lastResult = `failed: ${result.domain} — ${result.error}`;
    }
  } catch (err) {
    if (myGeneration === generation) {
      lastResult = `error: ${err instanceof Error ? err.message : "unknown"}`;
    }
  } finally {
    if (myGeneration === generation) {
      tickInProgress = false;
    }
  }
}

export function startScheduler(): { success: boolean; message: string } {
  if (timer) {
    return { success: false, message: "Scheduler is already running" };
  }

  startedAt = new Date();
  totalProcessed = 0;
  totalFailed = 0;
  stopReason = null;
  lastResult = null;
  lastTickAt = null;
  tickInProgress = false;

  console.log("[scan-scheduler] started");

  tick();

  timer = setInterval(tick, TICK_INTERVAL_MS);

  return { success: true, message: "Scheduler started — will auto-stop after 3 days" };
}

export function stopScheduler(reason = "manual"): { success: boolean; message: string } {
  stopReason = reason;

  if (!timer) {
    return { success: false, message: "Scheduler is not running" };
  }

  clearInterval(timer);
  timer = null;
  generation++;

  console.log(`[scan-scheduler] stopped (${reason})`);

  return { success: true, message: `Scheduler stopped (${reason})` };
}

export function getSchedulerStatus() {
  const running = timer !== null;
  const elapsedMs = startedAt ? Date.now() - startedAt.getTime() : 0;
  const remainingMs = startedAt ? Math.max(0, MAX_RUNTIME_MS - elapsedMs) : 0;

  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingMins = Math.floor((remainingMs % (60 * 60 * 1000)) / 60000);

  let nextTickMs: number | null = null;
  if (running && lastTickAt) {
    const sinceLast = Date.now() - lastTickAt.getTime();
    nextTickMs = Math.max(0, TICK_INTERVAL_MS - sinceLast);
  }

  return {
    running,
    startedAt: startedAt?.toISOString() ?? null,
    lastTickAt: lastTickAt?.toISOString() ?? null,
    lastResult,
    totalProcessed,
    totalFailed,
    stopReason,
    quietHours: isQuietHours(),
    tickInProgress,
    expiresIn: running ? `${remainingHours}h ${remainingMins}m` : null,
    nextTickIn: nextTickMs !== null ? `${Math.floor(nextTickMs / 60000)}m ${Math.floor((nextTickMs % 60000) / 1000)}s` : null,
    config: {
      intervalMinutes: TICK_INTERVAL_MS / 60000,
      maxRuntimeDays: MAX_RUNTIME_MS / (24 * 60 * 60 * 1000),
      quietHoursUTC: `${QUIET_START_HOUR_UTC}:00–${QUIET_END_HOUR_UTC}:00`,
    },
  };
}
