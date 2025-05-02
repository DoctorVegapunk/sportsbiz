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

{#if isNavigating}
  <div class="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-50">
    <div class="w-full h-full bg-blue-600 animate-pulse"></div>
  </div>
{/if}

<!-- Key helps force re-render on path change -->
<div key={currentPath}>
  {@render children()}
</div>