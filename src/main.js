import { RiotAPI } from "/api/riot.js";
import { renderProfile } from "/ui/profile.js";
import { renderMatches } from "/ui/matches.js";
import { renderWinrate } from "/ui/chart.js";

// ── State: remember last loaded puuid/account for the Update button ──────────
let _lastPuuid = null;
let _lastAccount = null;

// ── Header summoner name ─────────────────────────────────────────────────────

function renderHeaderName(account) {
  const nameEl = document.getElementById("header-summoner-name");
  if (!nameEl) return;
  const name = account.gameName ?? account.game_name ?? "Unknown";
  const tag  = account.tagLine  ?? account.tag_line  ?? "";
  nameEl.textContent = tag ? `${name}#${tag}` : name;
}

// ── Sidebar helpers ──────────────────────────────────────────────────────────

function renderSidebarMostPlayed(matches) {
  const el = document.getElementById("sidebar-most-played");
  if (!el) return;

  const counts = {};
  matches.forEach(m => {
    if (!m.champion) return;
    if (!counts[m.champion]) counts[m.champion] = { wins: 0, games: 0 };
    counts[m.champion].games++;
    if (m.win) counts[m.champion].wins++;
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 3);

  if (!sorted.length) { el.textContent = "—"; return; }

  el.innerHTML = sorted.map(([champ, data]) => {
    const wr = Math.round((data.wins / data.games) * 100);
    return `
      <div class="most-played-row">
        <img src="https://ddragon.leagueoflegends.com/cdn/16.9.1/img/champion/${champ}.png" alt="${champ}">
        <div class="most-played-info">
          <span class="most-played-name">${champ}</span>
          <span class="most-played-stats">${data.games}G &nbsp;·&nbsp; ${wr}% WR</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderSidebarRank(win) {
  const el = document.getElementById("sidebar-rank");
  if (!el) return;
  const pct = win.winrate != null ? Math.round(win.winrate) : null;
  if (pct == null) { el.textContent = "—"; return; }
  el.innerHTML = `
    <span style="font-size:13px;font-weight:600;color:#fff;">
      ${win.wins}W / ${win.losses}L &nbsp;·&nbsp; ${pct}% WR
    </span>
  `;
}

// ── Mastery block (derived from match history) ───────────────────────────────
// The Riot Mastery API requires a separate endpoint

function renderMastery(matches) {
  const el = document.getElementById("mastery-list");
  if (!el) return;

  // Tally games per champion, use total_damage as a proxy for "mastery weight"
  const map = {};
  matches.forEach(m => {
    if (!m.champion) return;
    if (!map[m.champion]) map[m.champion] = { games: 0, wins: 0, damage: 0 };
    map[m.champion].games++;
    map[m.champion].damage += m.total_damage ?? 0;
    if (m.win) map[m.champion].wins++;
  });

  const sorted = Object.entries(map)
    .sort((a, b) => b[1].games - a[1].games || b[1].damage - a[1].damage)
    .slice(0, 5);

  if (!sorted.length) { el.textContent = "—"; return; }

  const maxDmg = Math.max(...sorted.map(([, d]) => d.damage), 1);

  el.innerHTML = sorted.map(([champ, data]) => {
    const wr = Math.round((data.wins / data.games) * 100);
    const barPct = Math.round((data.damage / maxDmg) * 100);
    const pts = data.damage.toLocaleString();
    return `
      <div class="mastery-row">
        <img src="https://ddragon.leagueoflegends.com/cdn/16.9.1/img/champion/${champ}.png" alt="${champ}">
        <div class="mastery-info">
          <div class="mastery-champ-name">${champ} &nbsp;<span style="font-weight:400;color:#888;font-size:10px;">${data.games}G · ${wr}% WR</span></div>
          <div class="mastery-bar-wrap">
            <div class="mastery-bar" style="width:${barPct}%"></div>
          </div>
        </div>
        <span class="mastery-pts">${pts} dmg</span>
      </div>
    `;
  }).join("");
}

// ── Recently Played With ─────────────────────────────────────────────────────

function renderRecentFriends(matches, currentPuuid) {
  const el = document.getElementById("recent-friends");
  if (!el) return;

  // Count how many games each ally appeared in
  const allies = {};
  matches.forEach(m => {
    const myTeamId = m.team;
    const myTeam = m.teams?.find(t => t.team_id === myTeamId);
    (myTeam?.participants ?? []).forEach(p => {
      if (p.puuid === currentPuuid) return;
      if (!allies[p.puuid]) allies[p.puuid] = { name: p.summoner_name, champion: p.champion, games: 0 };
      allies[p.puuid].games++;
    });
  });

  const sorted = Object.entries(allies)
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 8);

  if (!sorted.length) { el.textContent = "No recent teammates found."; return; }

  el.innerHTML = sorted.map(([puuid, data]) => `
    <button class="friend-chip" data-puuid="${puuid}">
      <img src="https://ddragon.leagueoflegends.com/cdn/16.9.1/img/champion/${data.champion}.png" alt="${data.champion}">
      <span>${data.name}</span>
      <span class="friend-games">${data.games}g</span>
    </button>
  `).join("");

  el.querySelectorAll("[data-puuid]").forEach(btn => {
    btn.addEventListener("click", () => loadByPuuid(btn.dataset.puuid));
  });
}

// ── Update button ────────────────────────────────────────────────────────────

function setupUpdateButton() {
  const btn = document.getElementById("update-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (!_lastPuuid) return;
    btn.classList.add("spinning");
    loadByPuuid(_lastPuuid).finally(() => btn.classList.remove("spinning"));
  });
}

// ── Loaders ──────────────────────────────────────────────────────────────────

async function loadSummoner(name, tagLine) {
  try {
    const account = await RiotAPI.getSummoner(name, tagLine);
    if (!account?.puuid) throw new Error("Invalid account response");

    _lastPuuid   = account.puuid;
    _lastAccount = account;

    const [profile, matchData] = await Promise.all([
      RiotAPI.getProfile(account.puuid),
      RiotAPI.getMatches(account.puuid)
    ]);

    const [matches, win] = matchData;

    renderProfile(account, profile);
    renderHeaderName(account);
    renderWinrate(win);
    renderMatches(matches, account.puuid);
    renderSidebarRank(win);
    renderSidebarMostPlayed(matches);
    renderMastery(matches);
    renderRecentFriends(matches, account.puuid);

  } catch (err) {
    console.error("Load failed:", err);
  }
}

export async function loadByPuuid(puuid) {
  try {
    const [profile, matchData] = await Promise.all([
      RiotAPI.getProfile(puuid),
      RiotAPI.getMatches(puuid)
    ]);

    const [matches, win] = matchData;

    const player = matches[0]?.teams
      ?.flatMap(t => t.participants)
      ?.find(p => p.puuid === puuid);

    const account = {
      gameName: player?.summoner_name || "Unknown",
      tagLine: "",
      puuid
    };

    _lastPuuid   = puuid;
    _lastAccount = account;

    renderProfile(account, profile);
    renderHeaderName(account);
    renderWinrate(win);
    renderMatches(matches, puuid);
    renderSidebarRank(win);
    renderSidebarMostPlayed(matches);
    renderMastery(matches);
    renderRecentFriends(matches, puuid);

  } catch (err) {
    console.error("Load by puuid failed:", err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setupUpdateButton();

  document.querySelector("#load-btn").addEventListener("click", () => {
    loadSummoner(
      document.querySelector("#summoner-name").value,
      document.querySelector("#tag-line").value
    );
  });
});
