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
<header style="background-color:#000066;" class=" py-5 shadow-md mb-8">
  <div class="max-w-7xl mx-auto flex items-center px-4">
    <img src="/logo.png" alt="Soccer Ball" width="300" class="drop-shadow-lg" />
    <a href="/" sveltekit:prefetch class="text-white text-3xl font-bold"></a>
  </div>
</header>

{#if isNavigating}
  <div class="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-50">
    <div  style="background-color:#000066;"  class="w-full h-full animate-pulse"></div>
  </div>
{/if}

<!-- Key helps force re-render on path change -->
<div key={currentPath}>
  {@render children()}
</div>

<!-- Footer -->
<footer  style="background-color:#000066;"  class="text-white py-6 mt-12 shadow-inner">
  <div class="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
    <div class="flex items-center mb-2 md:mb-0">
     
    <img src="/logo.png" alt="Soccer Ball" width="150" class="drop-shadow-lg" />
    </div>
    <div class="text-sm">
      &copy; {new Date().getFullYear()} ScoreBiz. All rights reserved.
    </div>
    <div class="text-xs mt-2 md:mt-0 text-blue-100">
      Powered by your passion for sports.
    </div>
  </div>
</footer>