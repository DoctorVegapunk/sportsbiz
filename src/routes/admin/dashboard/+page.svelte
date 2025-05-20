<script>
  import { db } from '$lib/firebase';
  import { ref, get, update, query, orderByChild, startAt, endAt } from 'firebase/database';
  import { onMount, onDestroy } from 'svelte';

  let searchQuery = '';
  let matches = [];
  let isLoading = false;
  let selectedMatch = null;
  let isEditing = false;
  let analysisContent = '';

  // Search for matches
  const searchMatches = async () => {
    if (!searchQuery.trim()) {
      matches = [];
      return;
    }
    
    isLoading = true;
    try {
      const matchesRef = ref(db, 'matches');
      const snapshot = await get(matchesRef);
      
      if (snapshot.exists()) {
        const allMatches = snapshot.val();
        matches = Object.entries(allMatches)
          .filter(([id, matchData]) => {
            try {
              const match = matchData.match || {};
              const homeTeam = match.homeTeam?.name || '';
              const awayTeam = match.awayTeam?.name || '';
              
              const search = searchQuery.toLowerCase().trim();
              return homeTeam.toLowerCase().includes(search) || 
                     awayTeam.toLowerCase().includes(search) ||
                     id.includes(search);
            } catch (e) {
              console.error('Error processing match:', id, e);
              return false;
            }
          })
          .map(([id, matchData]) => {
            const match = matchData.match || {};
            return {
              id,
              ...matchData,
              homeTeam: match.homeTeam?.name || 'N/A',
              awayTeam: match.awayTeam?.name || 'N/A',
              date: match.utcDate ? new Date(match.utcDate).toLocaleDateString() : 'N/A',
              competition: match.competition?.name || 'N/A'
            };
          });
      } else {
        matches = [];
      }
    } catch (error) {
      console.error('Error searching matches:', error);
      matches = [];
    } finally {
      isLoading = false;
    }
  };

  // Handle debounced search
  let searchTimer;
  
  $: if (searchQuery.length > 2) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(searchMatches, 500);
  }
  
  // Cleanup timer on component destroy
  onDestroy(() => {
    clearTimeout(searchTimer);
  });

  // Open edit modal
  const openEditModal = (match) => {
    selectedMatch = match;
    analysisContent = match.analysis || '';
    isEditing = true;
    // Scroll to top of modal if needed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save analysis
  const saveAnalysis = async () => {
    if (!selectedMatch) return;
    
    try {
      const matchRef = ref(db, `matches/${selectedMatch.id}`);
      await update(matchRef, { analysis: analysisContent });
      isEditing = false;
      selectedMatch = null;
      // Refresh the matches list
      searchMatches();
    } catch (error) {
      console.error('Error saving analysis:', error);
    }
  };
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-6">Match Analysis Dashboard</h1>
  
  <!-- Search Bar -->
  <div class="mb-6">
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search by team name..."
        class="flex-1 p-2 border rounded"
        on:keydown={(e) => e.key === 'Enter' && searchMatches()}
      />
      <button
        on:click={searchMatches}
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        disabled={isLoading}
      >
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </div>
  </div>

  <!-- Matches Table -->
  {#if matches.length > 0}
    <div class="overflow-x-auto">
      <table class="min-w-full bg-white border">
        <thead>
          <tr class="bg-gray-100">
            <th class="py-2 px-4 border">Date</th>
            <th class="py-2 px-4 border">Competition</th>
            <th class="py-2 px-4 border">Home Team</th>
            <th class="py-2 px-4 border">Away Team</th>
            <th class="py-2 px-4 border">Match ID</th>
            <th class="py-2 px-4 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each matches as match (match.id)}
            <tr 
              class="hover:bg-gray-50 cursor-pointer transition-colors {selectedMatch?.id === match.id ? 'bg-blue-50' : ''}"
              on:click={() => openEditModal(match)}
            >
              <td class="py-3 px-4 border">
                <div class="flex items-center gap-2">
                  {#if match.analysis}
                    <span class="w-2 h-2 rounded-full bg-green-500" title="Has analysis"></span>
                  {:else}
                    <span class="w-2 h-2 rounded-full bg-gray-300" title="No analysis"></span>
                  {/if}
                  <span>{match.date}</span>
                </div>
              </td>
              <td class="py-3 px-4 border">{match.competition}</td>
              <td class="py-3 px-4 border font-medium">{match.homeTeam}</td>
              <td class="py-3 px-4 border font-medium">{match.awayTeam}</td>
              <td class="py-3 px-4 border text-xs text-gray-500">{match.id}</td>
              <td class="py-3 px-4 border">
                <button
                  on:click|stopPropagation={$e => {
                    $e.stopPropagation();
                    openEditModal(match);
                  }}
                  class="text-blue-500 hover:text-blue-700 hover:underline"
                >
                  {match.analysis ? 'Edit' : 'Add'} Analysis
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if searchQuery && !isLoading}
    <p class="text-gray-500">No matches found. Try a different search term.</p>
  {/if}
  
  {#if isLoading}
    <div class="mt-4 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      <p class="mt-2 text-gray-600">Searching matches...</p>
    </div>
  {/if}

  <!-- Edit Modal -->
  {#if isEditing}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 class="text-xl font-bold mb-4">
          Edit Analysis: {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
        </h2>
        
        <textarea
          bind:value={analysisContent}
          class="w-full h-64 p-2 border rounded mb-4"
          placeholder="Enter your match analysis here..."
        ></textarea>
        
        <div class="flex justify-end gap-2">
          <button
            on:click={() => isEditing = false}
            class="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            on:click={saveAnalysis}
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save Analysis
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Add any custom styles here */
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th, td {
    text-align: left;
    padding: 8px;
  }
  tr {
    transition: background-color 0.2s ease;
  }
  
  tr:hover {
    background-color: #f8fafc;
  }
  
  tr:active {
    background-color: #f1f5f9;
  }
</style>