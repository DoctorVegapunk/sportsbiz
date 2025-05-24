// src/routes/+page.server.js
import { db } from '$lib/firebase.js';
import { get, ref, set } from "firebase/database";
import { getFirestore, collection, getDocs, getDoc, doc } from 'firebase/firestore';

const ONE_DAY = 24 * 60 * 60 * 1000;

export const load = async ({ fetch }) => {
  const leaguesRef = ref(db, 'leagues');
  const leaguesSnap = await get(leaguesRef);

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
      allMatches: allMatches,
      updatedAt: Date.now()
    };

    await set(leaguesRef, leaguesData);
  }

  // Get trending matches from analytics collection
  let trendingMatches = [];
  try {
    
    const firestore = getFirestore();
    
    // Get all documents from analytics collection
    const analyticsRef = collection(firestore, 'analytics');
    const analyticsSnapshot = await getDocs(analyticsRef);
    
    if (!analyticsSnapshot.empty) {
      
      // Get all match documents in parallel
      const matchPromises = analyticsSnapshot.docs.map(async (analyticsDoc) => {
        const analyticsData = analyticsDoc.data();
        const matchId = analyticsData.matchId; // Get matchId from the document data
        
        
        if (!matchId) {
          console.warn('Analytics document missing matchId:', analyticsDoc.id);
          return null;
        }
        
        try {
          // Get the match document from matches collection
          const matchDoc = await getDoc(doc(firestore, 'matches', matchId));
          if (matchDoc.exists()) {
            
            const matchData = matchDoc.data();
            
            // Helper function to convert Firestore timestamps to ISO strings
            const convertTimestamp = (timestamp) => {
              if (!timestamp) return null;
              if (timestamp.toDate) return timestamp.toDate().toISOString();
              if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toISOString();
              return timestamp;
            };
            
            // Format the match date
            const matchDate = matchData.time ? new Date(matchData.time * 1000) : new Date();
            const formattedDate = matchDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });

            // Prepare the match data in the exact format expected by the frontend
            const match = {
              id: matchDoc.id,
              // League info for the header
              league: {
                name: matchData.league?.name || 'Unknown League',
                logo: matchData.league?.logo || 'https://via.placeholder.com/30',
              },
              // Teams data
              home_team: matchData.home_team || 'Home Team',
              away_team: matchData.away_team || 'Away Team',
              home_team_logo: matchData.home_team_logo || 'https://via.placeholder.com/50',
              away_team_logo: matchData.away_team_logo || 'https://via.placeholder.com/50',
              // Match status and scores
              status: matchData.status || 'Not Started',
              score: {
                home: matchData.score?.home,
                away: matchData.score?.away
              },
              // Formatted date string
              date: formattedDate,
              // Raw timestamp for sorting
              timestamp: matchData.time || 0,
              // Additional data (not shown in card but might be needed elsewhere)
              _meta: {
                venue: matchData.venue || 'TBD',
                analysis: matchData.analysis || '',
                analytics: {
                  interestRating: analyticsData.interestRating || 0,
                  clicks: analyticsData.clicks || 0,
                  pageViews: analyticsData.pageViews || 0,
                  timeSpent: analyticsData.timeSpent || 0,
                  shares: analyticsData.shares || 0
                },
                // Keep headToHead data but don't include in the main card
                headToHead: matchData.headToHead ? {
                  updatedAt: convertTimestamp(matchData.headToHead.updatedAt),
                  matches: (matchData.headToHead.matches || []).map(h2h => ({
                    ...h2h,
                    date: h2h.date ? new Date(h2h.date).toISOString() : null
                  }))
                } : null
              }
            };
            
            return match;
          } else {
            console.warn(`Match not found: ${matchId} (from analytics doc ${analyticsDoc.id})`);
            // Return a placeholder object for debugging in the UI
            return {
              id: matchId,
              league: {
                name: `Missing match: ${matchId}`,
                logo: 'https://via.placeholder.com/30',
              },
              home_team: 'Unknown',
              away_team: 'Unknown',
              home_team_logo: 'https://via.placeholder.com/50',
              away_team_logo: 'https://via.placeholder.com/50',
              status: 'Not Found',
              score: { home: null, away: null },
              date: 'N/A',
              timestamp: 0,
              _meta: {
                venue: 'N/A',
                analysis: '',
                analytics: {
                  interestRating: analyticsData.interestRating || 0,
                  clicks: analyticsData.clicks || 0,
                  pageViews: analyticsData.pageViews || 0,
                  timeSpent: analyticsData.timeSpent || 0,
                  shares: analyticsData.shares || 0
                },
                headToHead: null
              }
            };
          }
        } catch (error) {
          console.error(`Error processing match ${matchId}:`, error);
          return null;
        }
      });
      
      // Wait for all match fetches to complete
      const matches = await Promise.all(matchPromises);
      
      // Filter out nulls and sort by interest rating (highest first)
      trendingMatches = matches
        .filter(match => match !== null)
        .sort((a, b) => ((b._meta?.analytics?.interestRating || 0) - (a._meta?.analytics?.interestRating || 0)));
      
      
    } else {
      
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