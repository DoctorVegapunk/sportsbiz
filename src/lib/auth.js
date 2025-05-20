import { writable } from 'svelte/store';

export const isAuthenticated = writable(false);

// Check if user is authenticated (you might want to verify with your backend)
export function checkAuth() {
  return typeof window !== 'undefined' && localStorage.getItem('isAuthenticated') === 'true';
}

// Login function
export function login() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('isAuthenticated', 'true');
    isAuthenticated.set(true);
  }
}

// Logout function
export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('isAuthenticated');
    isAuthenticated.set(false);
  }
}

// Initialize auth state
export function initAuth() {
  if (typeof window !== 'undefined') {
    isAuthenticated.set(checkAuth());
  }
}
