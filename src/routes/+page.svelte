<script>
  import { onMount } from 'svelte';
  export let data;
  let leagues = data?.leagues || [];

  // Pick matches from the first few leagues as "trending" (or just recent/upcoming matches)
  let trendingMatches = [];
  for (const [leagueName, matches] of leagues.slice(0, 3)) {
    trendingMatches.push(...matches.slice(0, 3));
  }
  trendingMatches = trendingMatches.slice(0, 6);

  function limitWords(str, n = 8) {
    if (!str) return '';
    return str.split(' ').slice(0, n).join(' ') + (str.split(' ').length > n ? '…' : '');
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // Helper to trigger AdSense after each ad block is rendered
  function loadAds() {
    if (typeof window !== 'undefined' && window.adsbygoogle) {
      try {
        window.adsbygoogle.push({});
      } catch (e) {
        // ignore duplicate push errors
      }
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
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 bg-[#f8f9fa] p-4 rounded-b-md">
    {#each trendingMatches as match}
      <a href={`/matches/${match.sportKey}/${match.id}`}
        class="group block bg-white rounded-lg overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 border border-[#e3e6ee]"
        style="box-shadow: 0 2px 8px rgba(26,35,126,0.06);"
      >
        <!-- Card Image (from your static folder, e.g. /sample.jpg) -->
        <div class="relative">
          <img
            src="/sample.jpg"
            alt="Football pitch or stadium"
            class="w-full aspect-video object-cover transition-transform duration-200 group-hover:scale-[1.03] bg-[#e3e6ee]"
            style="aspect-ratio: 16/9;"
          />
        </div>
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <img src={match.home_team_logo} alt={match.home_team} class="w-6 h-6 object-contain rounded-full bg-[#f8f9fa] border border-[#e3e6ee]" on:error={(e) => e.target.style.display='none'} />
              <span class="font-semibold text-sm text-[#222]">{limitWords(match.home_team, 3)}</span>
            </div>
            <span class="text-[#888] font-bold">vs</span>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-sm text-[#222]">{limitWords(match.away_team, 3)}</span>
              <img src={match.away_team_logo} alt={match.away_team} class="w-6 h-6 object-contain rounded-full bg-[#f8f9fa] border border-[#e3e6ee]" on:error={(e) => e.target.style.display='none'} />
            </div>
          </div>
          <p class="text-[#555] text-xs md:text-sm truncate mb-2 font-sans">
            <span class="font-semibold text-[#1a237e]">Venue:</span>
            {match.venue ? ` ${match.venue}` : ' Not available'}
          </p>
          <div class="flex items-center text-[11px] md:text-xs text-[#777] space-x-2 font-sans">
            <span class="flex items-center"><span class="mr-1 text-[10px]">📅</span>{formatDate(match.commence_time)}</span>
            <span class="mx-1 text-[#bbb]">|</span>
            <img src={match.sport_emblem} alt="League Logo" class="w-6 h-6 object-contain bg-[#f8f9fa] border border-[#e3e6ee] rounded-full" on:error={(e) => e.target.style.display='none'} />
          </div>
        </div>
      </a>
    {/each}
  </div>



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