import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { BRAND, BRAND_DARK, BRAND_LIGHT, BRAND_LIGHTER, TRACK, DIM, RESET, intensityColor } from './colors.js';
import { getGitInfo } from './git.js';
import { getConfig } from './config.js';

const COMPACT_BUFFER = 33_000;

function isAutoCompactEnabled() {
  try {
    const data = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8'));
    return data.autoCompactEnabled !== false; // absent or true = on
  } catch {
    return true; // default is on
  }
}

const BAR_W = 10;
const SEP = `${DIM} \u2502 ${RESET}`;

function fmtTokens(t) {
  if (t >= 1_000_000) {
    const m = Math.floor(t / 1_000_000);
    const r = Math.floor((t % 1_000_000) / 100_000);
    return r > 0 ? `${m}.${r}M` : `${m}M`;
  }
  if (t >= 1000) return `${Math.floor(t / 1000)}k`;
  return String(t);
}

function progressBar(pct, intensity) {
  const filled = Math.min(Math.round(pct * BAR_W / 100), BAR_W);
  const empty = BAR_W - filled;
  let bar = '';
  if (filled > 0) bar += `${intensity}${'█'.repeat(filled)}`;
  if (empty > 0) bar += `${TRACK}${'░'.repeat(empty)}`;
  return bar + RESET;
}

function fmtCountdown(resetsAt) {
  if (!resetsAt) return '--';
  const remain = Math.max(0, Math.floor((new Date(resetsAt) - Date.now()) / 1000));
  const h = Math.floor(remain / 3600);
  const m = Math.floor((remain % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Render 3-line statusline.
 * @param {object} input  - Claude Code statusline JSON
 * @param {object|null} usage - { fiveHour: { utilization, resetsAt }, sevenDay } or null
 */
export function render(input, usage) {
  const config = getConfig();

  // ── Parse input ────────────────────────────────────────────
  const model = input?.model?.display_name || '?';
  const rawCtxSize = input?.context_window?.context_window_size || 200_000;
  const linesAdded = input?.cost?.total_lines_added || 0;
  const linesRemoved = input?.cost?.total_lines_removed || 0;

  const cur = input?.context_window?.current_usage || {};
  const usedTokens = (cur.input_tokens || 0) + (cur.cache_creation_input_tokens || 0) + (cur.cache_read_input_tokens || 0);

  // Effective context limit: subtract 33k compaction buffer when auto-compact is on
  const ctxSize = isAutoCompactEnabled() ? rawCtxSize - COMPACT_BUFFER : rawCtxSize;
  const pct = Math.min(100, Math.floor(usedTokens * 100 / ctxSize));

  const usedFmt = fmtTokens(usedTokens);
  const totalFmt = fmtTokens(ctxSize);
  const ctxIntensity = intensityColor(pct);

  // ── LINE 1: Model & Context ────────────────────────────────
  const bar1 = progressBar(pct, ctxIntensity);
  const line1 = `${BRAND}${model}${RESET}${SEP}${DIM}${usedFmt}/${totalFmt}${RESET} [${bar1}] ${ctxIntensity}${pct}%${RESET}`;

  // ── LINE 2: Session / Usage ────────────────────────────────
  let sessionPct, sessionLabel, sessionCountdown;

  if (usage?.fiveHour) {
    sessionPct = Math.round(usage.fiveHour.utilization);
    sessionLabel = `${sessionPct}%`;
    sessionCountdown = fmtCountdown(usage.fiveHour.resetsAt);
  } else {
    // Fallback: use duration_ms / 5h
    const durationMs = input?.cost?.total_duration_ms || 0;
    const sessionWindow = 18000; // 5h in seconds
    const dSec = Math.floor(durationMs / 1000);
    sessionPct = Math.min(100, Math.floor(dSec * 100 / sessionWindow));
    const remain = Math.max(0, sessionWindow - dSec);
    const rh = Math.floor(remain / 3600);
    const rm = Math.floor((remain % 3600) / 60);
    sessionLabel = `${sessionPct}%`;
    sessionCountdown = `${rh}h ${rm}m`;
  }

  const sIntensity = intensityColor(sessionPct);
  const bar2 = progressBar(sessionPct, sIntensity);
  const line2 = `${BRAND}Session${RESET}${SEP}[${bar2}] ${sIntensity}${sessionLabel}${RESET}${SEP}${DIM}${sessionCountdown}${RESET}`;

  // ── LINE 3: Git ────────────────────────────────────────────
  const cwd = input?.workspace?.current_dir || '.';
  const projectDir = input?.workspace?.project_dir || cwd;
  const projectName = projectDir.split('/').pop();
  const git = getGitInfo(cwd);

  let line3 = '';
  if (git?.branch) {
    if (git.worktree) {
      line3 = `${BRAND}\u16B0 ${projectName}${RESET}${SEP}${DIM}\u2387 ${git.branch}${RESET}`;
    } else {
      line3 = `${BRAND}\u2387 ${git.branch}${RESET}`;
    }
    if (linesAdded > 0 || linesRemoved > 0) {
      line3 += `${SEP}${BRAND_LIGHT}+${linesAdded}${RESET} ${BRAND_DARK}-${linesRemoved}${RESET}`;
    }
  }

  // ── Output ─────────────────────────────────────────────────
  let out = '';
  if (config.lines.context) out += line1 + '\n';
  if (config.lines.session) out += line2 + '\n';
  if (config.lines.git && line3) out += line3 + '\n';
  process.stdout.write(out);
}
