import { VITE_FOOTBALL_DATA_API_KEY, VITE_API_FOOTBALL_KEY } from '$env/static/private';
import { db } from '$lib/firebase.js';
import { get, ref, set } from "firebase/database";

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Utility to sanitize keys for Firebase (replace . with _)
function sanitizeKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeKeys);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/\./g, '_'),
        sanitizeKeys(value)
      ])
    );
  }
  return obj;
}

export async function load({ params }) {
  const { matchId } = params;
  const matchRef = ref(db, `matches/${matchId}`);
  let matchSnap = await get(matchRef);

  let matchData = matchSnap.exists() ? matchSnap.val() : null;

  // Always refetch if any critical field is missing (self-healing)
  const needsUpdate =
    !matchData ||
    !matchData.homeTeamStanding ||
    !matchData.awayTeamStanding ||
    !matchData.headToHeadData;

  if (needsUpdate) {
    try {
      // Fetch match details
      const footballDataResponse = await fetch(
        `https://api.football-data.org/v4/matches/${matchId}`,
        {
          headers: {
            'X-Auth-Token': VITE_FOOTBALL_DATA_API_KEY
          }
        }
      );
      if (!footballDataResponse.ok) {
        let errorMsg = `Football-data API error: ${footballDataResponse.status}`;
        if (footballDataResponse.status === 429) {
          errorMsg = "API rate limit reached. Please wait a minute and try again.";
        }
        return {
          matchFound: false,
          match: null,
          homeTeamStanding: null,
          awayTeamStanding: null,
          headToHeadData: null,
          predictions: {},
          venue: null,
          analysis: null,
          error: errorMsg
        };
      }
      const match = await footballDataResponse.json();
      if (!match || !match.homeTeam || !match.awayTeam) {
        return {
          matchFound: false,
          match: null,
          homeTeamStanding: null,
          awayTeamStanding: null,
          headToHeadData: null,
          predictions: {},
          venue: null,
          analysis: null,
          error: 'No valid match found in football-data response'
        };
      }

      // Standings
      const competitionId = match.competition.id;
      let homeTeamStanding = null;
      let awayTeamStanding = null;
      try {
        const standingsResponse = await fetch(
          `https://api.football-data.org/v4/competitions/${competitionId}/standings`,
          {
            headers: {
              'X-Auth-Token': VITE_FOOTBALL_DATA_API_KEY
            }
          }
        );
        if (standingsResponse.ok) {
          const standingsData = await standingsResponse.json();
          if (standingsData.standings && standingsData.standings.length > 0) {
            const standings = standingsData.standings[0].table;
            homeTeamStanding = standings.find(standing => standing.team.id === match.homeTeam.id);
            awayTeamStanding = standings.find(standing => standing.team.id === match.awayTeam.id);
          }
        }
      } catch {}

      // Head to Head (with fallback)
      let headToHeadData = null;
      try {
        const headToHeadResponse = await fetch(
          `https://api.football-data.org/v4/matches/${matchId}/head2head`,
          {
            headers: {
              'X-Auth-Token': VITE_FOOTBALL_DATA_API_KEY
            }
          }
        );
        if (headToHeadResponse.ok) {
          headToHeadData = await headToHeadResponse.json();
        } else {
          // Fallback: fetch last 10 matches for home team and filter
          const fallbackH2HResponse = await fetch(
            `https://api.football-data.org/v4/teams/${match.homeTeam.id}/matches?status=FINISHED&limit=10`,
            {
              headers: {
                'X-Auth-Token': VITE_FOOTBALL_DATA_API_KEY
              }
            }
          );
          if (fallbackH2HResponse.ok) {
            const h2hData = await fallbackH2HResponse.json();
            if (h2hData.matches) {
              headToHeadData = {
                matches: h2hData.matches.filter(m =>
                  (m.homeTeam.id === match.homeTeam.id && m.awayTeam.id === match.awayTeam.id) ||
                  (m.homeTeam.id === match.awayTeam.id && m.awayTeam.id === match.homeTeam.id)
                )
              };
            }
          }
        }
      } catch {}

      // Venue (from match or null)
      let venue = match.venue || null;

      matchData = {
        matchFound: true,
        match,
        homeTeamStanding,
        awayTeamStanding,
        headToHeadData,
        venue,
        analysis: null, // Default analysis field
        predictions: {}, // Always present
        error: null
      };

      await set(matchRef, matchData);
    } catch (error) {
      return {
        matchFound: false,
        match: null,
        homeTeamStanding: null,
        awayTeamStanding: null,
        headToHeadData: null,
        predictions: {},
        venue: null,
        analysis: null,
        error: error.message
      };
    }
  }

  // 2. Handle predictions (win probability and expert advice)
  const predRef = ref(db, `predictions/${matchId}`);
  const predSnap = await get(predRef);

  let predictions = {};
  const now = Date.now();
  const FIVE_HOURS = 5 * 60 * 60 * 1000;

  if (predSnap.exists() && now - predSnap.val().updatedAt < FIVE_HOURS) {
    predictions = predSnap.val().data;
    // Always update match node with predictions and analysis
    await set(matchRef, {
      ...matchData,
      predictions,
      analysis: matchData?.analysis ?? null
    });
  } else {
    // Fetch predictions from API
    try {
      const matchDate = matchData.match.utcDate.split('T')[0];
      const homeTeamName = matchData.match.homeTeam.name;
      const awayTeamName = matchData.match.awayTeam.name;

      const apiSportsResponse = await fetch(
        `https://v3.football.api-sports.io/fixtures?date=${matchDate}`,
        {
          headers: {
            'x-apisports-key': VITE_API_FOOTBALL_KEY
          }
        }
      );
      if (apiSportsResponse.ok) {
        const apiSportsData = await apiSportsResponse.json();
        let matchingFixture = null;
        if (apiSportsData.response && apiSportsData.response.length > 0) {
          const getNameSimilarity = (name1, name2) => {
            const normalize = (name) => name.toLowerCase()
              .replace(/\s+fc$/, '')
              .replace(/\s+football\s+club$/, '')
              .trim();
            const normalizedName1 = normalize(name1);
            const normalizedName2 = normalize(name2);
            return normalizedName1 === normalizedName2 ||
              normalizedName1.includes(normalizedName2) ||
              normalizedName2.includes(normalizedName1);
          };
          matchingFixture = apiSportsData.response.find(fixture => {
            if (!fixture.teams || !fixture.teams.home || !fixture.teams.away) return false;
            const homeTeamMatches = getNameSimilarity(fixture.teams.home.name, homeTeamName);
            const awayTeamMatches = getNameSimilarity(fixture.teams.away.name, awayTeamName);
            return homeTeamMatches && awayTeamMatches;
          });
        }
        if (matchingFixture) {
          const fixtureId = matchingFixture.fixture.id;
          const predictionsResponse = await fetch(
            `https://v3.football.api-sports.io/predictions?fixture=${fixtureId}`,
            {
              headers: {
                'x-apisports-key': VITE_API_FOOTBALL_KEY
              }
            }
          );
          if (predictionsResponse.ok) {
            const predictionsData = await predictionsResponse.json();
            if (predictionsData.response && predictionsData.response.length > 0) {
              predictions = predictionsData.response[0];
              const sanitizedPredictions = sanitizeKeys(predictions);
              await set(predRef, { data: sanitizedPredictions, updatedAt: now });
              await set(matchRef, {
                ...matchData,
                predictions: sanitizedPredictions,
                analysis: matchData?.analysis ?? null
              });
            } else {
              await set(matchRef, {
                ...matchData,
                predictions: {},
                analysis: matchData?.analysis ?? null
              });
            }
          }
        }
      }
    } catch (err) {
      await set(matchRef, {
        ...matchData,
        predictions: {},
        analysis: matchData?.analysis ?? null
      });
    }
  }

  // Return everything
  return {
    ...matchData,
    predictions
  };
}