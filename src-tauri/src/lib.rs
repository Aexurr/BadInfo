use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct RiotAccount {
    puuid: String,

    #[serde(rename = "gameName")]
    game_name: String,

    #[serde(rename = "tagLine")]
    tag_line: String,
}

#[derive(Serialize, Deserialize)]
struct SummonerProfile  {
    #[serde(rename = "profileIconId")]
    profile_icon_id: i32,

    #[serde(rename = "summonerLevel")]
    summoner_level: i32,
}

#[derive(Serialize, Deserialize)]
pub struct RunePage {
    pub keystone: i32,
    pub primary_tree: i32,
    pub secondary_tree: i32,
    pub stat_shards: Vec<i32>,
}
#[derive(Serialize, Deserialize)]
pub struct Winrate {
    pub wins: u32,
    pub losses: u32,
    pub winrate: f32,
}

#[derive(Serialize)]
pub struct TeamSummary {
    pub team_id: u8,
    pub win: bool,
    pub participants: Vec<TeamPlayer>,
}

#[derive(Serialize)]
pub struct TeamPlayer {
    pub puuid: String,
    pub summoner_name: String,

    pub champion: String,
    pub champion_id: i32,

    pub kills: u32,
    pub deaths: u32,
    pub assists: u32,

    pub items: Vec<Option<i32>>,
}


#[derive(Serialize)]
pub struct MatchEntry {
    pub game_id: String,
    pub queue_type: String,
    pub game_duration: u32,

    pub win: bool,
    pub team: u8,

    pub champion: String,
    pub champion_id: i32,

    pub kills: u32,
    pub deaths: u32,
    pub assists: u32,

    pub total_damage: u32,
    pub gold: u32,
    pub cs: u32,

    pub items: Vec<Option<i32>>,

    pub runes: RunePage,
    pub summoner_spells: Vec<i32>,

    pub teams: Vec<TeamSummary>,
}
#[tauri::command]
async fn get_summoner(name: String, tag_line: String) -> Result<RiotAccount, String> {
    let api_key = "RGAPI-b2167694-4f0c-43d6-9d17-000325e291f7";

    let url = format!(
        "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{}/{}",
        name, tag_line 
    );

    let client = reqwest::Client::new();

    let res = client
    .get(&url)
    .header("X-Riot-Token", api_key)
    .send()
    .await
    .map_err(|e| e.to_string())?;

    let status = res.status();
    let body = res.text().await.map_err(|e| e.to_string())?;

    println!("STATUS: {:?}", status);
    println!("BODY: {}", body);

    if !status.is_success() {
        return Err(format!("Riot API error: {}", body))
    }

    let account: RiotAccount = serde_json::from_str(&body)
        .map_err(|e| e.to_string())?;

Ok(account)
}

#[tauri::command]
async fn get_summoner_profile(puuid: String) -> Result<SummonerProfile, String> {
    let api_key = "RGAPI-b2167694-4f0c-43d6-9d17-000325e291f7";

    let url = format!(
        "https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{}",
        puuid
    );

    let client  = reqwest::Client::new();

    let res = client
    .get(&url)
    .header("X-Riot-Token", api_key)
    .send()
    .await
    .map_err(|e| e.to_string())?;

    let profile = res
    .json::<SummonerProfile>()
    .await
    .map_err(|e| e.to_string())?;

    Ok(profile)
}
        
#[tauri::command]
async fn get_match_history(puuid: String)
    -> Result<(Vec<MatchEntry>, Winrate), String> {
    let api_key = "RGAPI-b2167694-4f0c-43d6-9d17-000325e291f7";
    let client  = reqwest::Client::new();

    let mut wins = 0;
    let mut losses = 0;

    let ids_url = format!(
        "https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/{}/ids?count=20",
        puuid
    );

    let res = client
        .get(ids_url)
        .header("X-Riot-Token", api_key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Match ID fetch failed: {}", res.status()));
    }

    let match_ids: Vec<String> = res
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();

    for id in match_ids {
    let match_url = format!(
        "https://europe.api.riotgames.com/lol/match/v5/matches/{}",
        id
    );

    let match_data: serde_json::Value = match client
        .get(match_url)
        .header("X-Riot-Token", api_key)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
    {
        Ok(v) => v,
        Err(_) => continue, // skip broken match
    };

    let info = match match_data.get("info") {
        Some(v) => v,
        None => continue, // skip invalid response
    };

    let participants = match info["participants"].as_array() {
        Some(v) => v,
        None => continue,
    };

    let player = match participants
        .iter()
        .find(|p| p["puuid"].as_str() == Some(&puuid))
    {
        Some(p) => p,
        None => continue, // skip if not found
    };

    if player["win"].as_bool().unwrap_or(false) {
        wins += 1;
    } else {
        losses += 1;
    }

    let mut teams: Vec<TeamSummary> = vec![];

    for team_id in [100u8, 200u8] {
        let team_players: Vec<TeamPlayer> = participants
            .iter()
            .filter(|p| p["teamId"].as_u64().unwrap_or(0) as u8 == team_id)
            .map(|p| TeamPlayer {
                puuid: p["puuid"].as_str().unwrap_or("").to_string(),
                summoner_name: p
                    .get("summonerName")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown")
                    .to_string(),

                champion: p["championName"].as_str().unwrap_or("").to_string(),
                champion_id: p["championId"].as_i64().unwrap_or(0) as i32,

                kills: p["kills"].as_i64().unwrap_or(0) as u32,
                deaths: p["deaths"].as_i64().unwrap_or(0) as u32,
                assists: p["assists"].as_i64().unwrap_or(0) as u32,

                items: (0..7)
                    .map(|i| {
                        let key = format!("item{}", i);
                        let val = p[&key].as_i64().unwrap_or(0) as i32;
                        if val == 0 { None } else { Some(val) }
                    })
                    .collect(),
            })
            .collect();

        let win = participants
            .iter()
            .find(|p| p["teamId"].as_u64().unwrap_or(0) as u8 == team_id)
            .and_then(|p| p["win"].as_bool())
            .unwrap_or(false);

        teams.push(TeamSummary {
            team_id,
            win,
            participants: team_players,
        });
    }

        let player = participants
        .iter()
        .find(|p| p["puuid"].as_str() == Some(&puuid))
        .ok_or("Player not found")?;

        let styles = player["perks"]["styles"]
        .as_array()
        .ok_or("Missing perk styles")?;

    let primary_tree = styles
        .get(0)
        .and_then(|p| p["style"].as_i64())
        .unwrap_or(0) as i32;

    let secondary_tree = styles
        .get(1)
        .and_then(|p| p["style"].as_i64())
        .unwrap_or(0) as i32;

    let keystone = styles
        .get(0)
        .and_then(|p| p["selections"][0]["perk"].as_i64())
        .unwrap_or(0) as i32;

    let stat_shards = player["perks"]["statPerks"]["selections"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|s| s["perk"].as_i64().unwrap_or(0) as i32)
        .collect::<Vec<i32>>();

        let items = (0..7)
        .map(|i| {
            let key = format!("item{}", i);
            let val = player[&key].as_i64().unwrap_or(0) as i32;
            if val == 0 { None } else { Some(val) }
        })
        .collect::<Vec<Option<i32>>>();

        let player_team = player["teamId"]
        .as_u64()
        .unwrap_or(0) as u8;

        results.push(MatchEntry {
        game_id: id.clone(),
        queue_type: match_data["info"]["queueId"].to_string(),
        game_duration: match_data["info"]["gameDuration"].as_i64().unwrap_or(0) as u32,

        win: player["win"].as_bool().unwrap_or(false),
        team: player_team,

        champion: player["championName"].as_str().unwrap_or("").to_string(),
        champion_id: player["championId"].as_i64().unwrap_or(0) as i32,

        kills: player["kills"].as_i64().unwrap_or(0) as u32,
        deaths: player["deaths"].as_i64().unwrap_or(0) as u32,
        assists: player["assists"].as_i64().unwrap_or(0) as u32,

        total_damage: player["totalDamageDealtToChampions"].as_i64().unwrap_or(0) as u32,
        gold: player["goldEarned"].as_i64().unwrap_or(0) as u32,
        cs: (
            player["totalMinionsKilled"].as_i64().unwrap_or(0)
            + player["neutralMinionsKilled"].as_i64().unwrap_or(0)
        ) as u32,

        items,

        runes: RunePage {
            keystone,
            primary_tree,
            secondary_tree,
            stat_shards,
        },

        summoner_spells: vec![
            player["summoner1Id"].as_i64().unwrap_or(0) as i32,
            player["summoner2Id"].as_i64().unwrap_or(0) as i32,
        ],

        teams,
    });

            }
            Ok((
    results,
    Winrate {
        wins,
        losses,
        winrate: if wins + losses > 0 {
            (wins as f32 / (wins + losses) as f32) * 100.0
        } else {
            0.0
        },
    }
))
    }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_summoner, 
            get_summoner_profile, 
            get_match_history])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}