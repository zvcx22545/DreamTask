'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState } from 'react';
import { config } from '@/config';
import { GlobalUI } from '@/components/GlobalUI';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <GoogleOAuthProvider clientId={config.google.clientId}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
      {/* Global overlays อยู่นอก QueryClientProvider เพื่อหลีกเลี่ยง stacking context */}
      <GlobalUI />
      <LoadingOverlay />
    </GoogleOAuthProvider>
  );
}

