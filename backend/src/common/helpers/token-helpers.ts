export function getProviderFromToken(
  token: string,
): 'supabase' | 'firebase' | null {
  try {
    const payloadEncoded = token.split('.')[1];
    const buffer = Buffer.from(payloadEncoded, 'base64');
    const decodedPayload = JSON.parse(buffer.toString('utf-8')) as {
      iss: string;
      firebase?: unknown;
    };
    if (decodedPayload.iss.includes('supabase.co')) {
      return 'supabase';
    } else if ('firebase' in decodedPayload) {
      return 'firebase';
    }
  } catch (error) {
    console.log('error', error);
    return null;
  }

  return null;
}
