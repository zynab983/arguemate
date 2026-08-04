import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isMockAuth = !supabaseUrl || !supabaseAnonKey || 
  supabaseUrl.includes('placeholder') || 
  supabaseUrl.includes('your_') ||
  supabaseUrl.startsWith('your') ||
  (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) ||
  process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

class MockAuthClient {
  private getSessionData() {
    if (typeof window === 'undefined') return null;
    const session = localStorage.getItem('arguemate_session');
    return session ? JSON.parse(session) : null;
  }

  private setSessionData(session: any) {
    if (typeof window === 'undefined') return;
    if (session) {
      localStorage.setItem('arguemate_session', JSON.stringify(session));
      document.cookie = `arguemate-mock-token=${session.access_token}; path=/; max-age=86400; SameSite=Lax;`;
    } else {
      localStorage.removeItem('arguemate_session');
      document.cookie = 'arguemate-mock-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;';
    }
  }

  auth = {
    signUp: async ({ email, password, options }: any) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      const name = options?.data?.full_name || email.split('@')[0];
      const user = {
        id: 'demo-user-id',
        email,
        user_metadata: { full_name: name, avatar_url: options?.data?.avatar_url || null },
        createdAt: new Date().toISOString(),
      };
      const session = {
        access_token: 'mock-jwt-token',
        user,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };
      this.setSessionData(session);
      return { data: { user, session }, error: null };
    },
    signInWithPassword: async ({ email, password }: any) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      const user = {
        id: 'demo-user-id',
        email,
        user_metadata: { full_name: 'Demo Debater' },
        createdAt: new Date().toISOString(),
      };
      const session = {
        access_token: 'mock-jwt-token',
        user,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };
      this.setSessionData(session);
      return { data: { user, session }, error: null };
    },
    signInWithOAuth: async ({ provider, options }: any) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const user = {
        id: 'demo-user-id',
        email: 'google-user@gmail.com',
        user_metadata: { 
          full_name: 'Google Debater',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
        },
        createdAt: new Date().toISOString(),
      };
      const session = {
        access_token: 'mock-jwt-token',
        user,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };
      this.setSessionData(session);
      if (typeof window !== 'undefined') {
        window.location.href = options?.redirectTo || '/dashboard';
      }
      return { data: {}, error: null };
    },
    signOut: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      this.setSessionData(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return { error: null };
    },
    getSession: async () => {
      const session = this.getSessionData();
      return { data: { session }, error: null };
    },
    getUser: async () => {
      const session = this.getSessionData();
      return { data: { user: session?.user || null }, error: null };
    },
    updateUser: async ({ data }: any) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const session = this.getSessionData();
      if (session && session.user) {
        session.user.user_metadata = { ...session.user.user_metadata, ...data };
        this.setSessionData(session);
      }
      return { data: { user: session?.user || null }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  };
}

export const supabase = isMockAuth 
  ? new MockAuthClient() 
  : createBrowserClient(supabaseUrl!, supabaseAnonKey!);
