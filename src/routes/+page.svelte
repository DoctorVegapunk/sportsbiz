<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  const { data } = $props();
  
  let searchQuery = $state('');
  let expandedLeagues = $state(new Set());
  let pageKey = $state(Date.now()); // Force re-render on navigation
  
  // Monitor URL for debugging
  let currentUrl = $state('');
  
  onMount(() => {
    console.log('Home page mounted', $page.url.pathname);
    
    // Reset state on mount
    expandedLeagues = new Set();
    
    // Register for browser back button events
    window.addEventListener('popstate', () => {
      console.log('Browser back button used');
      pageKey = Date.now(); // Force re-render
    });
  });
  
  $effect(() => {
    currentUrl = $page.url.pathname + $page.url.search;
    console.log('Home page URL updated:', currentUrl);
  });
  
  // Filter leagues based on search query
  const filteredLeagues = $derived(
    (data.leagues || []).filter(([leagueName, matches]) => {
      const searchTerm = searchQuery.toLowerCase();
      const leagueMatches = leagueName?.toLowerCase().includes(searchTerm);
      const teamsMatch = matches?.some(match => 
        match.home_team?.toLowerCase().includes(searchTerm) ||
        match.away_team?.toLowerCase().includes(searchTerm)
      );
      
      return leagueMatches || teamsMatch;
    })
  );

  // Helper functions
  const toggleLeague = (leagueName) => {
    expandedLeagues = new Set(
      expandedLeagues.has(leagueName)
        ? [...expandedLeagues].filter(name => name !== leagueName)
        : [...expandedLeagues, leagueName]
    );
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    });
  };
  
  const toggleAllLeagues = async () => {
    try {
      // Force hard navigation by reloading the page with the new parameter
      // This is more reliable than client-side navigation for state changes
      window.location.href = `/?showAll=${!data.showAllLeagues}`;
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };
  
  const navigateToMatch = (sportKey, matchId) => {
    // Use a full page reload for more reliable navigation
    window.location.href = `/matches/${sportKey}/${matchId}`;
    return false; // Prevent default
  };
</script>

<div class="max-w-7xl mx-auto p-4" id="leagues-page" key={pageKey}>
  <!-- Current URL for debugging -->
  <div class="mb-2 bg-gray-50 p-2 text-xs text-gray-500 rounded">
    Current URL: {currentUrl}
  </div>

  <!-- API Usage Counter -->
  {#if data.remaining_requests !== undefined}
    <div class="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
      <span class="font-medium">API Requests Remaining: {data.remaining_requests}</span>
      <span class="text-sm text-gray-600">Daily limit: {data.daily_limit || 500}</span>
    </div>
  {/if}

  <!-- Search Bar -->
  <div class="mb-6">
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Search leagues or teams..."
      class="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>

  <!-- Error Message -->
  {#if data.error}
    <div class="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
      {data.error}
    </div>
  {/if}

  <!-- Toggle All Leagues Button -->
  <div class="mb-4">
    <button 
      on:click={toggleAllLeagues}
      class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
    >
      {data.showAllLeagues ? 'Show Major Leagues Only' : 'Show All Leagues'}
    </button>
    <span class="ml-3 text-gray-600">
      {data.showAllLeagues ? 'Showing all leagues' : 'Showing major leagues only'}
    </span>
  </div>

  <!-- Leagues List -->
  {#if filteredLeagues.length > 0}
    <div class="space-y-4">
      {#each filteredLeagues as [leagueName, matches]}
        <div class="border rounded-lg overflow-hidden">
          <!-- League Header -->
          <button
            on:click={() => toggleLeague(leagueName)}
            class="w-full p-4 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
          >
            <h2 class="text-xl font-semibold">
              {leagueName.replace(/_/g, ' ').toUpperCase()}
            </h2>
            <span class="text-gray-600">
              {expandedLeagues.has(leagueName) ? '▼' : '▶'}
            </span>
          </button>

          <!-- Matches List -->
          {#if expandedLeagues.has(leagueName)}
            <div class="divide-y">
              {#each matches as match (match.id)}
                <!-- Use standard <a> with data-sveltekit-reload for more reliable navigation -->
                <a 
                  href="/matches/{match.sportKey}/{match.id}" 
                  data-sveltekit-reload
                  class="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div class="flex items-center justify-between">
                    <!-- Home Team -->
                    <div class="flex-1 text-right">
                      <span class="font-medium">{match.home_team}</span>
                      <img 
                        src={match.home_team_logo || '/placeholder-team.png'} 
                        class="h-8 w-8 mx-2 inline-block"
                        alt={match.home_team}
                      />
                    </div>

                    <!-- Match Info -->
                    <div class="mx-4 text-center">
                      <div class="text-gray-500 text-sm">
                        {formatTime(match.commence_time)}
                      </div>
                      <div class="text-xl font-bold my-1">VS</div>
                      <div class="text-sm text-gray-500">
                        {match.sport_title.replace(/_/g, ' ')}
                      </div>
                    </div>

                    <!-- Away Team -->
                    <div class="flex-1 text-left">
                      <img 
                        src={match.away_team_logo || '/placeholder-team.png'} 
                        class="h-8 w-8 mx-2 inline-block"
                        alt={match.away_team}
                      />
                      <span class="font-medium">{match.away_team}</span>
                    </div>
                  </div>
                </a>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center py-8 text-gray-600">
      No matches found matching your search
    </div>
  {/if}
</div>

<style>
  /* Add hover transition */
  .block:hover {
    transition: background-color 0.2s ease-in-out;
  }
</style>