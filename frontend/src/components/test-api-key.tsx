"use client";
import {FC} from 'react';

export const TestApiKey: FC = () => {
    // console.log("TestApiKey", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    return (
        <div>
            {process.env.NEXT_PUBLIC_FIREBASE_API_KEY}
        </div>
    );
};
