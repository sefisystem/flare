// functions/api/scores.js
// Cloudflare Pages Function — free scores proxy
// BUG 5 FIX: replaced AbortSignal.timeout() with manual AbortController
// No API key needed. Uses worldcup26.ir + openfootball fallback

const PRIMARY_URL = "https://worldcup26.ir/get/games";
const FALLBACK_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// BUG 5 FIX: safe fetch with timeout using AbortController (works in all CF runtimes)
async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequestGet() {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  // Try worldcup26.ir first
  try {
    const res = await fetchWithTimeout(PRIMARY_URL, {
      headers: { "Accept": "application/json", "User-Agent": "SEFI/1.0" },
    }, 6000);
    if (!res.ok) throw new Error(`worldcup26.ir HTTP ${res.status}`);
    const data = await res.json();
    const matches = parseWorldcup26(data);
    if (!matches.length) throw new Error("worldcup26.ir returned empty matches array");
    return new Response(
      JSON.stringify({ source: "worldcup26.ir", matches }),
      { status: 200, headers }
    );
  } catch (e1) {
    console.log("Primary source failed:", e1.message, "→ trying openfootball fallback");
  }

  // Fallback: openfootball GitHub JSON
  try {
    const res = await fetchWithTimeout(FALLBACK_URL, {}, 10000);
    if (!res.ok) throw new Error(`openfootball HTTP ${res.status}`);
    const data = await res.json();
    const matches = parseOpenFootball(data);
    return new Response(
      JSON.stringify({ source: "openfootball", matches }),
      { status: 200, headers }
    );
  } catch (e2) {
    console.error("All data sources failed:", e2.message);
    return new Response(
      JSON.stringify({ error: "All data sources unavailable", detail: e2.message }),
      { status: 503, headers }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/* ── worldcup26.ir parser ── */
function parseWorldcup26(data) {
  // API can return { games: [...] } or directly [...]
  const games = Array.isArray(data) ? data : (data.games || data.data || []);
  return games.map(g => ({
    id: String(g.id || g.match_id || Math.random()),
    group: g.group || g.stage || "–",
    home: g.home_team_name_en || g.home_team || "TBD",
    away: g.away_team_name_en || g.away_team || "TBD",
    homeScore: parseScore(g.home_score),
    awayScore: parseScore(g.away_score),
    status: mapStatus(g.finished, g.time_elapsed, g.status),
    minute: parseMinute(g.time_elapsed || g.minute),
    kickoff: parseLocalDate(g.local_date || g.date),
    homeScorers: parseScorers(g.home_scorers),
    awayScorers: parseScorers(g.away_scorers),
  })).filter(g => g.home !== "TBD" || g.away !== "TBD");
}

function parseScore(raw) {
  if (raw === null || raw === undefined || raw === "null" || raw === "") return null;
  const n = parseInt(raw);
  return isNaN(n) ? null : n;
}

function mapStatus(finished, elapsed, statusField) {
  // Handle explicit status field some APIs return
  if (statusField) {
    const s = String(statusField).toUpperCase();
    if (s === "FINISHED" || s === "FT" || s === "AET" || s === "PEN") return "FINISHED";
    if (s === "1H" || s === "2H" || s === "HT" || s === "LIVE") return "LIVE";
    if (s === "ET" || s === "EXTRATIME") return "EXTRA_TIME";
    if (s === "P" || s === "PENALTY") return "PENALTY";
    if (s === "SUSP" || s === "INT" || s === "DELAYED") return "DELAYED";
    if (s === "NS" || s === "TBD" || s === "SCHEDULED") return "SCHEDULED";
  }
  if (finished === "TRUE" || finished === true || finished === 1) return "FINISHED";
  if (!elapsed || elapsed === "notstarted") return "SCHEDULED";
  const el = String(elapsed).toLowerCase();
  if (el === "halftime" || el === "ht") return "LIVE";
  if (el === "fulltime" || el === "ft") return "FINISHED";
  if (el === "extratime" || el === "et") return "EXTRA_TIME";
  if (el === "penaltyshootout" || el === "penalty") return "PENALTY";
  if (el === "delayed" || el === "suspended" || el === "susp") return "DELAYED";
  if (!isNaN(parseInt(elapsed))) return "LIVE"; // numeric minute = live
  return "LIVE";
}

function parseMinute(elapsed) {
  if (!elapsed || elapsed === "notstarted") return 0;
  const n = parseInt(elapsed);
  return isNaN(n) ? 0 : Math.min(n, 120);
}

function parseScorers(raw) {
  if (!raw || raw === "null") return [];
  try { return typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []); }
  catch { return []; }
}

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  try {
    // Format: "06/11/2026 13:00" (MM/DD/YYYY HH:MM)
    if (dateStr.includes("/")) {
      const [datePart, timePart = "00:00"] = dateStr.split(" ");
      const parts = datePart.split("/");
      if (parts.length === 3) {
        const [m, d, y] = parts;
        return new Date(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}T${timePart}:00-05:00`).toISOString();
      }
    }
    // ISO format passthrough
    return new Date(dateStr).toISOString();
  } catch { return new Date().toISOString(); }
}

/* ── openfootball parser ── */
function parseOpenFootball(data) {
  const out = [];
  (data.matches || []).forEach(m => {
    const kickoff = parseOFKickoff(m.date, m.time);
    const hs = m.score?.ft?.[0] ?? null;
    const as_ = m.score?.ft?.[1] ?? null;
    out.push({
      id: String(m.num || Math.random()),
      group: (m.round || "").replace("Group ", "").replace("Matchday ", "").trim() || "–",
      home: m.team1 || "TBD",
      away: m.team2 || "TBD",
      homeScore: hs,
      awayScore: as_,
      status: inferStatus(kickoff, hs),
      minute: null,
      kickoff,
      homeScorers: (m.goals1 || []).map(g => ({ name: g.name, minute: g.minute })),
      awayScorers: (m.goals2 || []).map(g => ({ name: g.name, minute: g.minute })),
    });
  });
  return out;
}

function parseOFKickoff(date, time) {
  if (!date) return new Date().toISOString();
  const match = (time || "").match(/(\d+):(\d+)\s*UTC([+-]\d+)/);
  if (!match) return new Date(date + "T00:00:00Z").toISOString();
  const offsetH = parseInt(match[3]);
  // BUG 19 FIX: clamp to 0-47 to handle negative/overflow UTC hours correctly
  let utcH = parseInt(match[1]) - offsetH;
  let dayOffset = 0;
  if (utcH < 0) { utcH += 24; dayOffset = -1; }
  if (utcH >= 24) { utcH -= 24; dayOffset = 1; }
  const utcMin = parseInt(match[2]);
  const p = n => String(Math.max(0, Math.floor(n))).padStart(2, "0");
  try {
    const base = new Date(`${date}T${p(utcH)}:${p(utcMin)}:00Z`);
    if (isNaN(base.getTime())) return new Date().toISOString();
    base.setUTCDate(base.getUTCDate() + dayOffset);
    return base.toISOString();
  } catch { return new Date().toISOString(); }
}

function inferStatus(kickoff, hs) {
  const diff = Date.now() - new Date(kickoff).getTime();
  if (diff < 0) return "SCHEDULED";
  if (hs !== null && diff > 105 * 60 * 1000) return "FINISHED";
  if (diff < 105 * 60 * 1000) return "LIVE";
  return "FINISHED";
}
