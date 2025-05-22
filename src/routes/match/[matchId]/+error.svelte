<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    
    // Get error details from the page store
    $: status = $page.status;
    $: message = $page.error?.message || 'Something went wrong';
    
    // Determine the appropriate message and icon based on status
    function getErrorDetails(status) {
      switch (status) {
        case 404:
          return {
            title: "Match Not Found",
            message: "The match you're looking for seems to have been postponed or doesn't exist.",
            icon: "⚽",
            bgColor: "from-red-500 to-red-700",
            suggestion: "Check the fixture list or try searching for another match."
          };
        case 500:
          return {
            title: "Server Error",
            message: "Our servers are having a timeout. Like a player getting a red card!",
            icon: "🔴",
            bgColor: "from-red-600 to-red-800",
            suggestion: "Please try again in a few moments."
          };
        case 403:
          return {
            title: "Access Denied",
            message: "You don't have permission to view this content.",
            icon: "🚫",
            bgColor: "from-yellow-500 to-red-600",
            suggestion: "Please check your credentials or contact support."
          };
        default:
          return {
            title: "Game Interrupted",
            message: "Something unexpected happened during the match.",
            icon: "⚠️",
            bgColor: "from-orange-500 to-red-600",
            suggestion: "Let's get back to the game!"
          };
      }
    }
    
    $: errorDetails = getErrorDetails(status);
    
    function goHome() {
      goto('/');
    }
    
    function goBack() {
      history.back();
    }
  </script>
  
  <svelte:head>
    <title>Error {status} | Football Central</title>
  </svelte:head>
  
  <div class="min-h-screen bg-gradient-to-br {errorDetails.bgColor} flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Background Football Pattern -->
    <div class="absolute inset-0 opacity-10">
      <div class="absolute top-10 left-10 text-8xl transform rotate-12">⚽</div>
      <div class="absolute top-32 right-20 text-6xl transform -rotate-45">🥅</div>
      <div class="absolute bottom-20 left-1/4 text-7xl transform rotate-45">⚽</div>
      <div class="absolute bottom-40 right-10 text-5xl transform -rotate-12">🏆</div>
      <div class="absolute top-1/2 left-20 text-4xl transform rotate-90">📊</div>
    </div>
    
    <!-- Animated Football Field Lines -->
    <div class="absolute inset-0 opacity-5">
      <svg class="w-full h-full" viewBox="0 0 800 600">
        <!-- Center circle -->
        <circle cx="400" cy="300" r="100" fill="none" stroke="white" stroke-width="3"/>
        <!-- Center line -->
        <line x1="400" y1="0" x2="400" y2="600" stroke="white" stroke-width="3"/>
        <!-- Penalty boxes -->
        <rect x="50" y="200" width="100" height="200" fill="none" stroke="white" stroke-width="2"/>
        <rect x="650" y="200" width="100" height="200" fill="none" stroke="white" stroke-width="2"/>
        <!-- Goal areas -->
        <rect x="50" y="250" width="50" height="100" fill="none" stroke="white" stroke-width="2"/>
        <rect x="700" y="250" width="50" height="100" fill="none" stroke="white" stroke-width="2"/>
      </svg>
    </div>
  
    <div class="relative z-10 max-w-2xl mx-auto text-center pt-10">
      <!-- Error Icon and Status -->
      <div class="mb-8">
        <div class="text-8xl mb-4 animate-bounce">
          {errorDetails.icon}
        </div>
        <div class="bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-6 py-2 inline-block mb-4">
          <span class="font-bold text-lg">ERROR {status}</span>
        </div>
      </div>
  
      <!-- Main Error Content -->
      <div class="bg-white bg-opacity-15 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white border-opacity-20">
        <h1 class="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          {errorDetails.title}
        </h1>
        
        <p class="text-xl text-opacity-90 mb-6 leading-relaxed">
          {errorDetails.message}
        </p>
        
        <p class="text-lg text-opacity-75 mb-8">
          {errorDetails.suggestion}
        </p>
  
        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            on:click={goHome}
            class="group bg-white text-gray-800 font-bold py-4 px-8 rounded-full hover:bg-opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-3 min-w-[200px] justify-center"
          >
            <span class="text-2xl group-hover:animate-pulse">🏠</span>
            Go to Homepage
          </button>
          
          <button 
            on:click={goBack}
            class="group bg-transparent border-2 border-white font-bold py-4 px-8 rounded-full hover:bg-white hover:text-gray-800 transition-all duration-300 transform hover:scale-105 flex items-center gap-3 min-w-[200px] justify-center"
          >
            <span class="text-2xl group-hover:animate-pulse">↩️</span>
            Go Back
          </button>
        </div>
      </div>
  
      <!-- Additional Info for 404 Errors -->
      {#if status === 404}
        <div class="mt-8 bg-black bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-10">
          <h3 class="text-xl text-white font-bold mb-3 flex items-center text black justify-center gap-2">
            <span>📋</span> Quick Actions
          </h3>
          <div class="grid grid-cols-1 gap-4 text-sm">
            <a 
                href='/leagues'
                class="bg-white bg-opacity-10 hover:bg-opacity-20 py-3 px-4 rounded-xl transition-all duration-200 hover:transform hover:scale-105"
            >
              📊 League Tables
          </a>
          </div>
        </div>
      {/if}
  
      <!-- Footer Message -->
      <div class="mt-8 text-opacity-60">
        <p class="text-sm text-white">
          If this problem persists, please contact our support team. ⚽<br>
        </p>
      </div>
    </div>
  
    <!-- Floating Animation Elements -->
    <div class="absolute top-20 right-1/4 animate-float">
      <div class="w-4 h-4 bg-white rounded-full opacity-30"></div>
    </div>
    <div class="absolute bottom-32 left-1/3 animate-float-delayed">
      <div class="w-3 h-3 bg-white rounded-full opacity-40"></div>
    </div>
    <div class="absolute top-1/3 right-10 animate-float-slow">
      <div class="w-5 h-5 bg-white rounded-full opacity-25"></div>
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
    
    .animate-float {
      animation: float 3s ease-in-out infinite;
    }
    
    .animate-float-delayed {
      animation: float-delayed 4s ease-in-out infinite 1s;
    }
    
    .animate-float-slow {
      animation: float-slow 5s ease-in-out infinite 2s;
    }
    
    /* Custom scrollbar for WebKit browsers */
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