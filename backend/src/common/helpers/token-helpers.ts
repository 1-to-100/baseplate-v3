export function getProviderFromToken(
  token: string,
): 'supabase' | null {
  try {
    const payloadEncoded = token.split('.')[1];
    const buffer = Buffer.from(payloadEncoded, 'base64');
    const decodedPayload = JSON.parse(buffer.toString('utf-8')) as {
      iss: string;
    };
    if (decodedPayload.iss.includes('supabase.co')) {
      return 'supabase';
    }
  } catch (error) {
    console.log('error', error);
    return null;
  }

  return null;
}
