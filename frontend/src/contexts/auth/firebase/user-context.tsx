'use client';

import * as React from 'react';
import {Auth, onAuthStateChanged, onIdTokenChanged} from 'firebase/auth';

import type {User} from '@/types/user';
import {getFirebaseAuth} from '@/lib/auth/firebase/client';

import type {UserContextValue} from '../types';
import {apiFetch} from '@/lib/api/api-fetch';

export const UserContext = React.createContext<UserContextValue | undefined>(undefined);

export interface UserProviderProps {
    children: React.ReactNode;
}

export function UserProvider({children}: UserProviderProps): React.JSX.Element {
    const [firebaseAuth] = React.useState<Auth>(getFirebaseAuth());

    const [state, setState] = React.useState<{
        user: User | null;
        error: string | null;
        isLoading: boolean,
        role?: string | null
        permissions: string[]
    }>({
        user: null,
        error: null,
        isLoading: true,
        role: null,
        permissions: [],
    });

    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
            let permissions: string[] = [];
            let role: string | null = null;
            if (user) {
                const idTokenResult = await user.getIdTokenResult();
                permissions = idTokenResult.claims.permissions as string [] || [];
                role = idTokenResult.claims.role as string || null;
            }


            setState((prev) => ({
                ...prev,
                user: user
                    ? ({
                        id: user.uid,
                        email: user.email || "",
                        name: user.displayName || "",
                        avatar: user.photoURL || "",
                    } satisfies User)
                    : null,
                permissions,
                role,
                error: null,
                isLoading: false,
            }));
        });

        return () => {
            unsubscribe();
        };
    }, [firebaseAuth]);

    React.useEffect(() => {
        const unsubscribe = onIdTokenChanged(firebaseAuth, async (user) => {
            console.log("[onIdTokenChanged]", user);
            if (user) {
                const idTokenResult = await user.getIdTokenResult()
                const permissions = idTokenResult.claims?.permissions as string[] || [];
                const role = idTokenResult.claims?.role as string || null;
                console.log("[onIdTokenChanged] permissions", permissions);
                setState(prev => ({
                    ...prev,
                    permissions,
                    role
                }))
            }
        })
        return () => {
            unsubscribe();
        };
    }, [firebaseAuth]);

    const updateUser = React.useCallback((user: User) => {
        setState((prev) => ({
            ...prev,
            user: prev.user ? {...prev.user, name: user.name} : null,
        }));
    }, [state.user]);

    const syncUser = React.useCallback(async () => {
        console.log("[syncUser]" );
        return apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sync`, {
            method: 'POST',
        })
    }, [])

    return <UserContext.Provider value={{...state, updateUser, syncUser}}>{children}</UserContext.Provider>;
}

export const UserConsumer = UserContext.Consumer;
