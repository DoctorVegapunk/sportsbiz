<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    
    // Get error details from the page store
    $: status = $page.status;
    $: message = $page.error?.message || 'Something went wrong';
    $: pathname = $page.url.pathname;
    
    let showExtraHelp = false;
    let searchQuery = '';
    
    // Determine what type of page the user was trying to access
    function getPageType(pathname) {
      if (pathname.includes('/match/') || pathname.includes('/matches/')) return 'match';
      if (pathname.includes('/team/') || pathname.includes('/teams/')) return 'team';
      if (pathname.includes('/league/') || pathname.includes('/leagues/')) return 'league';
      if (pathname.includes('/player/') || pathname.includes('/players/')) return 'player';
      if (pathname.includes('/news/')) return 'news';
      if (pathname.includes('/standings/')) return 'standings';
      if (pathname.includes('/fixtures/')) return 'fixtures';
      return 'general';
    }
    
    // Get contextual error details based on status and page type
    function getErrorDetails(status, pageType) {
      const baseDetails = {
        404: {
          general: {
            title: "Page Not Found",
            message: "The page you're looking for has been moved to the bench.",
            icon: "🤔",
            bgColor: "from-blue-600 via-purple-600 to-red-600",
            suggestion: "Let's get you back to the action!"
          },
          match: {
            title: "Match Not Found",
            message: "This match seems to have been postponed or moved to another stadium.",
            icon: "⚽",
            bgColor: "from-green-500 via-blue-500 to-red-600",
            suggestion: "Check our fixtures for upcoming matches!"
          },
          team: {
            title: "Team Not Found",
            message: "This team might have been relegated or transferred to another league.",
            icon: "👕",
            bgColor: "from-red-500 via-yellow-500 to-blue-600",
            suggestion: "Browse our team directory to find what you're looking for!"
          },
          league: {
            title: "League Not Found",
            message: "This league season might have ended or hasn't started yet.",
            icon: "🏆",
            bgColor: "from-purple-500 via-pink-500 to-red-600",
            suggestion: "Check out our active leagues and competitions!"
          },
          player: {
            title: "Player Not Found",
            message: "This player might have transferred or retired from the game.",
            icon: "👤",
            bgColor: "from-indigo-500 via-blue-500 to-teal-600",
            suggestion: "Search our player database for current stats!"
          },
          news: {
            title: "Article Not Found",
            message: "This news article might have been archived or moved.",
            icon: "📰",
            bgColor: "from-gray-600 via-blue-600 to-purple-600",
            suggestion: "Check out our latest football news and updates!"
          }
        },
        500: {
          title: "Server Timeout",
          message: "Our servers are having a bad day - like a goalkeeper letting in an easy goal!",
          icon: "🔴",
          bgColor: "from-red-600 via-orange-600 to-yellow-600",
          suggestion: "We're working on it! Try refreshing in a moment."
        },
        503: {
          title: "Service Unavailable",
          message: "We're doing some maintenance - like halftime team talks!",
          icon: "⚙️",
          bgColor: "from-gray-600 via-blue-600 to-purple-600",
          suggestion: "We'll be back shortly. Thanks for your patience!"
        },
        403: {
          title: "Access Denied",
          message: "You need special privileges to access this area.",
          icon: "🚫",
          bgColor: "from-yellow-600 via-orange-600 to-red-600",
          suggestion: "Contact support if you believe this is an error."
        },
        default: {
          title: "Unexpected Error",
          message: "Something unexpected happened during play.",
          icon: "⚠️",
          bgColor: "from-orange-500 via-red-500 to-pink-600",
          suggestion: "Let's get you back in the game!"
        }
      };
      
      if (status === 404) {
        return baseDetails[404][pageType] || baseDetails[404].general;
      }
      
      return baseDetails[status] || baseDetails.default;
    }
    
    $: pageType = getPageType(pathname);
    $: errorDetails = getErrorDetails(status, pageType);
    
    // Quick navigation options based on page type
    function getQuickActions(pageType) {
      const actions = {
        match: [
          { label: 'Live Matches', icon: '⚽', path: '/matches/live' },
          { label: 'Fixtures', icon: '📅', path: '/fixtures' },
          { label: 'Results', icon: '📊', path: '/results' }
        ],
        team: [
          { label: 'All Teams', icon: '👕', path: '/teams' },
          { label: 'League Tables', icon: '📊', path: '/standings' },
          { label: 'Transfers', icon: '🔄', path: '/transfers' }
        ],
        league: [
          { label: 'All Leagues', icon: '🏆', path: '/leagues' },
          { label: 'Standings', icon: '📊', path: '/standings' },
          { label: 'Top Scorers', icon: '⚽', path: '/stats/top-scorers' }
        ],
        player: [
          { label: 'Player Stats', icon: '👤', path: '/players/stats' },
          { label: 'Top Scorers', icon: '⚽', path: '/stats/top-scorers' },
          { label: 'Transfers', icon: '🔄', path: '/transfers' }
        ],
        news: [
          { label: 'Latest News', icon: '📰', path: '/news' },
          { label: 'Match Reports', icon: '📝', path: '/news/reports' },
          { label: 'Transfer News', icon: '🔄', path: '/news/transfers' }
        ],
        general: [
          { label: 'Live Matches', icon: '⚽', path: '/matches/live' },
          { label: 'League Tables', icon: '📊', path: '/standings' },
          { label: 'Latest News', icon: '📰', path: '/news' }
        ]
      };
      
      return actions[pageType] || actions.general;
    }
    
    $: quickActions = getQuickActions(pageType);
    
    function goHome() {
      goto('/');
    }
    
    function goBack() {
      history.back();
    }
    
    function handleSearch() {
      if (searchQuery.trim()) {
        goto(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
    
    function handleQuickAction(path) {
      goto(path);
    }
    
    onMount(() => {
      // Show extra help after 3 seconds for frustrated users
      const timer = setTimeout(() => {
        showExtraHelp = true;
      }, 3000);
      
      return () => clearTimeout(timer);
    });
  </script>
  
  <svelte:head>
    <title>Error {status} | Football Central</title>
    <meta name="description" content="Something went wrong, but we'll get you back to the football action!" />
  </svelte:head>
  
  <div class="min-h-screen bg-gradient-to-br {errorDetails.bgColor} flex items-center justify-center p-4 relative overflow-hidden pt-24">
    <!-- Dynamic Background Football Elements -->
    <div class="absolute inset-0 opacity-8">
      <div class="absolute top-16 left-16  text-9xl transform rotate-12 animate-spin-slow">⚽</div>
      <div class="absolute top-20 right-20  text-7xl transform -rotate-45 animate-float">🥅</div>
      <div class="absolute bottom-20 left-1/4  text-8xl transform rotate-45 animate-bounce-slow">🏆</div>
      <div class="absolute bottom-32 right-16  text-6xl transform -rotate-12 animate-pulse">📊</div>
      <div class="absolute top-1/2 left-10  text-5xl transform rotate-90 animate-float-delayed">🏟️</div>
      <div class="absolute top-1/3 right-1/4  text-4xl animate-bounce">⭐</div>
    </div>
    
    <!-- Animated Stadium Silhouette -->
    <div class="absolute bottom-0 left-0 right-0 opacity-10">
      <svg class="w-full h-32" viewBox="0 0 1200 200">
        <path d="M0,150 Q300,120 600,140 T1200,130 L1200,200 L0,200 Z" fill="white" opacity="0.3"/>
        <path d="M0,170 Q400,140 800,160 T1200,150 L1200,200 L0,200 Z" fill="white" opacity="0.2"/>
      </svg>
    </div>
  
    <div class="relative z-10 max-w-4xl mx-auto text-center">
      <!-- Error Icon and Status -->
      <div class="mb-8">
        <div class="text-9xl mb-6 animate-bounce">
          {errorDetails.icon}
        </div>
        <div class="bg-white bg-opacity-20 backdrop-blur-md rounded-full px-8 py-3 inline-block mb-6 shadow-xl">
          <span class=" font-bold text-xl">ERROR {status}</span>
        </div>
      </div>
  
      <!-- Main Error Content -->
      <div class="bg-white bg-opacity-15 backdrop-blur-lg rounded-3xl p-8 md:p-10 shadow-2xl border border-white border-opacity-20 mb-8">
        <h1 class="text-4xl md:text-6xl font-bold  mb-6 leading-tight">
          {errorDetails.title}
        </h1>
        
        <p class="text-xl md:text-2xl  text-opacity-90 mb-6 leading-relaxed">
          {errorDetails.message}
        </p>
        
        <p class="text-lg  text-opacity-80 mb-8">
          {errorDetails.suggestion}
        </p>
  
 
  
        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button 
            on:click={goHome}
            class="group bg-white text-gray-800 font-bold py-4 px-8 rounded-full hover:bg-opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-3 min-w-[200px] justify-center"
          >
            <span class="text-2xl group-hover:animate-pulse">🏠</span>
            Go to Homepage
          </button>
          
          <button 
            on:click={goBack}
            class="group bg-transparent border-2 border-white  font-bold py-4 px-8 rounded-full hover:bg-white hover:text-gray-800 transition-all duration-300 transform hover:scale-105 flex items-center gap-3 min-w-[200px] justify-center"
          >
            <span class="text-2xl group-hover:animate-pulse">↩️</span>
            Go Back
          </button>
        </div>
      </div>
  
    </div>
  
    <!-- Floating Animation Elements -->
    <div class="absolute top-20 right-1/4 animate-float">
      <div class="w-6 h-6 bg-white rounded-full opacity-30"></div>
    </div>
    <div class="absolute bottom-32 left-1/3 animate-float-delayed">
      <div class="w-4 h-4 bg-white rounded-full opacity-40"></div>
    </div>
    <div class="absolute top-1/3 right-10 animate-float-slow">
      <div class="w-8 h-8 bg-white rounded-full opacity-25"></div>
    </div>
  </div>
  
  <style>
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(180deg); }
    }
    
    @keyframes float-delayed {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-15px) rotate(-180deg); }
    }
    
    @keyframes float-slow {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes bounce-slow {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .animate-float {
      animation: float 3s ease-in-out infinite;
    }
    
    .animate-float-delayed {
      animation: float-delayed 4s ease-in-out infinite 1s;
    }
    
    .animate-float-slow {
      animation: float-slow 5s ease-in-out infinite 2s;
    }
    
    .animate-spin-slow {
      animation: spin-slow 20s linear infinite;
    }
    
    .animate-bounce-slow {
      animation: bounce-slow 3s ease-in-out infinite;
    }
    
    .animate-fade-in {
      animation: fade-in 0.5s ease-out;
    }
    
    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  </style>