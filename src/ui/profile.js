export function renderProfile(account, profile) {
  const nameEl = document.querySelector("#summoner-display");
  const iconEl = document.querySelector("#profile-icon");
  const levelEl = document.querySelector("#summoner-level");

  if (!account || !profile) {
    console.error("renderProfile received invalid data:", account, profile);
    return;
  }

  // Rust serialises with serde rename: gameName / tagLine
  const name = account.gameName ?? account.game_name ?? "Unknown";
  const tag  = account.tagLine  ?? account.tag_line  ?? "";

  nameEl.textContent = tag ? `${name}#${tag}` : name;

  if (levelEl) levelEl.textContent = `Level ${profile.summonerLevel ?? profile.summoner_level ?? "—"}`;

  iconEl.src =
    `https://raw.communitydragon.org/16.9/game/assets/ux/summonericons/profileicon${profile.profileIconId ?? profile.profile_icon_id ?? 29}.png`;
}