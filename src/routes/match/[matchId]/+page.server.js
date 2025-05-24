import { firestore } from '$lib/firebase.js';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";

import { error } from '@sveltejs/kit';
import { Groq } from 'groq-sdk';
import { VITE_GROQ_API_KEY, VITE_API_FOOTBALL_KEY } from '$env/static/private';

// Function to clean up old match data
async function cleanupOldMatches() {
  try {
    const today = startOfDay(new Date());
    const matchesRef = collection(firestore, 'matches');
    const q = query(matchesRef, where('utcDate', '<', today));
    
    const querySnapshot = await getDocs(q);
    const deletePromises = [];
    
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    console.log(`Cleaned up ${deletePromises.length} old matches`);
    return deletePromises.length;
  } catch (error) {
    console.error('Error cleaning up old matches:', error);
    return 0;
  }
}

// Function to fetch head-to-head data from the API
async function fetchHeadToHead(homeTeamId, awayTeamId) {
  if (!homeTeamId || !awayTeamId) {
    return [];
  }
  
  try {
    const url = `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': VITE_API_FOOTBALL_KEY
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data?.response) ? data.response : [];
  } catch (error) {
    console.error('Error in fetchHeadToHead:', error);
    return [];
  }
}

// Function to process and store head-to-head data
async function processHeadToHead(matchDoc, homeTeamId, awayTeamId) {
  console.log('Processing head-to-head for match:', matchDoc.id);
  console.log('Home Team ID:', homeTeamId, 'Away Team ID:', awayTeamId);
  
  try {
    // Check if we already have recent head-to-head data (less than 24 hours old)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    console.log('Checking for existing head-to-head data...');
    console.log('Current match doc:', JSON.stringify(matchDoc, null, 2));
    
    if (matchDoc.headToHead?.updatedAt?.toDate() > oneDayAgo) {
      console.log('Using cached head-to-head data');
      return matchDoc.headToHead.matches || [];
    } else {
      console.log('No recent cached data found, will fetch from API');
    }
    
    // If no recent data, fetch from API
    console.log('Fetching head-to-head data from API...');
    const h2hData = await fetchHeadToHead(homeTeamId, awayTeamId, 5);
    console.log('API response:', JSON.stringify(h2hData, null, 2));
    
    if (!h2hData || h2hData.length === 0) {
      console.log('No head-to-head data returned from API');
      return [];
    }
    
    // Process the data to only keep what we need
    const processedMatches = h2hData.map(match => ({
      id: match.fixture.id,
      date: match.fixture.date,
      homeTeam: match.teams.home.name,
      homeTeamLogo: match.teams.home.logo,
      awayTeam: match.teams.away.name,
      awayTeamLogo: match.teams.away.logo,
      homeGoals: match.goals.home,
      awayGoals: match.goals.away,
      competition: match.league.name,
      status: match.fixture.status.short,
      winner: match.goals.home > match.goals.away ? 'home' : 
             match.goals.away > match.goals.home ? 'away' : 'draw'
    }));
    
    // Update the match document with the new head-to-head data
    const updateData = {
      headToHead: {
        matches: processedMatches,
        updatedAt: new Date()
      }
    };
    
    console.log('Updating match document with head-to-head data:', JSON.stringify(updateData, null, 2));
    
    const matchRef = doc(firestore, 'matches', matchDoc.id);
    console.log('Match reference path:', matchRef.path);
    
    try {
      await updateDoc(matchRef, updateData);
      console.log('Successfully updated match document with head-to-head data');
    } catch (updateError) {
      console.error('Error updating match document:', updateError);
      throw updateError; // Re-throw to be caught by the outer try-catch
    }
    
    return processedMatches;
  } catch (error) {
    console.error('Error processing head-to-head data:', error);
    return [];
  }
}

console.log('Environment Variables Loaded:', {
  hasGroqKey: !!VITE_GROQ_API_KEY,
  hasFootballKey: !!VITE_API_FOOTBALL_KEY
});

// Initialize Groq client
const groq = new Groq({
  apiKey: VITE_GROQ_API_KEY
});

// Helper function to generate AI analysis
async function generateMatchAnalysis(matchData) {
  try {
    const homeTeam = matchData.home_team;
    const awayTeam = matchData.away_team;
    const league = matchData.league?.name || 'Football Match';
    const matchDate = new Date(matchData.time * 1000).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const prompt = `${homeTeam} vs ${awayTeam}, ${league}, ${matchDate}

You are a football analyst. Write a comprehensive 200-word prediction for the match above in rich text format using HTML tags for formatting. Include:

1. **Recent form** of both teams
2. **Key player to watch** in each team  
3. **Historical head-to-head** record
4. **Tactical outlook** or expected game style
5. **Final prediction**

Use HTML formatting like <strong>, <em>, <p>, and <br> tags to make the analysis visually appealing and easy to read. Make sure to use the actual team names (${homeTeam} and ${awayTeam}) throughout your analysis.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct", // Using a more stable model
      temperature: 0.7,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false
    });

    return chatCompletion.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return null;
  }
}

// Helper function to save analysis to Firestore
async function saveAnalysisToFirestore(matchId, analysis) {
  try {
    const matchRef = doc(firestore, 'matches', matchId);
    await updateDoc(matchRef, {
      analysis: analysis,
      analysisGeneratedAt: new Date().toISOString()
    });
    console.log('Analysis saved to Firestore for match:', matchId);
  } catch (error) {
    console.error('Error saving analysis to Firestore:', error);
  }
}

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
  // Clean up old matches before loading new data
  try {
    await cleanupOldMatches();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  const { matchId } = params;
  console.log('Looking for match with ID:', matchId);
  
  try {
    // Get match data from Firestore
    const matchRef = doc(firestore, 'matches', matchId);
    console.log('Firestore document path: matches/', matchId);
    
    const matchSnap = await getDoc(matchRef);
    console.log('Match document exists:', matchSnap.exists());

    if (!matchSnap.exists()) {
      throw error(404, 'Match not found');
    }

    const matchData = matchSnap.data();
    
    // Generate AI analysis if not already present or if it's older than 24 hours
    if (!matchData.analysis || 
        (matchData.analysisGeneratedAt && 
         new Date() - new Date(matchData.analysisGeneratedAt) > 24 * 60 * 60 * 1000)) {
      const analysis = await generateMatchAnalysis(matchData);
      if (analysis) {
        await saveAnalysisToFirestore(matchId, analysis);
        matchData.analysis = analysis;
      }
    }
    
    // Get head-to-head data
    let h2h = [];
    console.log('Match data:', JSON.stringify(matchData, null, 2));
    
    if (matchData.home_team_id && matchData.away_team_id) {
      console.log('Fetching head-to-head data...');
      try {
        h2h = await processHeadToHead({
          id: matchId,
          ...matchData
        }, matchData.home_team_id, matchData.away_team_id);
        console.log('Processed head-to-head data:', JSON.stringify(h2h, null, 2));
      } catch (h2hError) {
        console.error('Error processing head-to-head data:', h2hError);
      }
    }

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
      analysis: matchData.analysis, // Use the updated analysis from matchData
      predictions: {}, // Can be added later
      h2h: h2h || [], // Include the head-to-head data
      error: null
    };
  } catch (err) {
    console.error('Error fetching match data:', err);
    
    // If it's already a SvelteKit error, re-throw it
    if (err.status) {
      throw err;
    }
    
    // Otherwise, throw a 500 error for unexpected errors
    throw error(500, {
      message: 'Failed to load match data. Please try again later.'
    });
  }
}