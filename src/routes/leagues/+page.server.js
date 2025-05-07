import { db } from '$lib/firebase.js';
import { get, ref, set } from "firebase/database";

export const load = async ({ fetch }) => {
  const leaguesRef = ref(db, 'leagues');
  const snapshot = await get(leaguesRef);

  // Only fetch from API if "leagues" does not exist in the database
  if (snapshot.exists()) {
    return snapshot.val();
  }

  // If "leagues" is missing, fetch from API and save to Firebase
  try {
    const API_KEY = import.meta.env.VITE_FOOTBALL_DATA_API_KEY;

    // Fetch all available competitions
    const competitionsResponse = await fetch(
      'https://api.football-data.org/v4/competitions',
      {
        headers: {
          'X-Auth-Token': API_KEY
        }
      }
    );
    if (!competitionsResponse.ok) {
      throw new Error(`Failed to fetch competitions: ${competitionsResponse.status}`);
    }
    const competitionsData = await competitionsResponse.json();

    // Filter for soccer/football competitions
    const footballCompetitions = competitionsData.competitions.filter(
      competition => competition.type === 'LEAGUE'
    );

    // Fetch matches for all football leagues
    const allMatches = [];
    for (const competition of footballCompetitions) {
      const response = await fetch(
        `https://api.football-data.org/v4/competitions/${competition.code}/matches?status=SCHEDULED`,
        {
          headers: {
            'X-Auth-Token': API_KEY
          }
        }
      );
      if (response.ok) {
        const matchesData = await response.json();
        allMatches.push(...matchesData.matches.map(m => ({
          id: m.id.toString(),
          sportKey: competition.code,
          sport_title: competition.name,
          sport_emblem: competition.emblem,
          home_team: m.homeTeam.name,
          home_team_logo: m.homeTeam.crest,
          away_team: m.awayTeam.name,
          away_team_logo: m.awayTeam.crest,
          commence_time: m.utcDate
        })));
      }
    }

    // Group matches by league
    const matchesByLeague = allMatches.reduce((acc, match) => {
      const league = match.sport_title;
      if (!acc[league]) acc[league] = [];
      acc[league].push(match);
      return acc;
    }, {});

    const leaguesData = {
      leagues: Object.entries(matchesByLeague),
      updatedAt: Date.now()
    };

    await set(leaguesRef, leaguesData);

    return leaguesData;
  } catch (error) {
    console.error('API error:', error);
    return {
      leagues: [],
      error: error.message
    };
  }
};