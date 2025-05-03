import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getDatabase(app);

const API_KEY = process.env.VITE_FOOTBALL_DATA_API_KEY;

async function updateLeagues() {
  const competitionsResponse = await fetch(
    'https://api.football-data.org/v4/competitions',
    {
      headers: { 'X-Auth-Token': API_KEY }
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
      { headers: { 'X-Auth-Token': API_KEY } }
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
  await set(ref(db, 'leagues'), {
    leagues: Object.entries(matchesByLeague),
    updatedAt: Date.now()
  });
  console.log("Leagues updated in Firebase!");
}

updateLeagues().catch(console.error);