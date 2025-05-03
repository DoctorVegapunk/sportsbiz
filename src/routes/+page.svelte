<script>
  import { onMount } from 'svelte';

  const { data } = $props();

  let searchQuery = $state('');
  let expandedLeagues = $state(new Set());
  let pageKey = $state(Date.now());

  onMount(() => {
    expandedLeagues = new Set();
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
</script>



<div class="max-w-7xl mx-auto p-4 min-h-[70vh]" id="leagues-page" key={pageKey}>
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

  <!-- Leagues List -->
  {#if filteredLeagues.length > 0}
    <div class="space-y-4">
      {#each filteredLeagues as [leagueName, matches]}
        <div class="border rounded-lg overflow-hidden shadow-sm bg-white">
          <!-- League Header with Emblem -->
          <button
            on:click={() => toggleLeague(leagueName)}
            class="w-full p-4 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
          >
            <div class="flex items-center">
              {#if matches[0]?.sport_emblem}
                <img 
                  src={matches[0].sport_emblem} 
                  alt={leagueName}
                  class="h-8 w-8 mr-3"
                />
              {/if}
              <h2 class="text-xl font-semibold">
                {leagueName}
              </h2>
            </div>
            <span class="text-gray-600">
              {expandedLeagues.has(leagueName) ? '▼' : '▶'}
            </span>
          </button>

          <!-- Matches List -->
          {#if expandedLeagues.has(leagueName)}
            <div class="divide-y">
              {#each matches as match (match.id)}
                <a 
                  href="/matches/{match.sportKey}/{match.id}" 
                  data-sveltekit-reload
                  class="block p-4 match-hover transition-all duration-200"
                >
                  <div class="flex items-center justify-between match-content transition-all duration-200">
                    <!-- Home Team -->
                    <div class="flex-1 text-right team-info transition-all duration-200">
                      <span class="font-medium team-name">{match.home_team}</span>
                      {#if match.home_team_logo}
                        <img 
                          src={match.home_team_logo} 
                          class="h-8 w-8 mx-2 inline-block team-logo"
                          alt={match.home_team}
                        />
                      {/if}
                    </div>

                    <!-- Match Info -->
                    <div class="mx-4 text-center">
                      <div class="text-gray-500 text-sm">
                        {formatTime(match.commence_time)}
                      </div>
                      <div class="text-xl font-bold my-1">VS</div>
                      <div class="text-sm text-gray-500">
                        {match.sport_title}
                      </div>
                    </div>

                    <!-- Away Team -->
                    <div class="flex-1 text-left team-info transition-all duration-200">
                      {#if match.away_team_logo}
                        <img 
                          src={match.away_team_logo} 
                          class="h-8 w-8 mx-2 inline-block team-logo"
                          alt={match.away_team}
                        />
                      {/if}
                      <span class="font-medium team-name">{match.away_team}</span>
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
  /* Banner shadow and logo drop-shadow handled inline */

  /* Match hover effect */
  .match-hover {
    background-color: #fff;
    cursor: pointer;
  }
  .match-hover:hover {
    background-color: #e6f0ff;
    box-shadow: 0 4px 16px 0 rgba(30, 64, 175, 0.08);
  }
  .match-hover:hover .match-content {
    transform: scale(1.035);
  }
  .match-hover:hover .team-logo,
  .match-hover:hover .team-name {
    transform: scale(1.12);
    color: #2563eb;
    filter: drop-shadow(0 2px 6px #2563eb22);
  }
  .team-logo,
  .team-name {
    transition: transform 0.18s cubic-bezier(.4,0,.2,1), color 0.18s;
  }

  /* Footer quirks */
  footer {
    border-top: 2px solid #2563eb22;
    letter-spacing: 0.01em;
  }
</style>