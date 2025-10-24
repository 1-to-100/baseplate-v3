"use client";

import * as React from "react";

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
  >(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("impersonatedUserId");
      return stored || null;
    }
    return null;
  });

  const handleSetImpersonatedUserId = React.useCallback(
    (userId: string | null) => {
      setImpersonatedUserId(userId);

      if (typeof window !== "undefined") {
        if (userId) {
          localStorage.setItem("impersonatedUserId", userId);
        } else {
          localStorage.removeItem("impersonatedUserId");
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
