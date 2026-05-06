export const SPELLS = {
  1: "SummonerBoost",
  3: "SummonerExhaust",
  4: "SummonerFlash",
  6: "SummonerHaste",
  7: "SummonerHeal",
  11: "SummonerSmite",
  12: "SummonerTeleport",
  14: "SummonerDot"
};

export function spellIcon(id) {
  const name = SPELLS[id];
  if (!name) return null;

  return `https://ddragon.leagueoflegends.com/cdn/16.9.1/img/spell/${name}.png`;
}