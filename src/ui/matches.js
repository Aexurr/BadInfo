import { spellIcon } from "../assets/spells.js";
import { loadByPuuid } from "../main.js";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function renderItems(items = []) {
  const slots = [...items, ...Array(7)].slice(0, 7);
  return slots.map(i =>
    i
      ? `<img class="item-img" src="https://ddragon.leagueoflegends.com/cdn/16.9.1/img/item/${i}.png" alt="item">`
      : `<div class="item-empty"></div>`
  ).join("");
}

function buildMatch(m) {
  return {
    ...m,
    kda: `${m.kills}/${m.deaths}/${m.assists}`,
    ratio: ((m.kills + m.assists) / Math.max(1, m.deaths)).toFixed(2),
    duration: formatTime(m.game_duration),
    champIcon: `https://ddragon.leagueoflegends.com/cdn/16.9.1/img/champion/${m.champion}.png`
  };
}

export function renderMatches(matches, currentPuuid) {
  const container = document.querySelector("#match-history");
  container.innerHTML = "";

  matches.forEach(raw => {
    const m = buildMatch(raw);

    const allyTeam  = raw.teams?.find(t => t.team_id === m.team);
    const enemyTeam = raw.teams?.find(t => t.team_id !== m.team);

    const el = document.createElement("div");
    el.className = `match-card ${m.win ? "win" : "loss"}`;

    el.innerHTML = `
      <div class="mc-result">
        <div class="mc-outcome">${m.win ? "WIN" : "LOSS"}</div>
        <div class="mc-queue">${m.queue_type ?? "Game"}</div>
        <div class="mc-duration">${m.duration}</div>
      </div>

      <div class="mc-champ">
        <img class="champ-img" src="${m.champIcon}" alt="${m.champion}">
        <div class="mc-spells">
          ${(m.summoner_spells ?? [])
            .map(id => spellIcon(id))
            .filter(Boolean)
            .map(src => `<img class="spell-icon" src="${src}" alt="spell">`)
            .join("")}
        </div>
      </div>

      <div class="mc-kda">
        <div class="mc-kda-score">${m.kda}</div>
        <div class="mc-kda-ratio">${m.ratio} KDA</div>
        <div class="mc-stats">${m.cs ?? 0} CS &nbsp;·&nbsp; ${(m.gold ?? 0).toLocaleString()} G</div>
      </div>

      <div class="mc-damage">
        <div class="mc-damage-label">Damage</div>
        <div class="mc-damage-num">${(m.total_damage ?? 0).toLocaleString()}</div>
        <div class="mc-damage-bar-wrap">
          <div class="mc-damage-bar"></div>
        </div>
      </div>

      <div class="mc-items">
        ${renderItems(m.items)}
      </div>

      <div class="mc-teams">
        <div class="mc-team-col">
          ${(allyTeam?.participants ?? []).map(p => `
            <div class="team-player ${p.puuid === currentPuuid ? "self" : ""}" data-puuid="${p.puuid}">
              <img src="https://ddragon.leagueoflegends.com/cdn/16.9.1/img/champion/${p.champion}.png" alt="${p.champion}">
              <span>${p.summoner_name}</span>
            </div>
          `).join("")}
        </div>
        <div class="mc-team-col">
          ${(enemyTeam?.participants ?? []).map(p => `
            <div class="team-player" data-puuid="${p.puuid}">
              <img src="https://ddragon.leagueoflegends.com/cdn/16.9.1/img/champion/${p.champion}.png" alt="${p.champion}">
              <span>${p.summoner_name}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    el.querySelectorAll("[data-puuid]").forEach(row => {
      row.addEventListener("click", e => {
        e.stopPropagation();
        loadByPuuid(row.dataset.puuid);
      });
    });

    container.appendChild(el);
  });

  // Damage bars relative to max
  const allBars = container.querySelectorAll(".mc-damage-bar");
  const allNums = [...container.querySelectorAll(".mc-damage-num")]
    .map(el => parseInt(el.textContent.replace(/,/g, "")) || 0);
  const maxDmg = Math.max(...allNums, 1);
  allBars.forEach((bar, i) => {
    bar.style.width = ((allNums[i] / maxDmg) * 100) + "%";
  });
}
