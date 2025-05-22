import { firestore } from '$lib/firebase.js';
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

// Helper function to list all matches in the database (for debugging)
async function listAllMatches() {
  try {
    const matchesCollection = collection(firestore, 'matches');
    const snapshot = await getDocs(matchesCollection);
    
    if (snapshot.empty) {
      console.log('No matches found in the database');
      return [];
    }
    
    const matches = [];
    snapshot.forEach((doc) => {
      matches.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Available matches in Firestore:', matches.map(m => ({
      id: m.id,
      home: m.home_team,
      away: m.away_team,
      time: m.time ? new Date(m.time * 1000).toISOString() : 'No time'
    })));
    
    return matches;
  } catch (error) {
    console.error('Error listing matches:', error);
    return [];
  }
}

export async function load({ params }) {
  const { matchId } = params;
  console.log('Looking for match with ID:', matchId);
  
  try {
    // Get match data from Firestore
    const matchRef = doc(firestore, 'matches', matchId);
    console.log('Firestore document path: matches/', matchId);
    
    const matchSnap = await getDoc(matchRef);
    console.log('Match document exists:', matchSnap.exists());

    if (!matchSnap.exists()) {
      console.log('Match not found in Firestore');
      // List all available matches to help with debugging
      await listAllMatches();
      return {
        matchFound: false,
        error: 'Match not found in the database',
        debug: {
          matchId,
          timestamp: new Date().toISOString()
        }
      };
    }

    const matchData = matchSnap.data();
    console.log('Retrieved match data:', JSON.stringify(matchData, null, 2));

    // Format the match data to match what the frontend expects
    const formattedMatch = {
      id: matchData.id,
      homeTeam: {
        id: matchData.home_team_id,
        name: matchData.home_team,
        crest: matchData.home_team_logo
      },
      awayTeam: {
        id: matchData.away_team_id,
        name: matchData.away_team,
        crest: matchData.away_team_logo
      },
      utcDate: new Date(matchData.time * 1000).toISOString(),
      status: matchData.status,
      matchday: 1, // Default value, update if available
      score: {
        fullTime: {
          home: matchData.score?.home || null,
          away: matchData.score?.away || null
        }
      },
      competition: {
        name: matchData.league?.name || 'Football Match',
        code: matchData.league?.country?.substring(0, 3).toUpperCase() || 'FBL',
        emblem: matchData.league?.logo || ''
      },
      league: matchData.league || null,
      venue: matchData.venue
    };

    // Return the match data with all required properties
    return {
      matchFound: true,
      match: formattedMatch,
      homeTeamStanding: null, // These can be populated if needed
      awayTeamStanding: null, // These can be populated if needed
      venue: matchData.venue,
      analysis: null, // Can be added later
      predictions: {}, // Can be added later
      error: null
    };
  } catch (error) {
    console.error('Error fetching match data:', error);
    return {
      matchFound: false,
      error: 'Failed to load match data. Please try again later.'
    };
  }
}