"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { Toaster } from "sonner";

import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { RealtimeProvider } from "@/lib/realtime";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 5_000 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <AuthProvider>
          <RealtimeProvider>
            {children}
            <Toaster richColors position="top-center" closeButton />
          </RealtimeProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
