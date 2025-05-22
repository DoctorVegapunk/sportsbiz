import { firestore } from '$lib/firebase.js';
import { doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { error } from '@sveltejs/kit';
import { Groq } from 'groq-sdk';
import { VITE_GROQ_API_KEY } from '$env/static/private';

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
      
      // Throw a 404 error to trigger the error page
      throw error(404, {
        message: 'Match not found in the database'
      });
    }

    const matchData = matchSnap.data();
    console.log('Retrieved match data:', JSON.stringify(matchData, null, 2));

    // Generate AI analysis if it doesn't exist
    let analysis = matchData.analysis || null;
    
    if (!analysis) {
      console.log('No analysis found, generating AI analysis...');
      analysis = await generateMatchAnalysis(matchData);
      
      if (analysis) {
        // Save the generated analysis back to Firestore
        await saveAnalysisToFirestore(matchId, analysis);
        console.log('AI analysis generated and saved');
      } else {
        console.log('Failed to generate AI analysis');
      }
    } else {
      console.log('Using existing analysis from database');
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
      analysis: analysis, // Include the AI-generated or existing analysis
      predictions: {}, // Can be added later
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