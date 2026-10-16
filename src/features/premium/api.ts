import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

export interface PremiumWaitlistStatus {
  waitlisted: boolean;
  email: string;
}

interface WaitlistRpcResult {
  waitlisted?: unknown;
  email?: unknown;
}

function parseWaitlistResult(data: unknown): PremiumWaitlistStatus {
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof (data as WaitlistRpcResult).waitlisted !== 'boolean' ||
    typeof (data as WaitlistRpcResult).email !== 'string'
  ) {
    throw new ApiError('The Premium waitlist returned an unexpected response.', 502);
  }
  const result = data as WaitlistRpcResult;
  return {
    waitlisted: result.waitlisted as boolean,
    email: (result.email as string).trim().toLowerCase(),
  };
}

export async function getPremiumWaitlistStatus(): Promise<PremiumWaitlistStatus> {
  const { data, error } = await getSupabaseClient().rpc('mobile_get_premium_waitlist');
  if (error) {
    const isAuth = error.code === '28000' || error.message.toLowerCase().includes('auth');
    throw new ApiError(
      isAuth ? 'Sign in again to manage the Premium waitlist.' : `Unable to reach the Premium waitlist: ${error.message}`,
      isAuth ? 401 : 500,
    );
  }
  return parseWaitlistResult(data);
}

export async function joinPremiumWaitlist(email: string): Promise<PremiumWaitlistStatus> {
  const normalized = email.trim();
  const { data, error } = await getSupabaseClient().rpc('mobile_join_premium_waitlist', {
    p_email: normalized,
    p_consent: true,
  });
  if (error) {
    const isAuth = error.code === '28000' || error.message.toLowerCase().includes('auth');
    const isValidation = error.code === '22023';
    throw new ApiError(
      isAuth
        ? 'Sign in again to manage the Premium waitlist.'
        : error.message || 'Unable to join the Premium waitlist right now.',
      isAuth ? 401 : isValidation ? 400 : 500,
    );
  }
  return parseWaitlistResult(data);
}

export async function removePremiumWaitlistEntry(): Promise<PremiumWaitlistStatus> {
  const { data, error } = await getSupabaseClient().rpc('mobile_remove_premium_waitlist');
  if (error) {
    const isAuth = error.code === '28000' || error.message.toLowerCase().includes('auth');
    throw new ApiError(
      isAuth
        ? 'Sign in again to manage the Premium waitlist.'
        : error.message || 'Unable to remove your waitlist signup right now.',
      isAuth ? 401 : 500,
    );
  }
  return parseWaitlistResult(data);
}

