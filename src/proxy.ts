import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const path = request.nextUrl.pathname;
  const isDashboardRoute = path.startsWith('/dashboard');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isMock = !supabaseUrl || !supabaseAnonKey || 
    supabaseUrl.includes('placeholder') || 
    supabaseUrl.includes('your_') ||
    supabaseUrl.startsWith('your') ||
    (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) ||
    process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

  if (isDashboardRoute) {
    let isAuthenticated = false;

    if (isMock) {
      const mockCookie = request.cookies.get('edquanta-mock-token');
      if (mockCookie && mockCookie.value === 'mock-jwt-token') {
        isAuthenticated = true;
      }
    } else {
      try {
        const supabase = createServerClient(
          supabaseUrl!,
          supabaseAnonKey!,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll();
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) =>
                  request.cookies.set(name, value)
                );
              },
            },
          }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          isAuthenticated = true;
        }
      } catch (e) {
        console.error('Proxy auth check error:', e);
      }
    }

    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirectedFrom', path);
      return NextResponse.redirect(url);
    }
  }

  const isAuthRoute = path === '/login' || path === '/signup';
  if (isAuthRoute) {
    let isAuthenticated = false;

    if (isMock) {
      const mockCookie = request.cookies.get('edquanta-mock-token');
      if (mockCookie && mockCookie.value === 'mock-jwt-token') {
        isAuthenticated = true;
      }
    } else {
      try {
        const supabase = createServerClient(
          supabaseUrl!,
          supabaseAnonKey!,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll();
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) =>
                  request.cookies.set(name, value)
                );
              },
            },
          }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          isAuthenticated = true;
        }
      } catch (e) {
        console.error('Proxy auth check error:', e);
      }
    }

    if (isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
