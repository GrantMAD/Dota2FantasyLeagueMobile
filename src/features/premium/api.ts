import { ApiError } from '@/src/lib/errors';
import { getWebBaseUrl } from '@/src/lib/web';
import { getSupabaseClient } from '@/src/lib/supabase';

export interface PremiumWaitlistStatus {
  waitlisted: boolean;
  email: string;
}

interface WaitlistResponse {
  waitlisted?: unknown;
  email?: unknown;
  error?: unknown;
}

async function requestWaitlist(
  method: 'GET' | 'POST' | 'DELETE',
  body?: { email: string; consent: true },
): Promise<PremiumWaitlistStatus> {
  const { data, error: sessionError } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token;
  if (sessionError || !token) {
    throw new ApiError('Sign in again to manage the Premium waitlist.', 401);
  }

  let response: Response;
  try {
    response = await fetch(`${getWebBaseUrl()}/api/premium/waitlist`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error: unknown) {
    throw new ApiError(
      error instanceof Error ? `Unable to reach the Premium waitlist: ${error.message}` : 'Unable to reach the Premium waitlist.',
      503,
    );
  }

  let result: WaitlistResponse;
  try {
    result = (await response.json()) as WaitlistResponse;
  } catch {
    throw new ApiError('The Premium waitlist returned an invalid response.', 502);
  }

  if (!response.ok) {
    throw new ApiError(
      typeof result.error === 'string' ? result.error : 'Unable to update the Premium waitlist.',
      response.status,
    );
  }

  if (typeof result.waitlisted !== 'boolean' || (result.email !== undefined && typeof result.email !== 'string')) {
    throw new ApiError('The Premium waitlist returned an unexpected response.', 502);
  }

  return {
    waitlisted: result.waitlisted,
    email: method === 'POST' ? body?.email.trim().toLowerCase() ?? '' : result.email ?? '',
  };
}

export function getPremiumWaitlistStatus(): Promise<PremiumWaitlistStatus> {
  return requestWaitlist('GET');
}

export function joinPremiumWaitlist(email: string): Promise<PremiumWaitlistStatus> {
  return requestWaitlist('POST', { email: email.trim(), consent: true });
}

export function removePremiumWaitlistEntry(): Promise<PremiumWaitlistStatus> {
  return requestWaitlist('DELETE');
}
