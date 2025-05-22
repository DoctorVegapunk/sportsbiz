<!-- <script>
  import { db } from '$lib/firebase';
  import { ref, get, update } from 'firebase/database';
  import { onMount, onDestroy } from 'svelte';
  import Editor from '@tadashi/svelte-editor-quill';

  let searchQuery = '';
  let matches = [];
  let isLoading = false;
  let selectedMatch = null;
  let analysisContent = '';
  let quillEditor;
  let editorOptions = {
    theme: 'snow',
    placeholder: 'Write your match analysis here...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'header': [1, 2, 3, false] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['blockquote'],
        [{ 'color': [] }],
        ['undo', 'redo']
      ]
    }
  };

  // Search functionality
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
              competition: match.competition?.name || 'N/A',
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

  let searchTimer;

  $: if (searchQuery.length > 2) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(searchMatches, 500);
  }

  onDestroy(() => {
    clearTimeout(searchTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
    }
  });

  onMount(() => {
    initAuth();
    const unsubscribe = isAuthenticated.subscribe(authenticated => {
      if (!authenticated && typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      handleResize();
    }

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  });

  // Handle window resize for responsive editor height
  function handleResize() {
    if (typeof window !== 'undefined') {
      const editorContainer = document.querySelector('.editor-container');
      if (editorContainer) {
        editorContainer.style.height = `${window.innerHeight - 300}px`;
      }
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch('/admin/logout');
      if (response.redirected) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  const selectMatch = (match) => {
    selectedMatch = match;
    analysisContent = match.analysis || '';
    setTimeout(() => {
      const editorContainer = document.querySelector('.editor-container');
      if (editorContainer) {
        editorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const saveAnalysis = async () => {
    if (!selectedMatch || !quillEditor) return;

    try {
      // Get content from Quill editor
      analysisContent = quillEditor.getHTML();

      const matchRef = ref(db, `matches/${selectedMatch.id}`);
      await update(matchRef, { analysis: analysisContent });
      selectedMatch.analysis = analysisContent;
      searchMatches();
    } catch (error) {
      console.error('Error saving analysis:', error);
    }
  };

  function handleEditorReady(event) {
    quillEditor = event.detail;
  }
</script>

<div class="container mx-auto p-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Match Analysis Dashboard</h1>
    <button on:click={handleLogout} class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
      Logout
    </button>
  </div>

  <div class="mb-6">
    <div class="flex gap-2">
      <input type="text" bind:value={searchQuery} placeholder="Search by team name..." class="flex-1 p-2 border rounded"
        on:keydown={(e) => e.key === 'Enter' && searchMatches()} />
      <button on:click={searchMatches} class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" disabled={isLoading}>
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </div>
  </div>

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
        <tr class="hover:bg-gray-50 cursor-pointer transition-colors {selectedMatch?.id === match.id ? 'bg-blue-50' : ''}"
          on:click={() => selectMatch(match)}>
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
            <button on:click|stopPropagation={$e => {
                $e.stopPropagation();
                selectMatch(match);
              }} class="text-blue-500 hover:text-blue-700 hover:underline">
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

  {#if selectedMatch}
  <div class="editor-container">
    <div class="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
      <h2 class="text-xl font-bold mb-4">
        {selectedMatch.homeTeam} vs {selectedMatch.awayTeam} - Match Analysis
      </h2>

      <div class="flex-1 flex flex-col min-h-[500px]">
        <Editor 
          on:ready={handleEditorReady}
          options={editorOptions}
          value={analysisContent} 
          className="flex-1 overflow-y-auto" 
        />
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <button on:click={() => selectedMatch = null} class="px-4 py-2 border rounded hover:bg-gray-100">
          Close
        </button>
        <button on:click={saveAnalysis} class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Save Analysis
        </button>
      </div>
    </div>
  </div>
  {/if}
</div>

<style>
  table {
    border-collapse: collapse;
    width: 100%;
  }

  th,
  td {
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

  .editor-container {
    height: calc(100vh - 300px);
  }

  /* Quill editor styles */
  :global(.ql-editor) {
    min-height: 400px;
  }

  :global(.quill-editor) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  :global(.ql-container) {
    flex: 1;
    overflow-y: auto;
  }

  :global(.ql-toolbar) {
    border-top-left-radius: 0.25rem;
    border-top-right-radius: 0.25rem;
  }

  :global(.ql-container) {
    border-bottom-left-radius: 0.25rem;
    border-bottom-right-radius: 0.25rem;
  }
</style> -->