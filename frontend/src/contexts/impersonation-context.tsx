"use client";

import * as React from "react";
import { authService } from "@/lib/auth/auth-service";

interface ImpersonationContextValue {
  impersonatedUserId: string | null;
  setImpersonatedUserId: (userId: string | null) => void;
  isImpersonating: boolean;
}

const ImpersonationContext = React.createContext<
  ImpersonationContextValue | undefined
>(undefined);

export interface ImpersonationProviderProps {
  children: React.ReactNode;
}

export function ImpersonationProvider({
  children,
}: ImpersonationProviderProps): React.JSX.Element {
  const [impersonatedUserId, setImpersonatedUserId] = React.useState<
    string | null
  >(null);

  const handleSetImpersonatedUserId = React.useCallback(
    async (userId: string | null) => {
      if (userId) {
        try {
          // SECURE: Backend validates and issues new JWT with impersonation context
          await authService.refreshWithContext({ 
            impersonatedUserId: userId 
          });
          setImpersonatedUserId(userId);
          
          // Reload to use new token with updated context
          window.location.reload();
        } catch (error) {
          console.error('Failed to impersonate user:', error);
          alert('You do not have permission to impersonate this user');
        }
      } else {
        // Clear impersonation
        await authService.clearContext();
        setImpersonatedUserId(null);
        
        // Reload to use updated token
        window.location.reload();
      }
    },
    []
  );

  const value = React.useMemo(
    () => ({
      impersonatedUserId,
      setImpersonatedUserId: handleSetImpersonatedUserId,
      isImpersonating: impersonatedUserId !== null,
    }),
    [impersonatedUserId, handleSetImpersonatedUserId]
  );

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation(): ImpersonationContextValue {
  const context = React.useContext(ImpersonationContext);

  if (!context) {
    throw new Error(
      "useImpersonation must be used within an ImpersonationProvider"
    );
  }

  return context;
}
