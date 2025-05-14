import { db } from '$lib/firebase.js';
import { get, ref, set } from "firebase/database";

const ONE_DAY = 24 * 60 * 60 * 1000;

export const load = async ({ fetch }) => {
  const leaguesRef = ref(db, 'leagues');
  const interestRef = ref(db, 'interest');
  const [leaguesSnap, interestSnap] = await Promise.all([get(leaguesRef), get(interestRef)]);

  let shouldUpdate = true;
  let leaguesData = null;

  if (leaguesSnap.exists()) {
    leaguesData = leaguesSnap.val();
    if (leaguesData.updatedAt && Date.now() - leaguesData.updatedAt < ONE_DAY) {
      shouldUpdate = false;
    }
  }

  if (shouldUpdate) {
    const API_KEY = import.meta.env.VITE_FOOTBALL_DATA_API_KEY;

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

    const footballCompetitions = competitionsData.competitions.filter(
      competition => competition.type === 'LEAGUE'
    );

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

    const matchesByLeague = allMatches.reduce((acc, match) => {
      const league = match.sport_title;
      if (!acc[league]) acc[league] = [];
      acc[league].push(match);
      return acc;
    }, {});

    leaguesData = {
      leagues: Object.entries(matchesByLeague),
      updatedAt: Date.now()
    };

    await set(leaguesRef, leaguesData);
  }

  // Trending logic
  let trendingMatches = [];
  if (interestSnap.exists() && leaguesData?.leagues) {
    const allMatches = leaguesData.leagues.flatMap(([leagueName, matches]) => matches);
    const matchMap = Object.fromEntries(allMatches.map(m => [m.id, m]));
    const interestData = interestSnap.val();
    const scored = Object.entries(interestData)
      .map(([matchId, { timeSpent = 0, clicks = 0 }]) => ({
        match: matchMap[matchId],
        score: (timeSpent) + (clicks * 10)
      }))
      .filter(e => e.match)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(e => e.match);
    trendingMatches = scored;
  }

  return {
    leagues: leaguesData?.leagues || [],
    trendingMatches
  };
};