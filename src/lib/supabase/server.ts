import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isMockAuth } from './client';

export async function createClient() {
  const cookieStore = await cookies();

  if (isMockAuth) {
    return {
      auth: {
        getSession: async () => {
          const mockCookie = cookieStore.get('edquanta-mock-token');
          if (mockCookie && mockCookie.value === 'mock-jwt-token') {
            return {
              data: {
                session: {
                  access_token: 'mock-jwt-token',
                  user: {
                    id: 'demo-user-id',
                    email: 'demo@edquanta.ai',
                    user_metadata: { 
                      full_name: 'Demo Debater',
                      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
                    },
                  },
                },
              },
              error: null,
            };
          }
          return { data: { session: null }, error: null };
        },
        getUser: async () => {
          const mockCookie = cookieStore.get('edquanta-mock-token');
          if (mockCookie && mockCookie.value === 'mock-jwt-token') {
            return {
              data: {
                user: {
                  id: 'demo-user-id',
                  email: 'demo@arguemate.ai',
                  user_metadata: { 
                    full_name: 'Demo Debater',
                    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
                  },
                },
              },
              error: null,
            };
          }
          return { data: { user: null }, error: null };
        },
        signOut: async () => {
          // Clear mock cookie by setting expiry in past
          cookieStore.delete('edquanta-mock-token');
          return { error: null };
        },
        exchangeCodeForSession: async (code: string) => {
          cookieStore.set('edquanta-mock-token', 'mock-jwt-token', {
            path: '/',
            maxAge: 86400,
            sameSite: 'lax',
          });
          return { data: {}, error: null };
        }
      },
    } as any;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Can be ignored if handled by middleware
        }
      },
    },
  });
}
