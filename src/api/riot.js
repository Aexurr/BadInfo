// Lazy-load invoke so window.__TAURI__ is guaranteed to exist by call time
function getInvoke() {
  const tauri = window.__TAURI__;
  if (!tauri) throw new Error("Tauri not available — is withGlobalTauri enabled in tauri.conf.json?");
  return tauri.core?.invoke ?? tauri.tauri?.invoke ?? tauri.invoke;
}

export const RiotAPI = {
  getSummoner: (name, tagLine) =>
    getInvoke()("get_summoner", { name, tagLine }),

  getProfile: (puuid) =>
    getInvoke()("get_summoner_profile", { puuid }),

  getMatches: (puuid) =>
    getInvoke()("get_match_history", { puuid }),
};