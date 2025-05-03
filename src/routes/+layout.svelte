<script>
  import { navigating, page } from '$app/stores';
  import { afterNavigate, beforeNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import "./../app.css";
  
  let { children } = $props();
  let currentPath = $state('');
  let isNavigating = $state(false);
  
  // Track navigation state
  $effect(() => {
    if ($navigating) {
      console.log('Navigating to', $navigating.to.url.pathname);
      isNavigating = true;
    } else {
      isNavigating = false;
    }
  });
  
  // Track current path to force re-render
  $effect(() => {
    currentPath = $page.url.pathname;
    console.log('Current path updated:', currentPath);
  });
  
  // Set up navigation hooks
  onMount(() => {
    // Before navigation starts
    beforeNavigate(({ to, from, cancel }) => {
      console.log(`Navigation starting: ${from?.url.pathname} -> ${to?.url.pathname}`);
    });
    
    // After navigation completes
    afterNavigate(({ to, from }) => {
      console.log(`Navigation complete: ${from?.url.pathname} -> ${to.url.pathname}`);
      // Force any pending state updates
      setTimeout(() => {
        isNavigating = false;
      }, 0);
    });
  });
</script>

<!-- Banner/Header -->
<header class="bg-blue-600 py-5 shadow-md mb-8">
  <div class="max-w-7xl mx-auto flex items-center px-4">
    <img src="https://cdn-icons-png.flaticon.com/512/861/861512.png" alt="Soccer Ball" class="h-10 w-10 mr-4 drop-shadow-lg" />
    <a href="/" sveltekit:prefetch class="text-white text-3xl font-bold">SportBiz</a>
  </div>
</header>

{#if isNavigating}
  <div class="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-50">
    <div class="w-full h-full bg-blue-600 animate-pulse"></div>
  </div>
{/if}

<!-- Key helps force re-render on path change -->
<div key={currentPath}>
  {@render children()}
</div>

<!-- Footer -->
<footer class="bg-blue-600 text-white py-6 mt-12 shadow-inner">
  <div class="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
    <div class="flex items-center mb-2 md:mb-0">
      <img src="https://cdn-icons-png.flaticon.com/512/861/861512.png" alt="Soccer Ball" class="h-6 w-6 mr-2" />
      <span class="font-semibold text-lg">SportBiz</span>
    </div>
    <div class="text-sm">
      &copy; {new Date().getFullYear()} SportBiz. All rights reserved.
    </div>
    <div class="text-xs mt-2 md:mt-0 text-blue-100">
      Powered by your passion for sports.
    </div>
  </div>
</footer>