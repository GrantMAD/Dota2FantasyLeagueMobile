import { getIssueReports, submitIssueReport } from '../src/features/issue-reports/api';

const mockGetSession = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockUpload = jest.fn();
const mockCreateSignedUrl = jest.fn();
const mockRemove = jest.fn();
const mockFetch = jest.fn();
const originalFetch = globalThis.fetch;

const report = {
  id: 42,
  user_id: 'user-123',
  title: 'Button does not save',
  category: 'bug',
  severity: 'medium',
  description: 'Pressing the save button does not save the changes.',
  page_url: '/settings',
  screenshot_path: null,
  status: 'new',
  resolution_note: null,
  created_at: '2026-10-26T10:00:00.000Z',
  updated_at: '2026-10-26T10:00:00.000Z',
};

function makeQuery(result: { data: unknown; error: null | { message: string } }) {
  const query: Record<string, jest.Mock | ((resolve: (value: unknown) => unknown) => unknown)> = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'in']) {
    query[method] = jest.fn(() => query);
  }
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return query;
}

jest.mock('../src/lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: { getSession: mockGetSession },
    from: mockFrom,
    rpc: mockRpc,
    storage: {
      from: () => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove,
      }),
    },
  }),
}));

describe('mobile issue reporting API', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' }, access_token: 'test-access-token' } },
      error: null,
    });
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockUpload.mockReset().mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockReset().mockResolvedValue({ data: { signedUrl: 'https://storage.example.test/signed' }, error: null });
    mockRemove.mockReset().mockResolvedValue({ error: null });
    mockFetch.mockReset();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('loads the signed-in manager reports and status history directly from Supabase', async () => {
    const reportQuery = makeQuery({ data: [report], error: null });
    const historyQuery = makeQuery({
      data: [{
        id: 5,
        issue_report_id: 42,
        old_status: null,
        new_status: 'new',
        resolution_note: null,
        created_at: '2026-10-26T10:00:00.000Z',
      }],
      error: null,
    });
    mockFrom.mockReturnValueOnce(reportQuery).mockReturnValueOnce(historyQuery);

    await expect(getIssueReports(42)).resolves.toMatchObject({
      reports: [{ id: 42, status: 'new', screenshot_url: null, severity: 'medium' }],
      history: [{ issue_report_id: 42, new_status: 'new' }],
    });
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'issue_reports');
    expect(reportQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(reportQuery.eq).toHaveBeenCalledWith('id', 42);
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'issue_report_status_history');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('submits a validated report through the authenticated Supabase RPC', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { ...report, category: 'feature_request', severity: 'high' },
      error: null,
    });

    await expect(submitIssueReport({
      title: report.title,
      category: 'feature_request',
      severity: 'high',
      description: report.description,
      pageUrl: report.page_url,
    })).resolves.toMatchObject({ id: 42, status: 'new', category: 'feature_request', severity: 'high' });

    expect(mockRpc).toHaveBeenCalledWith('mobile_create_issue_report', {
      p_title: report.title,
      p_category: 'feature_request',
      p_severity: 'high',
      p_description: report.description,
      p_page_url: '/settings',
      p_screenshot_path: null,
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('uploads a validated screenshot directly to private Supabase Storage', async () => {
    const screenshotBytes = new Uint8Array([0xff, 0xd8, 0xff, 0]).buffer;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => screenshotBytes,
    });
    mockRpc.mockImplementationOnce(async (_name: string, args: { p_screenshot_path: string }) => ({
      data: { ...report, screenshot_path: args.p_screenshot_path },
      error: null,
    }));

    await expect(submitIssueReport({
      title: report.title,
      category: 'bug',
      severity: 'medium',
      description: report.description,
      pageUrl: report.page_url,
      screenshot: {
        uri: 'file:///screenshot.jpg',
        name: 'screenshot.jpg',
        mimeType: 'image/jpeg',
        size: screenshotBytes.byteLength,
      },
    })).resolves.toMatchObject({ id: 42, screenshot_url: 'https://storage.example.test/signed' });

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-123\/\d+-[a-z0-9]+\.jpg$/),
      screenshotBytes,
      expect.objectContaining({ contentType: 'image/jpeg', upsert: false }),
    );
    expect(mockRpc).toHaveBeenCalledWith('mobile_create_issue_report', expect.objectContaining({
      p_screenshot_path: expect.stringMatching(/^user-123\/\d+-[a-z0-9]+\.jpg$/),
    }));
    expect(mockCreateSignedUrl).toHaveBeenCalledWith(expect.any(String), 60 * 60);
  });

  it('removes an uploaded screenshot when report creation fails', async () => {
    const screenshotBytes = new Uint8Array([0xff, 0xd8, 0xff]).buffer;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => screenshotBytes,
    });
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'You have reached the issue report limit.' } });

    await expect(submitIssueReport({
      title: report.title,
      category: 'bug',
      severity: 'medium',
      description: report.description,
      pageUrl: report.page_url,
      screenshot: {
        uri: 'file:///screenshot.jpg',
        name: 'screenshot.jpg',
        mimeType: 'image/jpeg',
        size: screenshotBytes.byteLength,
      },
    })).rejects.toThrow('You have reached the issue report limit.');
    expect(mockRemove).toHaveBeenCalledWith([expect.stringMatching(/^user-123\//)]);
  });

  it('rejects invalid report input before sending requests', async () => {
    await expect(submitIssueReport({
      title: 'Bad',
      category: 'bug',
      severity: 'medium',
      description: 'Description long enough.',
      pageUrl: '/settings',
    })).rejects.toThrow('Title must be between 5 and 120 characters.');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects invalid impact levels before sending requests', async () => {
    await expect(submitIssueReport({
      title: report.title,
      category: 'performance',
      severity: 'urgent' as Parameters<typeof submitIssueReport>[0]['severity'],
      description: report.description,
      pageUrl: '/settings',
    })).rejects.toThrow('Choose a valid impact level.');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects screenshots whose bytes do not match the selected image type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    await expect(submitIssueReport({
      title: report.title,
      category: 'bug',
      severity: 'medium',
      description: report.description,
      pageUrl: '/settings',
      screenshot: {
        uri: 'file:///screenshot.jpg',
        name: 'screenshot.jpg',
        mimeType: 'image/jpeg',
        size: 3,
      },
    })).rejects.toThrow('The selected screenshot is not a valid JPEG, PNG, or WebP image.');
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('surfaces invalid rows and database read errors', async () => {
    mockFrom.mockReturnValueOnce(makeQuery({ data: [{ ...report, status: 'unknown' }], error: null }));
    await expect(getIssueReports()).rejects.toThrow('Issue report data was returned in an unexpected format.');

    mockFrom.mockReturnValueOnce(makeQuery({ data: null, error: { message: 'permission denied' } }));
    await expect(getIssueReports()).rejects.toThrow('Unable to load issue reports: permission denied');
  });
});
