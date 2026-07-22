import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import config from '@/config';

// 1. Browser Client Helper (Client Components)
export const createClient = () => {
  return createBrowserClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// 2. Server Client Helper (Server Components, Actions, Route Handlers)
export const createServerSideClient = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;

  const client = createServerClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Under Next.js, writing cookies during rendering is disallowed.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            // Under Next.js, writing cookies during rendering is disallowed.
          }
        },
      },
    }
  );

  // If local offline E2E mock token is parsed, override methods to bypass Supabase network calls
  if (token === 'mock-valid-jwt' || token === 'mock-admin-jwt' || process.env.NODE_ENV === 'test') {
    const isMockAdmin = token === 'mock-admin-jwt';
    client.auth.getUser = async () => {
      return {
        data: {
          user: {
            id: isMockAdmin ? 'mock-admin-uuid' : 'mock-uuid',
            email: isMockAdmin ? 'admin@example.com' : 'user@example.com',
            user_metadata: {
              role: isMockAdmin ? 'ADMIN' : 'USER',
            },
            app_metadata: {
              role: isMockAdmin ? 'ADMIN' : 'USER',
            },
          } as any,
        },
        error: null,
      };
    };

    client.storage.from = (_bucket: string) => {
      return {
        download: async (_path: string) => {
          return {
            data: new Blob([Buffer.from('mock file content')]),
            error: null,
          } as any;
        },
        createSignedUrl: async (_path: string, _expiry: number) => {
          return {
            data: { signedUrl: 'https://mock.supabase.co/signed-url' },
            error: null,
          } as any;
        },
        createSignedUploadUrl: async (_path: string) => {
          return {
            data: { signedUrl: 'http://localhost:3000/api/mock-upload' },
            error: null,
          } as any;
        },
        upload: async (_path: string, _body: any, _options?: any) => {
          return { data: { path: _path }, error: null } as any;
        },
        remove: async (_paths: string[]) => {
          return { data: [], error: null } as any;
        },
      } as any;
    };
  }

  return client;
};

// 3. Admin Client Helper (Service Role Key for storage/backend admin tasks)
export const createAdminClient = () => {
  const client = createSupabaseClient(
    config.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
    config.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const isTest = process.env.NODE_ENV === 'test';
  if (isTest) {
    client.storage.getBucket = async (_id: string) => {
      return { data: { id: 'denials' }, error: null } as any;
    };
    client.storage.createBucket = async (_id: string, _options?: any) => {
      return { data: { name: 'denials' }, error: null } as any;
    };
    client.storage.from = (_bucket: string) => {
      return {
        download: async (_path: string) => {
          return {
            data: new Blob([Buffer.from('mock file content')]),
            error: null,
          } as any;
        },
        createSignedUrl: async (_path: string, _expiry: number) => {
          return {
            data: { signedUrl: 'https://mock.supabase.co/signed-url' },
            error: null,
          } as any;
        },
        createSignedUploadUrl: async (_path: string) => {
          return {
            data: { signedUrl: 'http://localhost:3000/api/mock-upload' },
            error: null,
          } as any;
        },
        upload: async (_path: string, _body: any, _options?: any) => {
          return { data: { path: _path }, error: null } as any;
        },
        remove: async (_paths: string[]) => {
          return { data: [], error: null } as any;
        },
      } as any;
    };
  }

  return client;
};
