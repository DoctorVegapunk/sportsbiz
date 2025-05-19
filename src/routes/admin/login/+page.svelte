<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  let email = '';
  let password = '';
  let error = '';
  let isLoading = false;
  
  async function handleLogin() {
    // Basic validation
    if (!email || !password) {
      error = 'Please fill in all fields';
      return;
    }
    
    try {
      isLoading = true;
      // Here you would typically make an API call to your authentication endpoint
      // For now, we'll simulate a successful login
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to admin dashboard on successful login
      goto('/admin/dashboard');
    } catch (err) {
      error = 'Invalid email or password';
      console.error('Login error:', err);
    } finally {
      isLoading = false;
    }
  }
  
  // Handle form submission
  function handleSubmit(event) {
    event.preventDefault();
    handleLogin();
  }
  
  // Auto-focus email field on mount
  onMount(() => {
    const emailInput = document.querySelector('input[type="email"]');
    if (emailInput) emailInput.focus();
  });
</script>

<div class="page-container">
  <header class="page-header">
    <div class="header-content">
      <h1>SportsBiz Admin</h1>
    </div>
  </header>
  <main class="login-container">
  <div class="login-card">
    <div class="logo">
      <h1>SportsBiz</h1>
      <p>Admin Portal</p>
    </div>
    
    {#if error}
      <div class="error-message">
        {error}
      </div>
    {/if}
    
    <form on:submit={handleSubmit}>
      <div class="form-group">
        <label for="email">Email</label>
        <input
          type="email"
          id="email"
          bind:value={email}
          placeholder="Enter your email"
          autocomplete="username"
          disabled={isLoading}
        />
      </div>
      
      <div class="form-group">
        <div class="password-header">
          <label for="password">Password</label>
          <a href="/forgot-password" class="forgot-password">Forgot password?</a>
        </div>
        <input
          type="password"
          id="password"
          bind:value={password}
          placeholder="Enter your password"
          autocomplete="current-password"
          disabled={isLoading}
        />
      </div>
      
      <button type="submit" class="login-button" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
    
   
    </div>
  </main>
</div>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: white;
    color: #333;
  }
  
  :global(body) {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  .page-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    width: 100%;
  }
  
  .page-header, .page-footer {
    width: 100%;
    background-color: #f8f9fa;
    padding: 1rem 0;
  }
  
  .header-content, .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }
  
  .page-header {
    border-bottom: 1px solid #e9ecef;
  }
  
  .page-footer {
    margin-top: auto;
    border-top: 1px solid #e9ecef;
  }
  
  .login-container {
    flex: 1;
    width: 100%;
    max-width: 100%;
    padding: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .login-card {
    background: white;
    border-radius: 12px;
    padding: 2.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 480px;
  }
  
  .logo {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .logo h1 {
    margin: 0;
    color: #1a237e;
    font-size: 2rem;
    font-weight: 700;
  }
  
  .logo p {
    margin: 0.5rem 0 0;
    color: #666;
    font-size: 1rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #444;
    font-size: 0.9rem;
  }
  
  input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }
  
  input:focus {
    outline: none;
    border-color: #3949ab;
    box-shadow: 0 0 0 3px rgba(57, 73, 171, 0.1);
  }
  
  input::placeholder {
    color: #aaa;
  }
  
  .password-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .forgot-password {
    font-size: 0.85rem;
    color: #3949ab;
    text-decoration: none;
    transition: color 0.2s;
  }
  
  .forgot-password:hover {
    color: #1a237e;
    text-decoration: underline;
  }
  
  .login-button {
    width: 100%;
    padding: 0.875rem;
    background-color: #3949ab;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.1s;
    margin-top: 0.5rem;
  }
  
  .login-button:hover {
    background-color: #303f9f;
  }
  
  .login-button:active {
    transform: translateY(1px);
  }
  
  .login-button:disabled {
    background-color: #9fa8da;
    cursor: not-allowed;
    transform: none;
  }
  
  .error-message {
    background-color: #ffebee;
    color: #c62828;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    border-left: 4px solid #ef5350;
  }
  
  .footer {
    margin-top: 2rem;
    text-align: center;
    color: #888;
    font-size: 0.85rem;
    padding-top: 1.5rem;
    border-top: 1px solid #eee;
  }
  
  @media (max-width: 480px) {
    .login-card {
      padding: 1.5rem;
    }
    
    .logo h1 {
      font-size: 1.75rem;
    }
  }
</style>