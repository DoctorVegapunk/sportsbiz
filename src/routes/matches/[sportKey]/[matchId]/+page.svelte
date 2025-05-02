<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  
  const { data } = $props();
  
  // Corrected derived state declaration
  let match = $derived(data.match || {
    home_team: "Data Unavailable",
    away_team: "Data Unavailable",
    commence_time: new Date().toISOString(),
    sport_title: "Loading error",
    bookmakers: []
  });
  
  // Format odds display helper
  const formatOdd = (price) => {
    if (typeof price !== 'number') return '-';
    return price.toFixed(2);
  };
  
  // Navigation handling - use replacement state to avoid history issues
  function goToHome() {
    goto('/', { 
      replaceState: false,
      noScroll: false,
      keepFocus: false,
      invalidateAll: true
    });
  }
  
  // Add URL monitoring to debug navigation
  let currentUrl = $state('');
  
  $effect(() => {
    currentUrl = $page.url.pathname;
    console.log('Match page URL updated:', currentUrl);
  });
</script>

<div class="max-w-7xl mx-auto p-4 space-y-6">
  <!-- Back button - using <a> for native navigation -->
  <div class="flex items-center justify-between mb-4">
    <a 
      href="/"
      class="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center"
      data-sveltekit-reload
    >
      <span class="mr-1">←</span> Back to Leagues (Link)
    </a>
    
    <button 
      on:click={goToHome}
      class="bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded inline-flex items-center"
    >
      <span class="mr-1">←</span> Back to Leagues (Button)
    </button>
  </div>

  <!-- Match Header -->
  <div class="bg-white p-6 rounded-lg shadow-md">
    <div class="flex items-center justify-between">
      <div class="text-center flex-1">
        <h2 class="text-2xl font-bold">{match.home_team}</h2>
        <p class="text-gray-600">Home</p>
      </div>
      
      <div class="text-center mx-4">
        <div class="text-gray-600">
          {new Date(match.commence_time).toLocaleDateString('en-KE', {
            weekday: 'short', 
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
        <div class="text-4xl my-2">VS</div>
        <div class="text-sm bg-blue-100 px-2 py-1 rounded">
          {match.sport_title?.replace(/_/g, ' ')}
        </div>
      </div>

      <div class="text-center flex-1">
        <h2 class="text-2xl font-bold">{match.away_team}</h2>
        <p class="text-gray-600">Away</p>
      </div>
    </div>
  </div>

  <!-- Current URL for debugging -->
  <div class="bg-gray-50 p-2 text-xs text-gray-500 rounded">
    Current URL: {currentUrl}
  </div>

  <!-- Kenyan Bookmakers Odds -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#if match.bookmakers && match.bookmakers.length > 0}
      {#each match.bookmakers as bookmaker}
        <div class="bg-white p-4 rounded-lg shadow-md">
          <h3 class="text-xl font-bold mb-3">{bookmaker.title}</h3>
          
          <!-- Match Winner -->
          {#if bookmaker.markets?.find(m => m.key === 'h2h')}
            <div class="mb-4">
              <h4 class="font-semibold mb-2">Match Winner</h4>
              <div class="grid grid-cols-3 gap-2">
                {#each bookmaker.markets.find(m => m.key === 'h2h').outcomes as outcome}
                  <div class="bg-gray-50 p-2 rounded text-center">
                    <span class="block text-sm">{outcome.name}</span>
                    <span class="font-bold text-green-600">{formatOdd(outcome.price)}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Handicap -->
          {#if bookmaker.markets?.find(m => m.key === 'spreads')}
            <div class="mb-4">
              <h4 class="font-semibold mb-2">Handicap</h4>
              <div class="grid grid-cols-2 gap-2">
                {#each bookmaker.markets.find(m => m.key === 'spreads').outcomes as outcome}
                  <div class="bg-gray-50 p-2 rounded text-center">
                    <span class="block text-sm">{outcome.name}</span>
                    <span class="font-bold text-blue-600">{formatOdd(outcome.price)}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Over/Under -->
          {#if bookmaker.markets?.find(m => m.key === 'totals')}
            <div class="mb-4">
              <h4 class="font-semibold mb-2">Over/Under</h4>
              <div class="grid grid-cols-2 gap-2">
                {#each bookmaker.markets.find(m => m.key === 'totals').outcomes as outcome}
                  <div class="bg-gray-50 p-2 rounded text-center">
                    <span class="block text-sm">{outcome.name}</span>
                    <span class="font-bold text-purple-600">{formatOdd(outcome.price)}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    {:else}
      <div class="col-span-2 bg-gray-50 p-4 rounded text-center">
        <div class="animate-pulse">
          Loading odds data... If this persists, odds may not be available for this match.
        </div>
      </div>
    {/if}
  </div>

  <!-- Additional Match Data -->
  <div class="bg-white p-6 rounded-lg shadow-md">
    <h3 class="text-xl font-bold mb-4">Match Details</h3>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Venue Info -->
      <div>
        <h4 class="font-semibold mb-2">Venue</h4>
        <p>{match.venue || 'N/A'}</p>
        <p class="text-sm text-gray-600">{match.location || 'Location not available'}</p>
      </div>

      <!-- Team Form -->
      <div>
        <h4 class="font-semibold mb-2">Recent Form</h4>
        <div class="flex justify-between">
          <div>
            <p class="text-sm">Home: {match.stats?.home_form?.join(' ') || 'N/A'}</p>
          </div>
          <div>
            <p class="text-sm">Away: {match.stats?.away_form?.join(' ') || 'N/A'}</p>
          </div>
        </div>
      </div>

      <!-- Head-to-Head -->
      {#if match.stats?.h2h?.length > 0}
        <div class="md:col-span-2">
          <h4 class="font-semibold mb-2">Last Meetings</h4>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left">Date</th>
                  <th class="px-4 py-2">Home</th>
                  <th class="px-4 py-2">Score</th>
                  <th class="px-4 py-2">Away</th>
                </tr>
              </thead>
              <tbody>
                {#each match.stats.h2h.slice(0, 5) as h2hMatch}
                  <tr class="border-t">
                    <td class="px-4 py-2">{new Date(h2hMatch.commence_time).toLocaleDateString('en-KE')}</td>
                    <td class="px-4 py-2 text-center">{h2hMatch.home_team}</td>
                    <td class="px-4 py-2 text-center font-bold">
                      {h2hMatch.scores?.find(s => s.name === 'Home')?.score || '-'} - 
                      {h2hMatch.scores?.find(s => s.name === 'Away')?.score || '-'}
                    </td>
                    <td class="px-4 py-2 text-center">{h2hMatch.away_team}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>