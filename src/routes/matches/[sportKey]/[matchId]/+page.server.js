import { VITE_FOOTBALL_DATA_API_KEY, VITE_API_FOOTBALL_KEY } from '$env/static/private';

export async function load({ params }) {
  // Extract parameters from the route
  const { matchId } = params;
  
  try {
    // First API call to football-data.org for match details
    console.log(`Fetching match data for ID: ${matchId}`);
    
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
        error: errorMsg
      };
    }
    
    const match = await footballDataResponse.json();
    
    if (!match || !match.homeTeam || !match.awayTeam) {
      console.log('No valid match found in football-data response');
      return { 
        matchFound: false,
        match: null,
        homeTeamStanding: null,
        awayTeamStanding: null,
        headToHeadData: null,
        predictions: {},
        venue: null,
        error: 'No valid match found in football-data response'
      };
    }
    
    const matchDate = match.utcDate.split('T')[0]; 
    const homeTeamName = match.homeTeam.name;
    const awayTeamName = match.awayTeam.name;
    
    console.log(`Match found in first API: ${homeTeamName} vs ${awayTeamName} on ${matchDate}`);
    
    // Fetch league standings for both teams
    const competitionId = match.competition.id;
    const standingsResponse = await fetch(
      `https://api.football-data.org/v4/competitions/${competitionId}/standings`,
      {
        headers: {
          'X-Auth-Token': VITE_FOOTBALL_DATA_API_KEY
        }
      }
    );
    
    let homeTeamStanding = null;
    let awayTeamStanding = null;
    
    if (standingsResponse.ok) {
      const standingsData = await standingsResponse.json();
      if (standingsData.standings && standingsData.standings.length > 0) {
        // Typically using the first standings table (total standings)
        const standings = standingsData.standings[0].table;
        
        homeTeamStanding = standings.find(standing => standing.team.id === match.homeTeam.id);
        awayTeamStanding = standings.find(standing => standing.team.id === match.awayTeam.id);
      }
    }
    
    // Fetch head-to-head data using the dedicated endpoint
    const headToHeadResponse = await fetch(
      `https://api.football-data.org/v4/matches/${matchId}/head2head`,
      {
        headers: {
          'X-Auth-Token': VITE_FOOTBALL_DATA_API_KEY
        }
      }
    );
    
    let headToHeadData = null;
    
    if (headToHeadResponse.ok) {
      headToHeadData = await headToHeadResponse.json();
      console.log(`Retrieved ${headToHeadData?.matches?.length || 0} head-to-head matches`);
    } else {
      console.log(`Head-to-head API error: ${headToHeadResponse.status}`);
      
      // Fallback to previous implementation if the new endpoint fails
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
          // Filter matches where the two teams played against each other
          headToHeadData = {
            matches: h2hData.matches.filter(m => 
              (m.homeTeam.id === match.homeTeam.id && m.awayTeam.id === match.awayTeam.id) ||
              (m.homeTeam.id === match.awayTeam.id && m.awayTeam.id === match.homeTeam.id)
            )
          };
        }
      }
    }
    
    // Second API call to api-sports.io for fixtures and predictions
    console.log(`Fetching fixtures for date: ${matchDate}`);
    
    const apiSportsResponse = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${matchDate}`,
      {
        headers: {
          'x-apisports-key': VITE_API_FOOTBALL_KEY
        }
      }
    );
    
    if (!apiSportsResponse.ok) {
      console.log(`API-Sports error: ${apiSportsResponse.status}`);
      return { 
        matchFound: true,
        match,
        homeTeamStanding,
        awayTeamStanding,
        headToHeadData,
        predictions: {},
        venue: null,
        error: `API-Sports error: ${apiSportsResponse.status}`
      };
    }
    
    const apiSportsData = await apiSportsResponse.json();
    
    // Find matching fixture
    let matchingFixture = null;
    
    if (apiSportsData.response && apiSportsData.response.length > 0) {
      console.log(`Found ${apiSportsData.response.length} fixtures for date ${matchDate}`);
      
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
        if (!fixture.teams || !fixture.teams.home || !fixture.teams.away) {
          return false;
        }
        
        const homeTeamMatches = getNameSimilarity(fixture.teams.home.name, homeTeamName);
        const awayTeamMatches = getNameSimilarity(fixture.teams.away.name, awayTeamName);
        
        if (homeTeamMatches && awayTeamMatches) {
          console.log(`Matched: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
          return true;
        }
        return false;
      });
    }
    
    let predictions = {};
    let venue = null; 
    
    if (matchingFixture) {
      const fixtureId = matchingFixture.fixture.id;
      console.log(`Match found in second API! Fixture ID: ${fixtureId}`);
      
      // Get venue information from the matching fixture
      venue = matchingFixture.fixture.venue;
      
      // Fetch predictions for the matching fixture
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
        }
      }
      
      return {
        matchFound: true,
        match,
        matchingFixture,
        homeTeamStanding,
        awayTeamStanding,
        headToHeadData,
        predictions,
        venue,
        error: null
      };
    } else {
      console.log('No matching fixture found in second API');
      return { 
        matchFound: true,
        match,
        homeTeamStanding,
        awayTeamStanding,
        headToHeadData,
        predictions: {},
        venue: null,
        error: null
      };
    }
    
  } catch (error) {
    console.error('Error fetching match data:', error);
    return { 
      matchFound: false,
      match: null,
      homeTeamStanding: null,
      awayTeamStanding: null,
      headToHeadData: null,
      predictions: {},
      venue: null,
      error: error.message
    };
  }
}