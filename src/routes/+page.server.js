// src/routes/+page.server.js
import { db } from '$lib/firebase.js';
import { get, ref, set } from "firebase/database";
import { getTrendingMatches } from '$lib/analytics.js';

const ONE_DAY = 24 * 60 * 60 * 1000;

export const load = async ({ fetch }) => {
  const leaguesRef = ref(db, 'leagues');
  const [leaguesSnap] = await Promise.all([get(leaguesRef)]);

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
          home_team_id: m.homeTeam.id,
          away_team: m.awayTeam.name,
          away_team_logo: m.awayTeam.crest,
          away_team_id: m.awayTeam.id,
          commence_time: m.utcDate,
          matchday: m.matchday || 1,
          status: m.status,
          venue: m.venue?.name || null
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
      allMatches: allMatches, // Store all matches for trending lookup
      updatedAt: Date.now()
    };

    await set(leaguesRef, leaguesData);
  }

  // Get trending matches from Firestore analytics
  let trendingMatches = [];
  try {
    console.log('Fetching trending matches from analytics...');
    const trendingData = await getTrendingMatches(20);
    
    if (trendingData.length > 0 && leaguesData?.allMatches) {
      // Create a map of matches by ID for quick lookup
      const matchMap = Object.fromEntries(
        leaguesData.allMatches.map(m => [m.id, m])
      );

      // Match trending data with actual match details
      trendingMatches = trendingData
        .map(trending => {
          const match = matchMap[trending.matchId];
          if (match) {
            return {
              ...match,
              analytics: {
                interestRating: trending.interestRating,
                clicks: trending.clicks,
                timeSpent: trending.timeSpent,
                pageViews: trending.pageViews,
                shares: trending.shares || 0
              }
            };
          }
          return null;
        })
        .filter(match => match !== null)
        .slice(0, 20); // Ensure we don't exceed 20 matches

      console.log(`Found ${trendingMatches.length} trending matches`);
    } else {
      console.log('No trending data found or no matches available');
      
      // Fallback: show some recent matches if no trending data exists
      if (leaguesData?.allMatches) {
        const recentMatches = leaguesData.allMatches
          .filter(match => {
            const matchDate = new Date(match.commence_time);
            const now = new Date();
            const daysDiff = (matchDate - now) / (1000 * 60 * 60 * 24);
            return daysDiff >= 0 && daysDiff <= 7; // Matches in the next 7 days
          })
          .sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time))
          .slice(0, 6)
          .map(match => ({
            ...match,
            analytics: {
              interestRating: 0,
              clicks: 0,
              timeSpent: 0,
              pageViews: 0,
              shares: 0
            }
          }));
        
        trendingMatches = recentMatches;
        console.log(`Using ${recentMatches.length} recent matches as fallback`);
      }
    }
  } catch (error) {
    console.error('Error fetching trending matches:', error);
    trendingMatches = [];
  }

  return {
    leagues: leaguesData?.leagues || [],
    trendingMatches: trendingMatches,
    analyticsEnabled: true
  };
};