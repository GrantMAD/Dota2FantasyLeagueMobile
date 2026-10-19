import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';
import { getWebBaseUrl } from '@/src/lib/web';

export interface JobDetailItem {
  jobName: string;
  title: string;
  description: string;
  schedule: string;
  status: 'completed' | 'running' | 'idle' | 'failed' | 'skipped' | string;
  lastRun: string | null;
  nextRun: string | null;
}

export interface FreshnessData {
  success: boolean;
  page: string;
  lastUpdated: string | null;
  nextUpdate: string | null;
  jobName?: string;
  serverTime: string;
  jobs: JobDetailItem[];
}

export const PAGE_JOB_MAPPING: Record<string, string[]> = {
  matches: ['fetch-match-details', 'fetch-matches', 'process-completed-matches'],
  players: ['update-player-prices', 'sync-players', 'track-roster-changes'],
  transfers: ['update-player-prices', 'transition-gameweeks'],
  leaderboard: ['calculate-fantasy-scores', 'recalculate-gameweeks', 'calculate-global-rankings'],
  leagues: ['recalculate-leagues', 'calculate-fantasy-scores'],
  gameweeks: ['transition-gameweeks', 'recalculate-gameweeks', 'calculate-fantasy-scores'],
  dashboard: ['calculate-fantasy-scores', 'fetch-matches', 'transition-gameweeks'],
  tournaments: ['discover-tournaments'],
};

export const JOB_METADATA: Record<string, { title: string; desc: string; schedule: string }> = {
  'fetch-match-details': {
    title: 'Live Match Details',
    desc: 'Ingests real-time player fantasy points & in-game stats',
    schedule: '*/30 * * * *',
  },
  'fetch-matches': {
    title: 'Match Schedule & Series',
    desc: 'Discovers new matches, series status & winner updates',
    schedule: '0 * * * *',
  },
  'process-completed-matches': {
    title: 'Match Settlement',
    desc: 'Locks completed match data for official fantasy calculation',
    schedule: '45 * * * *',
  },
  'calculate-fantasy-scores': {
    title: 'Fantasy Scoring Engine',
    desc: 'Calculates team scores and active gameweek points',
    schedule: '50 * * * *',
  },
  'recalculate-gameweeks': {
    title: 'Gameweek Standings',
    desc: 'Aggregates weekly scores into standings and leaderboards',
    schedule: '55 * * * *',
  },
  'recalculate-leagues': {
    title: 'Private & Public Leagues',
    desc: 'Updates rankings across all player leagues',
    schedule: '0 * * * *',
  },
  'calculate-global-rankings': {
    title: 'Global Leaderboards',
    desc: 'Calculates worldwide rank and tier placements',
    schedule: '5 * * * *',
  },
  'update-player-prices': {
    title: 'Player Valuations',
    desc: 'Updates transfer market prices based on player form',
    schedule: '*/10 * * * *',
  },
  'sync-players': {
    title: 'Player Database',
    desc: 'Syncs pro player profiles, teams & roles from OpenDota & Stratz',
    schedule: '0 3 * * *',
  },
  'sync-teams': {
    title: 'Team Database',
    desc: 'Refreshes pro team ratings, rosters and logos',
    schedule: '15 3 * * *',
  },
  'track-roster-changes': {
    title: 'Roster Updates',
    desc: 'Monitors pro player transfers and team substitutions',
    schedule: '0 2 * * *',
  },
  'transition-gameweeks': {
    title: 'Gameweek Deadlines',
    desc: 'Locks lineups at deadline and transitions gameweeks',
    schedule: '*/5 * * * *',
  },
  'discover-tournaments': {
    title: 'Tournament Discovery',
    desc: 'Finds newly announced Tier 1 & Tier 2 tournaments',
    schedule: '0 */6 * * *',
  },
};

function matchesField(field: string, value: number, min: number, max: number): boolean {
  if (field === '*') return true;

  return field.split(',').some((part) => {
    const [rangeOrStart, stepText] = part.split('/');
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) return false;

    let start: number;
    let end: number;
    if (rangeOrStart === '*') {
      start = min;
      end = max;
    } else if (rangeOrStart.includes('-')) {
      const [startText, endText] = rangeOrStart.split('-');
      start = Number(startText);
      end = Number(endText);
    } else {
      start = Number(rangeOrStart);
      end = stepText === undefined ? start : max;
    }

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < min ||
      end > max ||
      start > end
    ) {
      return false;
    }

    return value >= start && value <= end && (value - start) % step === 0;
  });
}

export function matchesCronSchedule(expression: string, date: Date): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5 || Number.isNaN(date.getTime())) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  return (
    matchesField(minute, date.getUTCMinutes(), 0, 59) &&
    matchesField(hour, date.getUTCHours(), 0, 23) &&
    matchesField(dayOfMonth, date.getUTCDate(), 1, 31) &&
    matchesField(month, date.getUTCMonth() + 1, 1, 12) &&
    matchesField(dayOfWeek, date.getUTCDay(), 0, 6)
  );
}

export function getNextCronDate(cronExpression: string, fromDate: Date = new Date()): Date {
  const nextMinute = new Date(fromDate.getTime());
  nextMinute.setUTCSeconds(0, 0);
  nextMinute.setUTCMinutes(nextMinute.getUTCMinutes() + 1);

  const maxSearchMinutes = 366 * 24 * 60;
  for (let offset = 0; offset < maxSearchMinutes; offset += 1) {
    if (matchesCronSchedule(cronExpression, nextMinute)) {
      return nextMinute;
    }
    nextMinute.setUTCMinutes(nextMinute.getUTCMinutes() + 1);
  }

  return new Date(fromDate.getTime() + 60 * 60 * 1000);
}

export function getPreviousCronDate(cronExpression: string, fromDate: Date = new Date()): Date {
  const prevMinute = new Date(fromDate.getTime());
  prevMinute.setUTCSeconds(0, 0);
  prevMinute.setUTCMinutes(prevMinute.getUTCMinutes() - 1);

  const maxSearchMinutes = 366 * 24 * 60;
  for (let offset = 0; offset < maxSearchMinutes; offset += 1) {
    if (matchesCronSchedule(cronExpression, prevMinute)) {
      return prevMinute;
    }
    prevMinute.setUTCMinutes(prevMinute.getUTCMinutes() - 1);
  }

  return new Date(fromDate.getTime() - 60 * 60 * 1000);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJobDetail(value: unknown): JobDetailItem {
  if (!isRecord(value) || typeof value.jobName !== 'string') {
    throw new ApiError('Invalid job detail payload', 502);
  }
  return {
    jobName: value.jobName,
    title: typeof value.title === 'string' ? value.title : value.jobName,
    description: typeof value.description === 'string' ? value.description : '',
    schedule: typeof value.schedule === 'string' ? value.schedule : '',
    status: typeof value.status === 'string' ? value.status : 'idle',
    lastRun: typeof value.lastRun === 'string' ? value.lastRun : null,
    nextRun: typeof value.nextRun === 'string' ? value.nextRun : null,
  };
}

export function formatRelativeTime(dateString: string | null | undefined, now: Date = new Date()): string {
  if (!dateString) return 'Pending sync';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Pending sync';

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'just now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatCountdown(targetString: string | null | undefined, now: Date = new Date()): string {
  if (!targetString) return 'soon';
  const target = new Date(targetString);
  if (Number.isNaN(target.getTime())) return 'soon';

  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'due now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `in <1m`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `in ~${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  if (diffHours < 24) {
    return remMin > 0 ? `in ~${diffHours}h ${remMin}m` : `in ~${diffHours}h`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `in ~${diffDays}d`;
}

/** Direct database fallback query when web API server is offline or unreachable */
async function fetchFreshnessDirectFromSupabase(page: string): Promise<FreshnessData> {
  const targetJobNames = PAGE_JOB_MAPPING[page] || PAGE_JOB_MAPPING.matches;
  const supabase = getSupabaseClient();

  const { data: dbLogs } = await supabase
    .from('job_execution_log')
    .select('job_name, status, started_at, completed_at')
    .in('job_name', targetJobNames)
    .order('started_at', { ascending: false })
    .limit(30);

  const now = new Date();
  let latestUpdatedDate: Date | null = null;
  let nextScheduledRun: Date | null = null;
  let mostFrequentJobName = targetJobNames[0];

  const jobsList: JobDetailItem[] = [];

  for (const jobName of targetJobNames) {
    const meta = JOB_METADATA[jobName] || {
      title: jobName,
      desc: 'Automated background task',
      schedule: '0 * * * *',
    };

    const recentRun = (dbLogs ?? []).find((log: { job_name: string }) => log.job_name === jobName);

    let jobLastRun: string | null = null;
    const completedAtStr = recentRun?.completed_at || recentRun?.started_at;
    if (completedAtStr) {
      const completedDate = new Date(completedAtStr);
      jobLastRun = completedDate.toISOString();
    } else {
      try {
        const prevDate = getPreviousCronDate(meta.schedule, now);
        jobLastRun = prevDate.toISOString();
      } catch {
        // ignore
      }
    }

    if (jobLastRun) {
      const runDate = new Date(jobLastRun);
      if (!latestUpdatedDate || runDate.getTime() > latestUpdatedDate.getTime()) {
        latestUpdatedDate = runDate;
      }
    }

    let jobNextRun: string | null = null;
    try {
      const nextDate = getNextCronDate(meta.schedule, now);
      jobNextRun = nextDate.toISOString();
      if (!nextScheduledRun || nextDate.getTime() < nextScheduledRun.getTime()) {
        nextScheduledRun = nextDate;
        mostFrequentJobName = jobName;
      }
    } catch {
      // ignore
    }

    jobsList.push({
      jobName,
      title: meta.title,
      description: meta.desc,
      schedule: meta.schedule,
      status: recentRun?.status || 'idle',
      lastRun: jobLastRun,
      nextRun: jobNextRun,
    });
  }

  return {
    success: true,
    page,
    lastUpdated: latestUpdatedDate ? latestUpdatedDate.toISOString() : null,
    nextUpdate: nextScheduledRun ? nextScheduledRun.toISOString() : null,
    jobName: mostFrequentJobName,
    serverTime: now.toISOString(),
    jobs: jobsList,
  };
}

export async function fetchDataFreshness(page: string): Promise<FreshnessData> {
  // First attempt web API route if endpoint is available
  try {
    let baseUrl: string;
    try {
      baseUrl = getWebBaseUrl();
    } catch {
      baseUrl = 'http://localhost:3000';
    }

    const endpoint = `${baseUrl}/api/data/freshness?page=${encodeURIComponent(page)}`;
    const headers: Record<string, string> = { Accept: 'application/json' };

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch {
      // ignore
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data: unknown = await response.json();
      if (isRecord(data) && data.success) {
        const jobsRaw = Array.isArray(data.jobs) ? data.jobs : [];
        return {
          success: true,
          page: typeof data.page === 'string' ? data.page : page,
          lastUpdated: typeof data.lastUpdated === 'string' ? data.lastUpdated : null,
          nextUpdate: typeof data.nextUpdate === 'string' ? data.nextUpdate : null,
          jobName: typeof data.jobName === 'string' ? data.jobName : undefined,
          serverTime: typeof data.serverTime === 'string' ? data.serverTime : new Date().toISOString(),
          jobs: jobsRaw.map(parseJobDetail),
        };
      }
    }
  } catch {
    // Web endpoint offline or unreachable; fall through to direct Supabase query
  }

  // Direct Supabase query fallback (independent of web server running)
  return fetchFreshnessDirectFromSupabase(page);
}
