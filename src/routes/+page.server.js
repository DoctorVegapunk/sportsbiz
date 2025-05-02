export const load = async ({ fetch, url }) => {
  try {
    const API_KEY = import.meta.env.VITE_ODDS_API_KEY;
    const showAllLeagues = url.searchParams.get('showAll') === 'true';
    
    // Major leagues to show initially
    const majorLeagues = [
      'soccer_epl',            // English Premier League
      'soccer_spain_la_liga',  // La Liga
      'soccer_germany_bundesliga', // Bundesliga
      'soccer_italy_serie_a',  // Serie A
      'soccer_france_ligue_one' // Ligue 1
    ];

    // Get all available sports/leagues
    const sportsResponse = await fetch(
      `https://api.the-odds-api.com/v4/sports?apiKey=${API_KEY}`
    );
    
    if (!sportsResponse.ok) {
      throw new Error('Failed to fetch sports data');
    }
    
    const allSports = await sportsResponse.json();
    const usageInfo = {
      remaining_requests: sportsResponse.headers.get('x-requests-remaining'),
      daily_limit: sportsResponse.headers.get('x-requests-limit')
    };

    // Filter for soccer/football leagues
    const footballSports = allSports
      .filter(sport => sport.group.toLowerCase() === 'soccer')
      .map(sport => sport.key);
    
    // Only fetch major leagues unless showAllLeagues is true
    const sportsToFetch = showAllLeagues 
      ? footballSports 
      : footballSports.filter(sport => majorLeagues.includes(sport));

    // Fetch matches for filtered football leagues
    const allMatches = [];
    for (const sport of sportsToFetch) {
      const response = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sport}/odds/?regions=eu&apiKey=${API_KEY}`
      );
      if (response.ok) {
        const matches = await response.json();
        allMatches.push(...matches.map(m => ({ ...m, sportKey: sport })));
        
        // Update remaining requests after each API call
        usageInfo.remaining_requests = response.headers.get('x-requests-remaining');
      }
    }

    // Group matches by league
    const matchesByLeague = allMatches.reduce((acc, match) => {
      const league = match.sport_title;
      if (!acc[league]) acc[league] = [];
      acc[league].push(match);
      return acc;
    }, {});

    return {
      leagues: Object.entries(matchesByLeague),
      remaining_requests: parseInt(usageInfo.remaining_requests) || null,
      daily_limit: parseInt(usageInfo.daily_limit) || null,
      showAllLeagues,
      error: null
    };
  } catch (error) {
    return {
      leagues: [],
      remaining_requests: null,
      daily_limit: null,
      showAllLeagues: false,
      error: error.message
    };
  }
};