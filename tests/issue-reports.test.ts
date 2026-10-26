import { getIssueReports, submitIssueReport } from '../src/features/issue-reports/api';

const mockGetSession = jest.fn();
const mockFetch = jest.fn();
const originalFetch = globalThis.fetch;

jest.mock('../src/lib/supabase', () => ({
  getSupabaseClient: () => ({ auth: { getSession: mockGetSession } }),
}));

jest.mock('../src/lib/web', () => ({
  getWebBaseUrl: () => 'https://web.example.test',
}));

const report = {
  id: 42,
  title: 'Button does not save',
  category: 'bug',
  description: 'Pressing the save button does not save the changes.',
  page_url: '/settings',
  screenshot_url: null,
  status: 'new',
  resolution_note: null,
  created_at: '2026-10-26T10:00:00.000Z',
  updated_at: '2026-10-26T10:00:00.000Z',
};

describe('mobile issue reporting API', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-access-token' } },
      error: null,
    });
    mockFetch.mockReset();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('loads the manager reports and status history with bearer authentication', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        reports: [report],
        history: [{
          id: 5,
          issue_report_id: 42,
          old_status: null,
          new_status: 'new',
          resolution_note: null,
          created_at: '2026-10-26T10:00:00.000Z',
        }],
      }),
    });

    await expect(getIssueReports(42)).resolves.toMatchObject({
      reports: [{ id: 42, status: 'new' }],
      history: [{ issue_report_id: 42, new_status: 'new' }],
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://web.example.test/api/issue-reports?reportId=42',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-access-token' }),
        cache: 'no-store',
      }),
    );
  });

  it('submits a validated report through the existing authenticated API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ report, message: 'Your report was submitted.' }),
    });

    await expect(submitIssueReport({
      title: report.title,
      category: 'bug',
      description: report.description,
      pageUrl: report.page_url,
    })).resolves.toMatchObject({ id: 42, status: 'new' });

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://web.example.test/api/issue-reports');
    expect(options.method).toBe('POST');
    expect(new Headers(options.headers).get('authorization')).toBe('Bearer test-access-token');
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get('page_url')).toBe('/settings');
  });

  it('includes an optional screenshot in the multipart submission', async () => {
    const screenshotBytes = new Uint8Array([0xff, 0xd8, 0xff]).buffer;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => screenshotBytes,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ report, message: 'Your report was submitted.' }),
      });

    await submitIssueReport({
      title: report.title,
      category: 'bug',
      description: report.description,
      pageUrl: report.page_url,
      screenshot: {
        uri: 'file:///screenshot.jpg',
        name: 'screenshot.jpg',
        mimeType: 'image/jpeg',
        size: screenshotBytes.byteLength,
      },
    });

    const form = (mockFetch.mock.calls[1] as [string, RequestInit])[1].body as FormData;
    const attachedScreenshot = form.get('screenshot') as File;
    expect(attachedScreenshot.name).toBe('screenshot.jpg');
    expect(attachedScreenshot.type).toBe('image/jpeg');
  });

  it('rejects a report that fails client-side validation before sending a request', async () => {
    await expect(submitIssueReport({
      title: 'Bad',
      category: 'bug',
      description: 'Description long enough.',
      pageUrl: '/settings',
    })).rejects.toThrow('Title must be between 5 and 120 characters.');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('surfaces server rate limits and invalid response data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'You have reached the issue report limit.' }),
    });
    await expect(getIssueReports()).rejects.toThrow('You have reached the issue report limit.');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ reports: [{ ...report, status: 'unknown' }], history: [] }),
    });
    await expect(getIssueReports()).rejects.toThrow('Issue report data was returned in an unexpected format.');
  });
});
