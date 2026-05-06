// /state/store.js

export const store = {
  summoner: null,
  profile: null,
  winrate: null,

  matches: [],
  selectedMatch: null,

  loading: false,
  error: null
};

export function setStore(partial) {
  Object.assign(store, partial);
}

export function resetStore() {
  store.summoner = null;
  store.profile = null;
  store.winrate = null;
  store.matches = [];
  store.selectedMatch = null;
  store.loading = false;
  store.error = null;
}

export function setAccount(account, profile) {
  document.querySelector("#summoner-display").textContent =
    `${account.game_name}#${account.tag_line}`;

  document.querySelector("#profile-icon").src =
    `https://ddragon.leagueoflegends.com/cdn/16.9.1/img/profileicon/${profile.profileIconId}.png`;
}

export function mapMatch(m) {
  return {
    win: m.win,

    result: m.win ? "WIN" : "LOSS",

    champion: m.champion ?? "Unknown",

    kda: `${m.kills}/${m.deaths}/${m.assists}`,

    ratio: ((m.kills + m.assists) / Math.max(1, m.deaths)).toFixed(2),

    duration: formatTime(m.game_duration ?? 0),

    items: m.items ?? [],

    damage: m.total_damage ?? 0,
    gold: m.gold ?? 0,
    cs: m.cs ?? 0
  };
}