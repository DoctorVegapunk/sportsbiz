<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { trackMatchInteraction } from '$lib/analytics';
  
  // State for number of matches to show
  let showLimit = 5; // Default to showing 5 matches
  
  export let data;
  
  // Show analysis by default if match hasn't started yet
  const isMatchInFuture = (matchData) => {
    if (!matchData?.utcDate) return false;
    return new Date(matchData.utcDate) > new Date();
  };
  
  let showAnalysis = isMatchInFuture(data?.match);

  // Format date for display in user's local timezone with AM/PM
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      // Get date components
      const weekday = date.toLocaleString(undefined, { weekday: 'long' });
      const month = date.toLocaleString(undefined, { month: 'long' });
      const day = date.getDate();
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12; // Convert to 12-hour format
      
      return `<span class="font-semibold">${weekday}</span>, ${month} ${day}, ${year} at <span class="font-semibold">${displayHours}:${minutes}</span> ${period}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date format error';
    }
  };
  
  // Calculate win percentages for predictions
  const getWinPercentage = () => {
    if (!data.predictions || !data.predictions.predictions) return { home: 33, away: 33, draw: 34 };
    const predictions = data.predictions.predictions;
    return {
      home: parseInt(predictions.percent.home || "33"),
      away: parseInt(predictions.percent.away || "33"),
      draw: parseInt(predictions.percent.draw || "34")
    };
  };
  
  const winPercentages = getWinPercentage();
  
  // Check if match is live
  const isLiveMatch = data.match?.status === 'IN_PLAY';
  
  // Check if match is ongoing (within 135 minutes of start time)
  const isMatchOngoing = () => {
    if (!data.match?.utcDate) return false;
    const matchTime = new Date(data.match.utcDate);
    const now = new Date();
    const timeDiff = (now - matchTime) / (1000 * 60); // difference in minutes
    return timeDiff > 0 && timeDiff <= 135; // Within 2 hours 15 minutes (135 minutes)
  };
  
  // Check if match is finished (more than 135 minutes since start time)
  const isMatchFinished = () => {
    if (!data.match?.utcDate) return false;
    const matchTime = new Date(data.match.utcDate);
    const now = new Date();
    const timeDiff = (now - matchTime) / (1000 * 60); // difference in minutes
    return timeDiff > 135; // More than 2 hours 15 minutes (135 minutes)
  };

  let startTime = 0;
  let matchId = data.match?.id || data.matchId;
  let timeInterval;

  // Track time spent on page
  function trackTimeSpent() {
    if (!matchId || !browser) return;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    if (timeSpent > 3) { // Only track if spent more than 3 seconds
      trackMatchInteraction(matchId, 'timeSpent', { timeSpent });
    }
  }

  onMount(() => {
    if (browser) {
      startTime = Date.now();
      
      // Track page view
      trackMatchInteraction(matchId, 'pageView');
      
      // Set up time tracking interval (every 30 seconds)
      timeInterval = setInterval(() => {
        trackTimeSpent();
        startTime = Date.now(); // Reset timer after each interval
      }, 30000);
      
      // Track time on page unload
      window.addEventListener('beforeunload', trackTimeSpent);
    }
  });

  onDestroy(() => {
    if (browser) {
      clearInterval(timeInterval);
      trackTimeSpent();
      window.removeEventListener('beforeunload', trackTimeSpent);
    }
  });
</script>

<svelte:head>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7287368945352748"
  crossorigin="anonymous"></script>
  
  <!-- SEO Meta Tags -->
  {#if data.match}
    <title>{data.match.homeTeam.name} vs {data.match.awayTeam.name} - {data.match.league?.name || 'Football Match'} Prediction & Analysis</title>
    <meta name="description" content="Expert analysis and prediction for {data.match.homeTeam.name} vs {data.match.awayTeam.name} in {data.match.league?.name || 'Football'}. Get insights on team form, key players, and match predictions." />
    <meta property="og:title" content="{data.match.homeTeam.name} vs {data.match.awayTeam.name} - Match Analysis" />
    <meta property="og:description" content="Expert football analysis and prediction for the upcoming match between {data.match.homeTeam.name} and {data.match.awayTeam.name}." />
    <meta property="og:type" content="article" />
  {/if}
</svelte:head>

<div 
  class="container mx-auto px-4 py-8 animate-fadein"
  on:click={recordClick}
  on:keydown={handleKeydown}
  role="button"
  tabindex="0"
>
  {#if !data.matchFound}
    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8 animate-shake">
      <p>Match not found or error occurred.</p>
      {#if data.error}
        <p class="text-sm mt-2">Error: {data.error}</p>
        {#if data.error.includes('rate limit')}
          <p class="text-xs mt-2 text-orange-600">You have made too many requests. Please wait a minute before trying again.</p>
        {/if}
      {/if}
    </div>
  {:else}
    <!-- Match Header -->
    <div class="text-center mb-8">
      <!-- League Logo -->
      {#if data.match.league?.logo}
        <div class="flex justify-center mb-2">
          <img 
            src={data.match.league.logo} 
            alt={data.match.league.name} 
            class="w-16 h-16 object-contain mx-auto"
          />
        </div>
      {/if}
      
      <!-- League Name -->
      <h1 class="text-2xl md:text-3xl font-bold text-blue-700 drop-shadow-lg animate-slidein mb-2">
        {data.match.league?.name || 'Football Match'}
      </h1>
      
      <!-- Round -->
      {#if data.match.league?.round}
        <p class="text-gray-600 text-sm mb-1">{data.match.league.round}</p>
      {/if}
      
      <!-- Country with Flag -->
      {#if data.match.league?.country && data.match.league.country !== 'Unknown'}
        <div class="flex items-center justify-center gap-2 text-gray-600 text-sm">
          <span>{data.match.league.country}</span>
          {#if data.match.league?.flag}
            <img 
              src={data.match.league.flag} 
              alt={data.match.league.country} 
              class="w-4 h-3 object-cover rounded-sm shadow"
            />
          {/if}
        </div>
      {/if}
      <div class="grid grid-cols-1 md:grid-cols-3 items-center gap-6 my-8">
        <div class="flex flex-col items-center space-y-2 group transition-all duration-200">
          <img src={data.match.homeTeam.crest} alt={data.match.homeTeam.name} class="w-20 h-20 object-contain team-logo transition-transform duration-200 group-hover:scale-110 drop-shadow-md" />
          <h2 class="text-xl font-semibold text-gray-800 team-name transition-colors duration-200 group-hover:text-blue-700">{data.match.homeTeam.name}</h2>
          {#if data.homeTeamStanding}
            <span class="text-sm bg-blue-50 px-2 py-1 rounded font-bold text-blue-700 shadow">{'#'}{data.homeTeamStanding.position}</span>
          {/if}
        </div>
        <div class="text-3xl font-bold text-gray-500 my-4 md:my-0 flex flex-col items-center justify-center">
          {#if data.match.status === 'FINISHED'}
            <div class="text-2xl font-bold animate-pop">
              {data.match.score.fullTime.home ?? '-'} : {data.match.score.fullTime.away ?? '-'}
            </div>
          {:else}
            <span class="animate-pulse">VS</span>
          {/if}
          <div class="text-sm mt-2 text-gray-600">
            Matchday {data.match.matchday}
          </div>
        </div>
        <div class="flex flex-col items-center space-y-2 group transition-all duration-200">
          <img src={data.match.awayTeam.crest} alt={data.match.awayTeam.name} class="w-20 h-20 object-contain team-logo transition-transform duration-200 group-hover:scale-110 drop-shadow-md" />
          <h2 class="text-xl font-semibold text-gray-800 team-name transition-colors duration-200 group-hover:text-red-700">{data.match.awayTeam.name}</h2>
          {#if data.awayTeamStanding}
            <span class="text-sm bg-red-50 px-2 py-1 rounded font-bold text-red-700 shadow">{'#'}{data.awayTeamStanding.position}</span>
          {/if}
        </div>
      </div>
      <div class="text-gray-600 space-y-2">
        <p class="animate-fadein">
          {@html formatDate(data.match.utcDate)}
        </p>
        {#if data.venue}
          <p>Venue: <span class="italic">{data.venue}</span></p>
        {/if}
        {#if data.match.status === 'FINISHED' || isMatchFinished()}
          <div class="inline-block px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
            FINISHED
          </div>
        {:else if isLiveMatch}
          <div class="inline-block px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold animate-pulse">
            LIVE
          </div>
        {:else if isMatchOngoing()}
          <div class="inline-block px-3 py-1 bg-yellow-600 text-white rounded-full text-sm font-bold">
            ONGOING
          </div>
        {:else}
          <div class="inline-block px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
            {data.match.status == "TIMED" ? "SCHEDULED" : data.match.status}
          </div>
        {/if}
        {#if isMatchInFuture(data.match)}
          <div class="mt-4">
            <a 
              href="https://moy.auraodin.com/redirect.aspx?pid=135551&bid=1713&lpid=1582" 
              target="_blank"
              style="background-color:#0d585f"
              class="inline-block text-white font-bold py-2 px-6 rounded-full transition-colors duration-200 shadow-md hover:bg-opacity-90"
            >
              Bet Now
            </a>
          </div>
        {/if}
      </div>
    </div>

    <!-- Match Analysis Section -->
    <div class="border-2 border-gray-400 rounded-lg shadow-md overflow-hidden mb-8 animate-fadein-slow">
      <div style="background-color:#000066;" class="w-full text-left p-4 text-white">
        <h2 class="text-xl font-bold">AI Match Analysis & Prediction</h2>
      </div>
      
      <div class="p-6 bg-white border-t border-gray-100">
        {#if data.analysis}
          <div class="prose max-w-none">
            {@html data.analysis}
          </div>
        {:else}
          <div class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p class="text-gray-500 italic">Generating AI analysis...</p>
            <p class="text-sm text-gray-400 mt-2">This may take a few moments</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Head to Head Section -->
    {#if data.h2h?.length > 0}
      <div class="border-2 border-gray-400 rounded-lg shadow-md overflow-hidden mb-8 animate-fadein">
        <div style="background-color:#000066;" class="w-full flex justify-between items-center p-4 text-white">
          <h2 class="text-xl font-bold">Head to Head History</h2>
          <div class="flex items-center space-x-2">
            <span class="text-sm">Show:</span>
            <select 
              class="bg-white text-gray-800 rounded px-2 py-1 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              bind:value={showLimit}
            >
              <option value={5}>5 matches</option>
              <option value={10}>10 matches</option>
              <option value={15}>15 matches</option>
            </select>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Home Team</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Away Team</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Competition</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each data.h2h.slice(0, showLimit) as match}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(match.date).toLocaleDateString()}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      {#if match.homeTeamLogo}
                        <img class="h-6 w-6 mr-2" src={match.homeTeamLogo} alt={match.homeTeam} />
                      {/if}
                      <span class="text-sm font-medium text-gray-900">{match.homeTeam}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-center">
                      <span class="px-2 py-1 rounded-full text-sm font-medium
                        {match.winner === 'home' ? 'bg-green-100 text-green-800' : 
                         match.winner === 'away' ? 'bg-red-100 text-red-800' : 
                         'bg-gray-100 text-gray-800'}">
                        {match.homeGoals} - {match.awayGoals}
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center justify-end">
                      <span class="text-sm font-medium text-gray-900">{match.awayTeam}</span>
                      {#if match.awayTeamLogo}
                        <img class="h-6 w-6 ml-2" src={match.awayTeamLogo} alt={match.awayTeam} />
                      {/if}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    {match.competition}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .animate-fadein {
    animation: fadein 0.7s;
  }
  .animate-fadein-slow {
    animation: fadein 1.2s;
  }
  .animate-slidein {
    animation: slidein 0.7s;
  }
  .animate-pop {
    animation: pop 0.5s;
  }
  .animate-shake {
    animation: shake 0.4s;
  }
  
  /* Content styles */
  
  @keyframes fadein {
    from { opacity: 0; transform: translateY(16px);}
    to { opacity: 1; transform: translateY(0);}
  }
  @keyframes slidein {
    from { opacity: 0; transform: translateX(-32px);}
    to { opacity: 1; transform: translateX(0);}
  }
  @keyframes pop {
    0% { transform: scale(0.8);}
    60% { transform: scale(1.15);}
    100% { transform: scale(1);}
  }
  @keyframes shake {
    0% { transform: translateX(0);}
    20% { transform: translateX(-8px);}
    40% { transform: translateX(8px);}
    60% { transform: translateX(-8px);}
    80% { transform: translateX(8px);}
    100% { transform: translateX(0);}
  }
</style>