import { redirect } from '@sveltejs/kit';

export const handle = async ({ event, resolve }) => {
  // Get the session ID from the cookies
  const sessionId = event.cookies.get('sessionid');
  const isAdminPath = event.url.pathname.startsWith('/admin');
  const isLoginPage = event.url.pathname === '/admin/login';
  
  // If user is not authenticated and trying to access admin routes (except login)
  if (isAdminPath && !sessionId && !isLoginPage) {
    throw redirect(303, '/admin/login');
  }
  
  // If user is authenticated and tries to access login page, redirect to dashboard
  if (isLoginPage && sessionId) {
    throw redirect(303, '/admin/dashboard');
  }
  
  const response = await resolve(event);
  return response;
};
