import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60;
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

interface ReportRow {
  id: number;
  title: string;
  category: IssueReportCategory;
  description: string;
  page_url: string | null;
  screenshot_path: string | null;
  status: IssueReportStatus;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseReport(value: unknown): ReportRow {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.id) ||
    typeof value.title !== 'string' ||
    !categories.includes(value.category as IssueReportCategory) ||
    typeof value.description !== 'string' ||
    !isNullableString(value.page_url) ||
    !isNullableString(value.screenshot_path) ||
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
    screenshot_path: value.screenshot_path,
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

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session?.user.id) {
    throw new ApiError('Sign in again before using issue reports.', 401);
  }
  return data.session.user.id;
}

async function withSignedScreenshot(row: ReportRow): Promise<IssueReport> {
  let screenshotUrl: string | null = null;
  if (row.screenshot_path) {
    const { data, error } = await getSupabaseClient()
      .storage
      .from('issue-report-screenshots')
      .createSignedUrl(row.screenshot_path, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) {
      throw new ApiError(`Unable to open issue report screenshot: ${error?.message ?? 'No signed URL returned.'}`, 500);
    }
    screenshotUrl = data.signedUrl;
  }
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    page_url: row.page_url,
    screenshot_url: screenshotUrl,
    status: row.status,
    resolution_note: row.resolution_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getIssueReports(reportId?: number): Promise<IssueReportPage> {
  if (reportId !== undefined && (!Number.isSafeInteger(reportId) || reportId <= 0)) {
    throw new ApiError('Report ID must be a positive integer.', 400);
  }

  const userId = await getAuthenticatedUserId();
  const supabase = getSupabaseClient();
  let reportQuery = supabase
    .from('issue_reports')
    .select('id, title, category, description, page_url, screenshot_path, status, resolution_note, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (reportId !== undefined) reportQuery = reportQuery.eq('id', reportId);
  const { data: reportData, error: reportError } = await reportQuery.limit(reportId ? 1 : 50);
  if (reportError) throw new ApiError(`Unable to load issue reports: ${reportError.message}`, 500);
  if (!Array.isArray(reportData)) {
    throw new ApiError('Issue report data was returned in an unexpected format.', 502);
  }
  const reportRows = reportData.map(parseReport);
  const reportIds = reportRows.map((report) => report.id);
  if (reportIds.length === 0) return { reports: [], history: [] };

  const { data: historyData, error: historyError } = await supabase
    .from('issue_report_status_history')
    .select('id, issue_report_id, old_status, new_status, resolution_note, created_at')
    .in('issue_report_id', reportIds)
    .order('created_at', { ascending: true });
  if (historyError) throw new ApiError(`Unable to load issue report history: ${historyError.message}`, 500);
  if (!Array.isArray(historyData)) {
    throw new ApiError('Issue report history was returned in an unexpected format.', 502);
  }

  return {
    reports: await Promise.all(reportRows.map(withSignedScreenshot)),
    history: historyData.map(parseHistoryEntry),
  };
}

function validateImageSignature(bytes: ArrayBuffer, mimeType: string): void {
  const data = new Uint8Array(bytes);
  const isJpeg = mimeType === 'image/jpeg' &&
    data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const isPng = mimeType === 'image/png' &&
    data.length >= 8 &&
    data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 &&
    data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a;
  const isWebp = mimeType === 'image/webp' &&
    data.length >= 12 &&
    data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
    data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50;
  if (!isJpeg && !isPng && !isWebp) {
    throw new ApiError('The selected screenshot is not a valid JPEG, PNG, or WebP image.', 400);
  }
}

function createScreenshotPath(userId: string, mimeType: string): string {
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
  const suffix = Math.random().toString(36).slice(2, 12);
  return `${userId}/${Date.now()}-${suffix}.${extension}`;
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

  const userId = await getAuthenticatedUserId();
  const supabase = getSupabaseClient();
  let screenshotPath: string | null = null;
  if (input.screenshot) {
    const { screenshot } = input;
    if (screenshot.size !== null && (screenshot.size <= 0 || screenshot.size > MAX_SCREENSHOT_SIZE)) {
      throw new ApiError('Screenshots must be larger than 0 bytes and 5 MB or smaller.', 400);
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(screenshot.mimeType)) {
      throw new ApiError('Choose a JPEG, PNG, or WebP screenshot.', 400);
    }

    let imageData: ArrayBuffer;
    try {
      const fileResponse = await fetch(screenshot.uri);
      if (!fileResponse.ok) {
        throw new Error(`Unable to read selected screenshot (${fileResponse.status}).`);
      }
      imageData = await fileResponse.arrayBuffer();
    } catch (error: unknown) {
      throw new ApiError(
        error instanceof Error ? `Unable to read selected screenshot: ${error.message}` : 'Unable to read selected screenshot.',
        0,
      );
    }
    if (imageData.byteLength === 0 || imageData.byteLength > MAX_SCREENSHOT_SIZE) {
      throw new ApiError('Screenshots must be larger than 0 bytes and 5 MB or smaller.', 400);
    }
    validateImageSignature(imageData, screenshot.mimeType);

    screenshotPath = createScreenshotPath(userId, screenshot.mimeType);
    const { error: uploadError } = await supabase
      .storage
      .from('issue-report-screenshots')
      .upload(screenshotPath, imageData, {
        contentType: screenshot.mimeType,
        cacheControl: '3600',
        upsert: false,
      });
    if (uploadError) {
      throw new ApiError(`Unable to upload issue report screenshot: ${uploadError.message}`, 400);
    }
  }

  const { data, error } = await supabase.rpc('mobile_create_issue_report', {
    p_title: title,
    p_category: input.category,
    p_description: description,
    p_page_url: pageUrl,
    p_screenshot_path: screenshotPath,
  });
  if (error) {
    if (screenshotPath) {
      const { error: cleanupError } = await supabase
        .storage
        .from('issue-report-screenshots')
        .remove([screenshotPath]);
      if (cleanupError) {
        console.error('Unable to remove issue report screenshot after submission failed:', cleanupError);
      }
    }
    throw new ApiError(
      `Unable to submit issue report: ${error.message}`,
      error.code === 'P0001' ? 429 : error.code === '42501' ? 401 : 400,
    );
  }

  return withSignedScreenshot(parseReport(data));
}
