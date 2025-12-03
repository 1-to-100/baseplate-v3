import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthApiError } from '@supabase/supabase-js';

import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import { createClient } from '@/lib/supabase/server';
import { config } from '@/config';
import { createOAuthUser } from '@/lib/api/users';

export const dynamic = 'force-dynamic';

// NOTE: If you have a proxy in front of this app
//  the request origin might be a local address.
//  Consider using `config.site.url` from `@/config` instead.

// NOTE: This is not a `Page` because we only redirect and it will never render React content.

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const url = new URL(paths.auth.supabase.signUp, config.site.url);

  if (searchParams.get('error')) {
    const description = searchParams.get('error_description') || 'Something went wrong';
    url.searchParams.set('error', description);
    return NextResponse.redirect(url);
  }

  const code = searchParams.get('code');
  let next = searchParams.get('next');

  if (!code) {
    url.searchParams.set('error', 'Code is missing');
    return NextResponse.redirect(url);
    // return NextResponse.json({ error: 'Code is missing' });
  }

  const cookieStore = cookies();
  const supabaseClient = createClient(cookieStore);

  try {    
    const { error, data: {user} } = await supabaseClient.auth.exchangeCodeForSession(code);

    if (error) {
      url.searchParams.set('error', error.message);
      return NextResponse.redirect(url);
      // return NextResponse.json({ error: error.message });
    }

    if (!user || !user.email) {
      url.searchParams.set('error', 'User is missing');
      return NextResponse.redirect(url);
      // return NextResponse.json({ error: 'User is missing' });
    }


    // Check if user exists in database and create if needed
    // This MUST complete before redirecting, otherwise the frontend will fail to find the user
    let userExists = false;
    try {
      const result = await createOAuthUser({
        supabase: supabaseClient,
        authUserId: user.id,
        email: user.email,
        userMetadata: user.user_metadata as { firstName?: string; lastName?: string; full_name?: string } | undefined,
        name: user.user_metadata?.full_name as string | undefined,
        avatarUrl: user.user_metadata?.avatar_url as string | undefined,
      });

      if (result === null) {
        // User already exists, continue with redirect
        userExists = true;
      } else {
        // User was created successfully
        userExists = true;
      }
    } catch (userCreationError) {
      // If it's a public email domain error, redirect with error message
      if (userCreationError instanceof Error && userCreationError.message.includes('work email')) {
        url.searchParams.set('error', userCreationError.message);
        return NextResponse.redirect(url);
      }
      
      // For other errors, we need to verify if user actually exists
      // If user creation failed but user doesn't exist, we should not redirect
      // as the frontend will fail to find the user
      try {
        const { data: existingUser, error: checkError } = await supabaseClient
          .from('users')
          .select('user_id, auth_user_id, email, customer_id, role_id, status')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') {
          // Unexpected error checking user existence
          url.searchParams.set('error', 'Failed to verify user account. Please try again.');
          return NextResponse.redirect(url);
        }
        
        if (existingUser) {
          // User exists despite error (maybe partial creation), log and continue
          userExists = true;
        } else {
          // User doesn't exist and creation failed - redirect with error
          const errorMessage = userCreationError instanceof Error 
            ? userCreationError.message 
            : 'Failed to create user account. Please try again or contact support.';
          url.searchParams.set('error', errorMessage);
          return NextResponse.redirect(url);
        }
      } catch (checkError) {
        // Can't verify user existence, don't risk redirecting to broken state
        url.searchParams.set('error', 'Failed to verify user account. Please try again.');
        return NextResponse.redirect(url);
      }
    }

    // Final verification: ensure user exists and is queryable before redirecting
    // This is a safety check to prevent redirecting when user doesn't exist
    // We verify by both auth_user_id and email to ensure the user is fully created
    try {
      // Small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: verifyUser, error: verifyError } = await supabaseClient
        .from('users')
        .select('user_id, auth_user_id, email, customer_id, role_id, status')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (verifyError && verifyError.code !== 'PGRST116') {
        url.searchParams.set('error', 'Failed to verify user account. Please try again.');
        return NextResponse.redirect(url);
      }
      
      if (!verifyUser) {
        // Try one more time by email as fallback
        const { data: verifyByEmail, error: emailError } = await supabaseClient
          .from('users')
          .select('user_id, auth_user_id, email, customer_id, role_id, status')
          .eq('email', user.email)
          .is('deleted_at', null)
          .maybeSingle();
        
        if (emailError && emailError.code !== 'PGRST116') {
          url.searchParams.set('error', 'Failed to verify user account. Please try again.');
          return NextResponse.redirect(url);
        }
        
        if (!verifyByEmail) {
          url.searchParams.set('error', 'User account was not created. Please try again or contact support.');
          return NextResponse.redirect(url);
        }
      }
    } catch (verifyError) {
      url.searchParams.set('error', 'Failed to verify user account. Please try again.');
      return NextResponse.redirect(url);
    }
  } catch (err) {
    if (err instanceof AuthApiError && err.message.includes('code and code verifier should be non-empty')) {
      url.searchParams.set('error', 'Please open the link in the same browser');
      return NextResponse.redirect(url);
      // return NextResponse.json({ error: 'Please open the link in the same browser' });
    }

    logger.error('Callback error', err);
    url.searchParams.set('error', 'Something went wrong');
    return NextResponse.redirect(url);
    // return NextResponse.json({ error: 'Something went wrong' });
  }


  if (!next) {
    next = paths.home;
  }

  return NextResponse.redirect(new URL(next, config.site.url));
}
