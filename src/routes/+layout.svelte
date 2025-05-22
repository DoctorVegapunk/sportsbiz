<script>
  import { navigating, page } from '$app/stores';
  import { afterNavigate, beforeNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { isAuthenticated } from '$lib/auth';
  import "./../app.css";
  
  let isAuth = $state(false);
  
  if (browser) {
    isAuthenticated.subscribe(value => {
      isAuth = value;
    });
  }
  
  let { children } = $props();
  let currentPath = $state('');
  let isNavigating = $state(false);

  $effect(() => {
    if ($navigating) {
      isNavigating = true;
    } else {
      isNavigating = false;
    }
  });

  $effect(() => {
    currentPath = $page.url.pathname;
  });

  onMount(() => {
    beforeNavigate(() => {});
    afterNavigate(() => {
      setTimeout(() => {
        isNavigating = false;
      }, 0);
    });
  });
</script>

<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header
    style="background-color:#000066;"
    class="py-5 shadow-md sticky top-0 z-40 border-b border-white/30"
  >
    <div class="max-w-7xl mx-auto flex items-center px-4 justify-between">
      <div class="flex items-center">
        <img src="/logo.png" alt="Soccer Ball" width="300" class="drop-shadow-lg" />
        <a href="/" data-sveltekit-prefetch class="text-white text-3xl font-bold ml-4" aria-label="Home">
          <span class="sr-only">Home</span>
        </a>
      </div>
      <nav class="flex items-center space-x-6">
        <a href="/" class="text-white hover:underline font-semibold">Home</a>
        <a href="/leagues" class="text-white hover:underline font-semibold">Leagues</a>
        {#if isAuth}
          <a 
            href="/admin/dashboard" 
            class="bg-white text-blue-900 hover:bg-blue-100 px-4 py-2 rounded-md font-semibold transition-colors"
          >
            Dashboard
          </a>
        {/if}
      </nav>
    </div>
  </header>

  {#if isNavigating}
    <div class="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-50">
      <div style="background-color:#000066;" class="w-full h-full animate-pulse"></div>
    </div>
  {/if}

  <!-- Main content -->
  <main class="flex-1">
    <div key={currentPath}>
      {@render children()}
    </div>
  </main>

  <!-- Footer -->
  <footer style="background-color:#000066;" class="text-white py-6 shadow-inner">
    <div class="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
      <div class="flex items-center mb-2 md:mb-0">
        <img src="/logo.png" alt="Soccer Ball" width="150" class="drop-shadow-lg" />
      </div>
      <div class="text-sm flex flex-col md:flex-row md:items-center md:space-x-4">
        <span>&copy; {new Date().getFullYear()} ScoreBiz. All rights reserved.</span>
        <nav class="flex flex-col md:flex-row md:space-x-4 mt-2 md:mt-0">
          <a href="/cookies-policy" class="text-blue-200 hover:underline">Cookies Policy</a>
          <a href="/terms-and-conditions" class="text-blue-200 hover:underline">Terms &amp; Conditions</a>
          <a href="/privacy-policy" class="text-blue-200 hover:underline">Privacy Policy</a>
        </nav>
      </div>
      <div class="text-xs mt-2 md:mt-0 text-blue-100">
        Powered by your passion for sports.
      </div>
    </div>
  </footer>
</div>

