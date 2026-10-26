import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';
import { getWebBaseUrl } from '@/src/lib/web';

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;
const statuses = ['new', 'under_review', 'in_progress', 'resolved', 'closed'] as const;
const categories = ['bug', 'error', 'ui'] as const;

export type IssueReportStatus = typeof statuses[number];
export type IssueReportCategory = typeof categories[number];

export interface IssueReport {
  id: number;
  title: string;
  category: IssueReportCategory;
  description: string;
  page_url: string | null;
  screenshot_url: string | null;
  status: IssueReportStatus;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface IssueReportStatusHistory {
  id: number;
  issue_report_id: number;
  old_status: IssueReportStatus | null;
  new_status: IssueReportStatus;
  resolution_note: string | null;
  created_at: string;
}

export interface IssueReportPage {
  reports: IssueReport[];
  history: IssueReportStatusHistory[];
}

export interface IssueScreenshot {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
}

interface IssueReportSubmission {
  title: string;
  category: IssueReportCategory;
  description: string;
  pageUrl: string;
  screenshot?: IssueScreenshot | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseReport(value: unknown): IssueReport {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.id) ||
    typeof value.title !== 'string' ||
    !categories.includes(value.category as IssueReportCategory) ||
    typeof value.description !== 'string' ||
    !isNullableString(value.page_url) ||
    !isNullableString(value.screenshot_url) ||
    !statuses.includes(value.status as IssueReportStatus) ||
    !isNullableString(value.resolution_note) ||
    typeof value.created_at !== 'string' ||
    typeof value.updated_at !== 'string'
  ) {
    throw new ApiError('Issue report data was returned in an unexpected format.', 502);
  }
  return {
    id: Number(value.id),
    title: value.title,
    category: value.category as IssueReportCategory,
    description: value.description,
    page_url: value.page_url,
    screenshot_url: value.screenshot_url,
    status: value.status as IssueReportStatus,
    resolution_note: value.resolution_note,
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
}

function parseHistoryEntry(value: unknown): IssueReportStatusHistory {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.id) ||
    !Number.isSafeInteger(value.issue_report_id) ||
    !(value.old_status === null || statuses.includes(value.old_status as IssueReportStatus)) ||
    !statuses.includes(value.new_status as IssueReportStatus) ||
    !isNullableString(value.resolution_note) ||
    typeof value.created_at !== 'string'
  ) {
    throw new ApiError('Issue report history was returned in an unexpected format.', 502);
  }
  return {
    id: Number(value.id),
    issue_report_id: Number(value.issue_report_id),
    old_status: value.old_status as IssueReportStatus | null,
    new_status: value.new_status as IssueReportStatus,
    resolution_note: value.resolution_note,
    created_at: value.created_at,
  };
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ApiError('Sign in again before using issue reports.', 401);
  }
  return data.session.access_token;
}

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(`The issue report service returned an invalid response (${response.status}).`, 502);
  }
  if (!isRecord(data)) {
    throw new ApiError('The issue report service returned an unexpected response.', 502);
  }
  if (!response.ok) {
    throw new ApiError(
      typeof data.error === 'string' ? data.error : 'The issue report request failed.',
      response.status,
    );
  }
  return data;
}

export async function getIssueReports(reportId?: number): Promise<IssueReportPage> {
  if (reportId !== undefined && (!Number.isSafeInteger(reportId) || reportId <= 0)) {
    throw new ApiError('Report ID must be a positive integer.', 400);
  }
  const params = new URLSearchParams();
  if (reportId !== undefined) params.set('reportId', String(reportId));
  const suffix = params.size ? `?${params.toString()}` : '';
  const response = await fetch(`${getWebBaseUrl()}/api/issue-reports${suffix}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${await getAccessToken()}`,
    },
    cache: 'no-store',
  });
  const data = await parseResponse(response);
  if (!Array.isArray(data.reports) || !Array.isArray(data.history)) {
    throw new ApiError('Issue report data was returned in an unexpected format.', 502);
  }
  return {
    reports: data.reports.map(parseReport),
    history: data.history.map(parseHistoryEntry),
  };
}

export async function submitIssueReport(input: IssueReportSubmission): Promise<IssueReport> {
  const title = input.title.trim();
  const description = input.description.trim();
  const pageUrl = input.pageUrl.trim();
  if (title.length < 5 || title.length > 120) {
    throw new ApiError('Title must be between 5 and 120 characters.', 400);
  }
  if (!categories.includes(input.category)) {
    throw new ApiError('Choose a valid report category.', 400);
  }
  if (description.length < 10 || description.length > 5000) {
    throw new ApiError('Description must be between 10 and 5,000 characters.', 400);
  }
  if (
    pageUrl.length > 500 ||
    !pageUrl.startsWith('/') ||
    pageUrl.startsWith('//') ||
    pageUrl.includes('\\') ||
    /[\u0000-\u001f]/.test(pageUrl)
  ) {
    throw new ApiError('Page URL must be a relative app path.', 400);
  }

  const form = new FormData();
  form.append('title', title);
  form.append('category', input.category);
  form.append('description', description);
  form.append('page_url', pageUrl);
  if (input.screenshot) {
    const { screenshot } = input;
    if (screenshot.size !== null && (screenshot.size <= 0 || screenshot.size > MAX_SCREENSHOT_SIZE)) {
      throw new ApiError('Screenshots must be larger than 0 bytes and 5 MB or smaller.', 400);
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(screenshot.mimeType)) {
      throw new ApiError('Choose a JPEG, PNG, or WebP screenshot.', 400);
    }
    const fileResponse = await fetch(screenshot.uri);
    if (!fileResponse.ok) throw new ApiError(`Unable to read selected screenshot (${fileResponse.status}).`, 0);
    const imageBlob = new Blob([await fileResponse.arrayBuffer()], { type: screenshot.mimeType });
    if (imageBlob.size === 0 || imageBlob.size > MAX_SCREENSHOT_SIZE) {
      throw new ApiError('Screenshots must be larger than 0 bytes and 5 MB or smaller.', 400);
    }
    form.append('screenshot', imageBlob, screenshot.name);
  }

  const response = await fetch(`${getWebBaseUrl()}/api/issue-reports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
    },
    body: form,
  });
  const data = await parseResponse(response);
  if (!data.report) throw new ApiError('The issue report was not returned after submission.', 502);
  return parseReport(data.report);
}
