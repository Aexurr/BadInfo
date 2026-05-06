export const RUNES = {
  8000: "Precision",
  8100: "Domination",
  8200: "Sorcery",
  8300: "Inspiration",
  8400: "Resolve"
};

export const RUNE_ICONS = {
  8000: "7201_Precision.png",
  8100: "7200_Domination.png",
  8200: "7202_Sorcery.png",
  8300: "7203_Whimsy.png",
  8400: "7204_Resolve.png"
};

export const RUNE_TREES = {
  8000: "Precision",
  8100: "Domination",
  8200: "Sorcery",
  8300: "Inspiration",
  8400: "Resolve"
};

export function runeIcon(id) {
  return `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${RUNE_ICONS[id]}`;
}
