import { redirect } from '@sveltejs/kit';
import { logout } from '$lib/auth';

export function GET({ cookies }) {
  // Clear the session cookie
  cookies.delete('sessionid', { path: '/' });
  
  // Update auth state
  if (typeof window !== 'undefined') {
    logout();
  }
  
  // Redirect to login page
  throw redirect(303, '/admin/login');
}
