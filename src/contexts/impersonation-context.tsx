"use client";

import * as React from "react";
import { authService } from "@/lib/auth/auth-service";
import { toast } from "@/components/core/toaster";

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
            toast.error('Failed to start impersonation: JWT update incomplete');
          }
        } catch (error) {
          console.error('[IMPERSONATION] Failed to impersonate:', error);
          
          // Extract meaningful error message
          let errorMessage = 'You do not have permission to impersonate this user';
          
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            
            if (message.includes('permission') || message.includes('forbidden') || message.includes('403')) {
              errorMessage = 'You do not have permission to impersonate this user';
            } else if (message.includes('not found') || message.includes('404')) {
              errorMessage = 'User not found';
            } else if (message.includes('inactive') || message.includes('suspended')) {
              errorMessage = 'Cannot impersonate inactive or suspended users';
            } else if (message.includes('system administrator') || message.includes('admin')) {
              errorMessage = 'Cannot impersonate system administrators';
            } else if (message.includes('session') || message.includes('authenticated')) {
              errorMessage = 'Authentication error. Please try logging in again';
            } else if (message.includes('refresh') || message.includes('jwt')) {
              errorMessage = 'Failed to update session. Please try again';
            } else {
              // Use the error message if it's user-friendly, otherwise use default
              errorMessage = error.message.length < 100 ? error.message : errorMessage;
            }
          }
          
          toast.error(errorMessage);
        }
      } else {
        try {
          // Clear impersonation
          await authService.clearContext();
          setImpersonatedUserId(null);
          
          // Wait for JWT to propagate before reloading
          setTimeout(() => window.location.reload(), 500);
        } catch (error) {
          console.error('[IMPERSONATION] Failed to clear context:', error);
          toast.error('Failed to exit impersonation mode. Please try again');
        }
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
