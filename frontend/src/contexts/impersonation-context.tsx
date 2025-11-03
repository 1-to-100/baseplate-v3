"use client";

import * as React from "react";
import { authService } from "@/lib/auth/auth-service";

interface ImpersonationContextValue {
  impersonatedUserId: string | null;
  setImpersonatedUserId: (userId: string | null) => void;
  isImpersonating: boolean;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = React.useState(true);

  // Initialize impersonation state from JWT on mount
  React.useEffect(() => {
    const initializeImpersonation = async () => {
      try {
        const context = await authService.getCurrentContext();
        
        if (context.impersonatedUserId) {
          setImpersonatedUserId(context.impersonatedUserId);
        }
      } catch (error) {
        console.error('[IMPERSONATION] Failed to initialize:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeImpersonation();
  }, []);

  const handleSetImpersonatedUserId = React.useCallback(
    async (userId: string | null) => {
      if (userId) {
        try {
          // SECURE: Backend validates and issues new JWT with impersonation context
          await authService.refreshWithContext({ 
            impersonatedUserId: userId 
          });
          
          // Re-read the context from the updated JWT
          const updatedContext = await authService.getCurrentContext();
          
          if (updatedContext.impersonatedUserId) {
            setImpersonatedUserId(updatedContext.impersonatedUserId);
            
            // Reload to ensure all components use the new context
            setTimeout(() => window.location.reload(), 200);
          } else {
            console.error('[IMPERSONATION] Failed: JWT missing impersonated_user_id', { userId });
          }
        } catch (error) {
          console.error('[IMPERSONATION] Failed to impersonate:', error);
          alert('You do not have permission to impersonate this user');
        }
      } else {
        // Clear impersonation
        await authService.clearContext();
        setImpersonatedUserId(null);
        
        // Wait for JWT to propagate before reloading
        setTimeout(() => window.location.reload(), 500);
      }
    },
    []
  );

  const value = React.useMemo(
    () => ({
      impersonatedUserId,
      setImpersonatedUserId: handleSetImpersonatedUserId,
      isImpersonating: impersonatedUserId !== null,
      isLoading,
    }),
    [impersonatedUserId, handleSetImpersonatedUserId, isLoading]
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
