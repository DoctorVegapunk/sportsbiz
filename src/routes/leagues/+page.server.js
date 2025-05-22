import { firestore } from '$lib/firebase.js';
import { collection, doc, getDoc, setDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';

const ONE_DAY = 24 * 60 * 60 * 1000;

// Helper function to format date as YYYY-MM-DD
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Helper function to get today and tomorrow's dates
const getNextTwoDays = () => {
  const dates = [];
  for (let i = 0; i < 2; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dates.push(formatDate(date));
  }
  return dates;
};

// Check if we need to update the data for a date
const needsUpdate = async (date) => {
  const docRef = doc(firestore, 'fixtures', date);
  try {
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return true;
    
    const data = docSnap.data();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const updatedAt = data.updatedAt?.toDate()?.getTime() || 0;
    
    // If data is older than 1 day, we should update it
    return (Date.now() - updatedAt) > oneDayInMs;
  } catch (error) {
    console.error(`Error checking update status for ${date}:`, error);
    return true; // If there's an error, try to fetch fresh data
  }
};

// Fetch fixtures for a specific date from the API
const fetchFixturesForDate = async (date) => {
  const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY;
  const response = await fetch(
    `https://v3.football.api-sports.io/fixtures?date=${date}`,
    {
      headers: {
        'x-rapidapi-key': API_KEY,
        'Cookie': 'B_ID=1222c05ea203443cb99ead17415ec691'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch fixtures: ${response.status}`);
  }

  const data = await response.json();
  return data.response || [];
};

// Process and store fixtures in Firestore
const processAndStoreFixtures = async (fixtures, date) => {
  if (!fixtures || fixtures.length === 0) return [];

  // Group fixtures by league
  const leaguesMap = new Map();
  const matchesToStore = [];
  
  // Process each fixture
  for (const fixture of fixtures) {
    if (!fixture || !fixture.league || !fixture.teams || !fixture.fixture) continue;
    
    const { league, teams, fixture: fixtureData } = fixture;
    const leagueId = league?.id;
    
    if (!leagueId) continue;
    
    // Create match ID or use the one from the API
    const matchId = fixtureData?.id?.toString() || `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create simplified match object that matches the structure in fixtures
    const match = {
      id: matchId,
      home_team: teams?.home?.name || 'Home Team',
      home_team_id: teams?.home?.id?.toString() || '0',
      home_team_logo: teams?.home?.logo || '',
      away_team: teams?.away?.name || 'Away Team',
      away_team_id: teams?.away?.id?.toString() || '0',
      away_team_logo: teams?.away?.logo || '',
      venue: fixtureData?.venue?.name || 'TBD',
      time: fixtureData?.timestamp || Math.floor(Date.now() / 1000),
      status: fixtureData?.status?.long || 'Not Started',
      score: fixtureData?.goals ? {
        home: fixtureData.goals.home,
        away: fixtureData.goals.away
      } : { home: null, away: null },
      // Add league information
      league: {
        id: leagueId,
        name: league.name || 'Unknown League',
        country: league.country || 'Unknown',
        logo: league.logo || '',
        flag: league.flag || null,
        round: league.round || 'Regular Season'
      },
      // Add timestamps
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Add match to batch for individual storage
    matchesToStore.push({
      id: matchId,
      data: match
    });

    // Add to leagues map for the fixtures collection
    if (!leaguesMap.has(leagueId)) {
      leaguesMap.set(leagueId, {
        id: leagueId,
        name: league.name || 'Unknown League',
        country: league.country || 'Unknown',
        logo: league.logo || '',
        flag: league.flag || '',
        round: league.round || 'Regular Season',
        matches: []
      });
    }

    const currentLeague = leaguesMap.get(leagueId);
    
    // Add the same match data to league
    currentLeague.matches.push(match);
  }

    // Store each match individually in the matches collection
  if (matchesToStore.length > 0) {
    try {
      const batch = [];
      for (const { id, data } of matchesToStore) {
        const matchRef = doc(firestore, 'matches', id);
        batch.push(setDoc(matchRef, data, { merge: true }));
      }
      // Execute all setDoc operations in parallel
      await Promise.all(batch);
      console.log(`Stored ${matchesToStore.length} matches in Firestore`);
    } catch (error) {
      console.error('Error storing individual matches in Firestore:', error);
      throw error;
    }
  }

  // Convert map to array of leagues
  const leagues = Array.from(leaguesMap.values()).map(league => ({
    ...league,
    matches: league.matches.filter(match => match)
  }));

  // Store the league data in the fixtures collection
  try {
    const dataToStore = {
      leagues: JSON.parse(JSON.stringify(leagues)),
      updatedAt: Timestamp.now()
    };

    const docRef = doc(firestore, 'fixtures', date);
    await setDoc(docRef, dataToStore);
    console.log(`Updated fixtures for date: ${date}`);
    return leagues;
  } catch (error) {
    console.error('Error storing fixtures in Firestore:', error);
    throw error;
  }
};

export const load = async ({ fetch }) => {
  const dates = getNextTwoDays();
  let allLeagues = [];
  const errors = [];

  for (const date of dates) {
    try {
      let leagues = [];
      const shouldUpdate = await needsUpdate(date);
      
      if (shouldUpdate) {
        // Fetch from API and update Firestore
        const fixtures = await fetchFixturesForDate(date);
        leagues = await processAndStoreFixtures(fixtures, date);
      } else {
        // Get data from Firestore
        const docRef = doc(firestore, 'fixtures', date);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          leagues = data.leagues || [];
        }
      }
      
      allLeagues = [...allLeagues, ...leagues];
    } catch (error) {
      console.error(`Error processing date ${date}:`, error);
      errors.push(`Failed to load fixtures for ${date}: ${error.message}`);
    }
  }

  // Group all matches by league name (as expected by the frontend)
  const leaguesMap = new Map();
  
  allLeagues.forEach(league => {
    const leagueName = league.name || 'Unknown League';
    
    if (!leaguesMap.has(leagueName)) {
      leaguesMap.set(leagueName, []);
    }
    
    // Transform matches to match the expected format
    const formattedMatches = league.matches.map(match => {
      // Check if we have a match ID, if not generate one
      const matchId = match.id || `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        id: matchId,
        sport_title: leagueName,
        sport_emblem: league.logo,
        home_team: match.home_team || 'Home Team',
        home_team_logo: match.home_team_logo || '',
        home_team_id: match.home_team_id || '0',
        away_team: match.away_team || 'Away Team',
        away_team_logo: match.away_team_logo || '',
        away_team_id: match.away_team_id || '0',
        commence_time: new Date((match.time || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        venue: match.venue || 'TBD',
        status: match.status || 'Not Started',
        score: match.score || { home: null, away: null }
      };
    });
    
    leaguesMap.set(leagueName, [...leaguesMap.get(leagueName), ...formattedMatches]);
  });

  // Convert to array of [leagueName, matches] pairs
  const leagues = Array.from(leaguesMap.entries())
    .filter(([_, matches]) => matches.length > 0);

  return {
    leagues,
    updatedAt: new Date().toISOString(),
    ...(errors.length > 0 && { errors })
  };
};