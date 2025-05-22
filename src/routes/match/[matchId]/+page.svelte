<script>
  import { onMount, onDestroy } from 'svelte';
  import { getDatabase, ref, runTransaction } from "firebase/database";
  import { initializeApp, getApps } from "firebase/app";
  import { browser } from '$app/environment';
  
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
    <div class=" rounded-lg shadow-md overflow-hidden mb-8 animate-fadein-slow">
      <button 
        style="background-color:#000066;"
        class="w-full text-left p-3 text-white flex justify-between items-center"
        on:click|preventDefault={() => showAnalysis = !showAnalysis}
      >
        <h2 class="text-lg font-bold">Match Analysis</h2>
        <svg 
          class={`w-5 h-5 transition-transform duration-200 ${showAnalysis ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      {#if showAnalysis}
        <div class="p-4">
          {#if data.analysis}
            <p class="text-gray-700 whitespace-pre-line">{data.analysis}</p>
          {:else}
            <p class="text-gray-500 text-center italic">No analysis available for this match yet.</p>
          {/if}
        </div>
      {/if}
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