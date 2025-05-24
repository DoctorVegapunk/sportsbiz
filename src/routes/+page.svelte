<script>
  import { onMount } from 'svelte';
  export let data;
  let leagues = data?.leagues || [];
  let trendingMatches = data?.trendingMatches || [];

  function limitWords(str, n = 8) {
    if (!str) return '';
    return str.split(' ').slice(0, n).join(' ') + (str.split(' ').length > n ? '…' : '');
  }

 
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Time not available';
    
    try {
      // Check if timestamp is in seconds (needs * 1000) or milliseconds
      const date = new Date(timestamp.toString().length === 10 ? timestamp * 1000 : timestamp);
      if (isNaN(date.getTime())) return 'Invalid time';
      
      // Get date components
      const weekday = date.toLocaleString(undefined, { weekday: 'short' });
      const month = date.toLocaleString(undefined, { month: 'short' });
      const day = date.getDate();
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12; // Convert to 12-hour format
      
      return `<span class="font-semibold">${weekday}</span> ${month} ${day} <span class="font-semibold">${displayHours}:${minutes}</span> ${period}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Time format error';
    }
  };

  function loadAds() {
    if (typeof window !== 'undefined' && window.adsbygoogle) {
      try {
        window.adsbygoogle.push({});
      } catch (e) {}
    }
  }

  onMount(() => {
    loadAds();
  });
</script>




<svelte:head>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7287368945352748"
    crossorigin="anonymous"></script>
</svelte:head>



<!-- Top AdSense Ad (above hero) -->
<div class="flex justify-center ">
  <ins class="adsbygoogle"
    style="display:block"
    data-ad-client="ca-pub-7287368945352748"
    data-ad-slot="4957749953"
    data-ad-format="auto"
    data-full-width-responsive="true"></ins>
</div>
{@html `<script>(${loadAds.toString()})();</script>`}

<!-- Hero Section -->
<section class="relative min-h-[350px] flex flex-col items-center justify-center text-white py-14 bg-[#000066]">
  <img src="/logo.png" alt="ScoreBiz Logo" class="mb-4 drop-shadow-lg" />
  <p class="text-base md:text-lg font-medium text-blue-200 text-center max-w-xl mb-5 font-sans">
    The Ultimate Football Scores, Standings &amp; Predictions Platform
  </p>
  <div class="flex flex-col md:flex-row gap-4 mt-2">
    <a href="/leagues" class="bg-[#1a237e] text-white font-semibold px-7 py-2 rounded-lg shadow-sm hover:bg-[#283593] transition border border-[#1a237e]">
      Browse Leagues
    </a>
  </div>
</section>

<!-- Custom Ad 2 (between hero and matches) -->
<div class="flex justify-center mt-8">
  <a href="https://moy.auraodin.com/redirect.aspx?pid=135551&bid=1715">
    <img alt="" src="https://fd-core-fd-prod-02-westeurope-erf4ejfugxdfczfh.z01.azurefd.net/22betpartners/202504041311_320_251.gif" border="0" />
  </a>
</div>

<!-- AdSense Ad block between hero and matches -->
<div class="flex justify-center mb-8">
  <ins class="adsbygoogle"
    style="display:block"
    data-ad-client="ca-pub-7287368945352748"
    data-ad-slot="4957749953"
    data-ad-format="auto"
    data-full-width-responsive="true"></ins>
</div>
{@html `<script>(${loadAds.toString()})();</script>`}

<!-- Featured/Trending Matches Section -->
<section class="max-w-7xl mx-auto px-4 py-12">
  <div class="w-full mb-7">
    <div class="bg-[#1a237e] px-5 py-3 rounded-t-md text-white text-lg md:text-xl font-semibold tracking-wide shadow-sm font-sans">
      Upcoming & Highlighted Matches
    </div>
  </div>
<!-- Trending Matches Section -->
<section class="max-w-7xl mx-auto px-4 py-12">
  <div class="w-full mb-7">
    <div class="border-[#1a237e] px-5 py-3 rounded-t-md text-lg border-2 md:text-xl font-semibold tracking-wide shadow-sm font-sans">
      {#if trendingMatches.length > 0}
        Trending Matches
      {:else}
        No trending matches yet.
      {/if}
    </div>
  </div>
  {#if trendingMatches.length > 0}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 bg-[#f8f9fa] p-4 rounded-b-md">
      {#each trendingMatches as match}
        <a href={`/match/${match.id}`}
          class="border-gray-400 group block bg-white rounded-lg overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 border border-[#e3e6ee]"
          style="box-shadow: 0 2px 8px rgba(26,35,126,0.06);"
        >
          <div class="flex items-center gap-3 p-4">
            <img src={match.league.logo} alt={match.league.name} class="w-8 h-8 object-contain" />
            <div class="font-semibold text-[#1a237e]">{match.league.name}</div>
          </div>
          <div class="px-4 pb-4">
            <div class="flex items-center gap-2 mb-2">
              <img src={match.home_team_logo} alt={match.home_team} class="w-6 h-6 object-contain" />
              <span>{limitWords(match.home_team, 4)}</span>
              <span class="mx-1 text-gray-400">vs</span>
              <img src={match.away_team_logo} alt={match.away_team} class="w-6 h-6 object-contain" />
              <span>{limitWords(match.away_team, 4)}</span>
            </div>
            <div class="text-xs text-gray-500">
  {@html formatTime(match.timestamp || match.time)}
</div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>



  <!-- AdSense Ad block below matches -->
  <div class="flex justify-center my-8">
    <ins class="adsbygoogle"
      style="display:block"
      data-ad-client="ca-pub-7287368945352748"
      data-ad-slot="4957749953"
      data-ad-format="auto"
      data-full-width-responsive="true"></ins>
  </div>
  {@html `<script>(${loadAds.toString()})();</script>`}

  <div class="flex justify-center mt-8">
    <a href="/leagues" class="bg-[#1a237e] text-white px-8 py-2 rounded-md font-semibold shadow-sm hover:bg-[#283593] transition border border-[#1a237e]">
      View All Matches
    </a>
  </div>
</section>

<style>
  @media (max-width: 1024px) {
    .lg\:grid-cols-3 { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 640px) {
    .sm\:grid-cols-2 { grid-template-columns: 1fr !important; }
    .text-base { font-size: 1rem !important; }
    .text-lg { font-size: 1.1rem !important; }
  }
  section, h1, h2, h3, p, a, span {
    font-family: 'Roboto', 'Segoe UI', Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>