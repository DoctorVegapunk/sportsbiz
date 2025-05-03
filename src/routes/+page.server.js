import { db } from '$lib/firebase.js';
import { get, ref } from "firebase/database";

export const load = async ({ fetch }) => {


  const snapshot = await get(ref(db, 'leagues'));
  if (snapshot.exists()) {
    return snapshot.val();
  }

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
      // Get upcoming matches for this competition
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
        
        // Add matches with modified structure
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

    return {
      leagues: Object.entries(matchesByLeague),
      error: null
    };
  } catch (error) {
    console.error('API error:', error);
    return {
      leagues: [],
      error: error.message
    };
  }
};