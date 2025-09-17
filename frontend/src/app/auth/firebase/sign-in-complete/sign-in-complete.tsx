"use client";

import {FC, useEffect} from 'react';
import * as React from 'react';
import {Auth, isSignInWithEmailLink, signInWithEmailLink} from 'firebase/auth';
import {getFirebaseAuth} from '@/lib/auth/firebase/client';

type SignInCompleteProps = {
    email?: string;
};

export const SignInComplete: FC<SignInCompleteProps> = ({email}) => {
    const [firebaseAuth] = React.useState<Auth>(getFirebaseAuth());

    useEffect( () => {
        if (!email) return;
        if (!firebaseAuth) return;

        if (isSignInWithEmailLink(firebaseAuth, window.location.href)) {
            console.log("isSignInWithEmailLink", email);
            signInWithEmailLink(firebaseAuth, email, window.location.href).then()
        }

    }, [email, firebaseAuth]);



    return null;
};
