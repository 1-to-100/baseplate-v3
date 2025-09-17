import * as React from 'react';

import { config } from '@/config';
import { AuthStrategy } from '@/lib/auth/strategy';

import { UserContext as Auth0UserContext, UserProvider as Auth0UserProvider } from './auth0/user-context';
import { UserContext as CognitoUserContext, UserProvider as CognitoUserProvider } from './cognito/user-context';
import { UserContext as CustomUserContext, UserProvider as CustomUserProvider } from './custom/user-context';
import { UserContext as FirebaseUserContext, UserProvider as FirebaseUserProvider } from './firebase/user-context';
import { UserContext as SupabaseUserContext, UserProvider as SupabaseUserProvider } from './supabase/user-context';
import type { UserContextValue } from './types';


let UserProvider: React.FC<{ children: React.ReactNode }>;


let UserContext: React.Context<UserContextValue | undefined>;

switch (config.auth.strategy) {
  case AuthStrategy.CUSTOM:
    UserContext = CustomUserContext;
    UserProvider = CustomUserProvider;
    break;
  case AuthStrategy.AUTH0:
    UserContext = Auth0UserContext;
    UserProvider = Auth0UserProvider;
    break;
  case AuthStrategy.COGNITO:
    UserContext = CognitoUserContext;
    UserProvider = CognitoUserProvider;
    break;
  case AuthStrategy.FIREBASE:
    UserContext = FirebaseUserContext;
    UserProvider = FirebaseUserProvider;
    break;
  case AuthStrategy.SUPABASE:
    UserContext = SupabaseUserContext;
    UserProvider = SupabaseUserProvider;
    break;
  default:
    throw new Error('Invalid auth strategy');
}

const useAuth = () => {
    const context = React.useContext(UserContext);

    if (!context) {
        throw new Error('useAuth must be used within a UserProvider');
    }
    return context;
}

export { UserProvider, UserContext, useAuth };
