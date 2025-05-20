<script>
  import { onMount, onDestroy } from 'svelte';
  import { getDatabase, ref, runTransaction } from "firebase/database";
  import { initializeApp, getApps } from "firebase/app";
  import { browser } from '$app/environment';
  
  export let data;

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // Firebase configuration
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getDatabase(app);

  let startTime = 0;
  let matchId = data.match?.id || data.matchId;

  function recordTimeSpent() {
    if (!matchId || !browser) return;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    if (timeSpent < 3) return;
    const interestRef = ref(db, `interest/${matchId}`);
    runTransaction(interestRef, (current) => {
      if (current === null) {
        return { timeSpent: timeSpent, clicks: 0 };
      }
      return {
        ...current,
        timeSpent: (current.timeSpent || 0) + timeSpent
      };
    });
  }

  function recordClick() {
    if (!matchId || !browser) return;
    const interestRef = ref(db, `interest/${matchId}`);
    runTransaction(interestRef, (current) => {
      if (current === null) {
        return { timeSpent: 0, clicks: 1 };
      }
      return {
        ...current,
        clicks: (current.clicks || 0) + 1
      };
    });
  }

  function handleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      recordClick();
    }
  }

  onMount(() => {
    if (browser) {
      startTime = Date.now();
      window.addEventListener('beforeunload', recordTimeSpent);
    }
  });

  onDestroy(() => {
    if (browser) {
      recordTimeSpent();
      window.removeEventListener('beforeunload', recordTimeSpent);
    }
  });
</script>

<svelte:head>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7287368945352748"
  crossorigin="anonymous"></script>
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
      <h1 class="text-2xl md:text-3xl font-bold text-blue-700 mb-4 drop-shadow-lg animate-slidein">{data.match.competition.name}</h1>
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
        <p class="animate-fadein">{formatDate(data.match.utcDate)}</p>
        {#if data.venue}
          <p>Venue: <span class="font-semibold">{data.venue}</span></p>
        {/if}
        {#if isLiveMatch}
          <div class="inline-block px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold animate-pulse">
            LIVE
          </div>
        {:else if data.match.status === 'FINISHED'}
          <div class="inline-block px-3 py-1 bg-gray-600 text-white rounded-full text-sm font-bold">
            COMPLETED
          </div>
        {:else}
          <div class="inline-block px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
            {data.match.status == "TIMED" ? "SCHEDULED" : data.match.status}
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Match Analysis Section -->
    <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow-md overflow-hidden mb-8 animate-fadein-slow">
      <div class="bg-blue-700 p-3 text-white">
        <h2 class="text-lg font-bold">Match Analysis</h2>
      </div>
      <div class="p-4">
        {#if data.analysis}
          <p class="text-gray-700 whitespace-pre-line">{data.analysis}</p>
        {:else}
          <p class="text-gray-500 text-center italic">No Analysis yet</p>
        {/if}
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      <!-- Team Standings -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden animate-fadein-slow">
        <div class="bg-blue-700 p-3 text-white">
          <h2 class="text-lg font-bold">Team Standings</h2>
        </div>
        <div class="p-4">
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead>
                <tr class="bg-blue-50">
                  <th class="px-4 py-2 text-left">Team</th>
                  <th class="px-4 py-2 text-center">Pos</th>
                  <th class="px-4 py-2 text-center">P</th>
                  <th class="px-4 py-2 text-center">W</th>
                  <th class="px-4 py-2 text-center">D</th>
                  <th class="px-4 py-2 text-center">L</th>
                  <th class="px-4 py-2 text-center">GD</th>
                  <th class="px-4 py-2 text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                {#if data.homeTeamStanding}
                  <tr class="bg-blue-50 hover:bg-blue-100 transition-all duration-200">
                    <td class="px-4 py-2 flex items-center">
                      <img src={data.homeTeamStanding.team.crest} alt="" class="w-5 h-5 mr-2" />
                      <span>{data.homeTeamStanding.team.shortName || data.homeTeamStanding.team.name}</span>
                    </td>
                    <td class="px-4 py-2 text-center">{data.homeTeamStanding.position}</td>
                    <td class="px-4 py-2 text-center">{data.homeTeamStanding.playedGames}</td>
                    <td class="px-4 py-2 text-center">{data.homeTeamStanding.won}</td>
                    <td class="px-4 py-2 text-center">{data.homeTeamStanding.draw}</td>
                    <td class="px-4 py-2 text-center">{data.homeTeamStanding.lost}</td>
                    <td class="px-4 py-2 text-center">{data.homeTeamStanding.goalDifference}</td>
                    <td class="px-4 py-2 text-center font-bold">{data.homeTeamStanding.points}</td>
                  </tr>
                {/if}
                {#if data.awayTeamStanding}
                  <tr class="bg-red-50 hover:bg-red-100 transition-all duration-200">
                    <td class="px-4 py-2 flex items-center">
                      <img src={data.awayTeamStanding.team.crest} alt="" class="w-5 h-5 mr-2" />
                      <span>{data.awayTeamStanding.team.shortName || data.awayTeamStanding.team.name}</span>
                    </td>
                    <td class="px-4 py-2 text-center">{data.awayTeamStanding.position}</td>
                    <td class="px-4 py-2 text-center">{data.awayTeamStanding.playedGames}</td>
                    <td class="px-4 py-2 text-center">{data.awayTeamStanding.won}</td>
                    <td class="px-4 py-2 text-center">{data.awayTeamStanding.draw}</td>
                    <td class="px-4 py-2 text-center">{data.awayTeamStanding.lost}</td>
                    <td class="px-4 py-2 text-center">{data.awayTeamStanding.goalDifference}</td>
                    <td class="px-4 py-2 text-center font-bold">{data.awayTeamStanding.points}</td>
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- Match Predictions (Simplified) -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden animate-fadein-slow">
        <div class="bg-blue-700 p-3 text-white">
          <h2 class="text-lg font-bold">Match Predictions</h2>
        </div>
        <div class="p-4">
          {#if data.predictions && data.predictions.predictions}
            <div class="mb-4">
              <h3 class="font-bold mb-2">Win Probability</h3>
              <div class="flex mb-2 h-8 rounded-full overflow-hidden shadow-inner">
                <div class="bg-blue-500 text-white text-xs font-medium flex items-center justify-center transition-all duration-300" style="width: {winPercentages.home}%">
                  {winPercentages.home}%
                </div>
                <div class="bg-gray-500 text-white text-xs font-medium flex items-center justify-center transition-all duration-300" style="width: {winPercentages.draw}%">
                  {winPercentages.draw}%
                </div>
                <div class="bg-red-500 text-white text-xs font-medium flex items-center justify-center transition-all duration-300" style="width: {winPercentages.away}%">
                  {winPercentages.away}%
                </div>
              </div>
              <div class="flex text-xs justify-between px-2">
                <span>Home</span>
                <span>Draw</span>
                <span>Away</span>
              </div>
            </div>
            
            {#if data.predictions.predictions.advice}
              <div class="mt-4">
                <h3 class="font-bold mb-2">Expert Advice</h3>
                <p class="text-sm bg-blue-50 p-3 rounded shadow">{data.predictions.predictions.advice}</p>
              </div>
            {/if}
          {:else}
            <div class="text-center py-4 text-gray-500 animate-fadein">
              <p>No prediction data available for this match</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
    
    <!-- Head to Head (Without Summary) -->
    <div class="bg-white rounded-lg shadow-md overflow-hidden mb-8 animate-fadein-slow">
      <div class="bg-blue-700 p-3 text-white">
        <h2 class="text-lg font-bold">Head to Head</h2>
      </div>
      <div class="p-4">
        {#if data.headToHeadData?.matches && data.headToHeadData.matches.length > 0}
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead>
                <tr class="bg-blue-50">
                  <th class="px-4 py-2 text-left">Date</th>
                  <th class="px-4 py-2 text-left">Competition</th>
                  <th class="px-4 py-2 text-right">Home</th>
                  <th class="px-4 py-2 text-center">Score</th>
                  <th class="px-4 py-2 text-left">Away</th>
                </tr>
              </thead>
              <tbody>
                {#each data.headToHeadData.matches as match}
                  <tr class="border-b hover:bg-blue-50 transition-all duration-200">
                    <td class="px-4 py-2 text-sm">{new Date(match.utcDate).toLocaleDateString()}</td>
                    <td class="px-4 py-2">
                      <div class="flex items-center">
                        <img src={match.competition.emblem} alt="" class="w-5 h-5 mr-2" />
                        <span class="text-sm">{match.competition.name}</span>
                      </div>
                    </td>
                    <td class="px-4 py-2 text-right">{match.homeTeam.shortName || match.homeTeam.name}</td>
                    <td class="px-4 py-2 text-center font-bold">
                      {match.score.fullTime.home} - {match.score.fullTime.away}
                    </td>
                    <td class="px-4 py-2">{match.awayTeam.shortName || match.awayTeam.name}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="text-center py-4 text-gray-500 animate-fadein">
            <p>No previous meetings between these teams</p>
          </div>
        {/if}
      </div>
    </div>
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