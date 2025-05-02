export const load = async ({ params, fetch }) => {
  try {
    const API_KEY = import.meta.env.VITE_ODDS_API_KEY;
    const KENYAN_BOOKMAKERS = encodeURIComponent('bet365,paddypower,williamhill');
    const MARKETS = encodeURIComponent('h2h,spreads,totals');

    // First check available sports to verify sport key
    const sportsUrl = `https://api.the-odds-api.com/v4/sports/?apiKey=${API_KEY}`;
    const sportsRes = await fetch(sportsUrl);
    
    if (!sportsRes.ok) {
      console.error('Sports list fetch failed:', await sportsRes.text());
      return { error: true };
    }

    // Now try the actual request
    const matchUrl = `https://api.the-odds-api.com/v4/sports/${params.sportKey}/events/${params.matchId}/odds?apiKey=${API_KEY}&regions=eu&bookmakers=${KENYAN_BOOKMAKERS}&markets=${MARKETS}`;
    
    console.log('Final API URL:', matchUrl);
    
    const matchRes = await fetch(matchUrl);
    
    if (!matchRes.ok) {
      console.error('Match fetch failed:', await matchRes.text());
      return {
        match: {
          id: params.matchId,
          sport_key: params.sportKey,
          home_team: "Home Team",
          away_team: "Away Team",
          commence_time: new Date().toISOString(),
          sport_title: params.sportKey.replace(/_/g, ' '),
          bookmakers: []
        }
      };
    }

    const matchData = await matchRes.json();
    console.log('Match data received:', matchData.id);

    // Now try to fetch odds
    try {
      const oddsUrl = `https://api.the-odds-api.com/v4/sports/${params.sportKey}/events/${params.matchId}/odds?apiKey=${API_KEY}&regions=eu&bookmakers=${KENYAN_BOOKMAKERS}&markets=${MARKETS}`;
      const oddsRes = await fetch(oddsUrl);
      
      if (oddsRes.ok) {
        const oddsData = await oddsRes.json();
        console.log('Odds data received with bookmakers:', oddsData.bookmakers?.length || 0);
        
        // Return complete data with odds
        return {
          match: {
            ...matchData,
            bookmakers: oddsData.bookmakers || [],
            stats: {
              home_form: matchData.home_team_form || [],
              away_form: matchData.away_team_form || [],
              h2h: matchData.head_to_head || [],
              standings: matchData.standings || {}
            }
          }
        };
      } else {
        console.warn('Odds fetch failed, continuing with match data only');
      }
    } catch (oddsError) {
      console.error('Error fetching odds:', oddsError);
      // Continue without odds data
    }

    // Return match data even if odds failed
    return {
      match: {
        ...matchData,
        bookmakers: [],
        stats: {
          home_form: matchData.home_team_form || [],
          away_form: matchData.away_team_form || [],
          h2h: matchData.head_to_head || [],
          standings: matchData.standings || {}
        }
      }
    };

  } catch (error) {
    console.error('Error in match page load function:', error);
    // Return minimal data to prevent blank page
    return {
      match: {
        id: params.matchId || "unknown",
        sport_key: params.sportKey || "unknown",
        home_team: "Data Unavailable",
        away_team: "Data Unavailable",
        commence_time: new Date().toISOString(),
        sport_title: "Error loading data",
        bookmakers: [],
        stats: { home_form: [], away_form: [], h2h: [] }
      }
    };
  }
};