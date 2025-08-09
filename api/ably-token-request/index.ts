import type { Handler } from '@netlify/functions';
import Ably from 'ably';

export const handler: Handler = async () => {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: 'Missing ABLY_API_KEY env var',
    };
  }

  try {
    const rest = new Ably.Rest(apiKey);
    const tokenRequest = await rest.auth.createTokenRequest({ clientId: 'netlify-chat' });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(tokenRequest),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      body: 'Failed to create Ably token request: ' + (e?.message || String(e)),
    };
  }
};
