import { api, ApiError, setAuthToken, setUnauthorizedHandler } from './api';

function mockFetchOnce(body: unknown, status = 200) {
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
    status,
    json: () => Promise.resolve(body),
  });
}

describe('api client', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    setAuthToken(null);
  });

  it('unwraps the data of an ok envelope', async () => {
    mockFetchOnce({ ok: true, data: { status: 'ok' } });

    const data = await api<{ status: string }>('/api/health');
    expect(data).toEqual({ status: 'ok' });
  });

  it('throws ApiError with the envelope code and message on failure', async () => {
    mockFetchOnce({ ok: false, error: { code: 'CONFLICT', message: 'taken' } }, 409);

    await expect(api('/api/auth/register', { method: 'POST' })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'CONFLICT',
      message: 'taken',
      status: 409,
    });
  });

  it('throws INTERNAL_ERROR when the response is not JSON', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      status: 502,
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(api('/api/health')).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('sends the bearer token once set and stops after clearing it', async () => {
    setAuthToken('token-123');
    mockFetchOnce({ ok: true, data: {} });
    await api('/api/users/me');

    let [, options] = (globalThis.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer token-123');

    setAuthToken(null);
    mockFetchOnce({ ok: true, data: {} });
    await api('/api/health');

    [, options] = (globalThis.fetch as jest.Mock).mock.calls[1] as [string, RequestInit];
    expect((options.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('does not set Content-Type for FormData bodies', async () => {
    mockFetchOnce({ ok: true, data: {} });
    const formData = new FormData();
    await api('/api/measurements/photos', { method: 'POST', body: formData });

    const [, options] = (globalThis.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(options.body).toBe(formData);
  });

  it('fires the unauthorized handler on a session 401, but not for auth endpoints', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    const unauthorized = { ok: false, error: { code: 'UNAUTHORIZED', message: 'expired' } };

    // Dead session token on an authenticated route → handler fires.
    setAuthToken('stale-token');
    mockFetchOnce(unauthorized, 401);
    await expect(api('/api/goals')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    // Wrong credentials on /api/auth/* → the handler must NOT fire.
    mockFetchOnce(unauthorized, 401);
    await expect(api('/api/auth/login', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    // No token set (already signed out) → nothing to invalidate.
    setAuthToken(null);
    mockFetchOnce(unauthorized, 401);
    await expect(api('/api/goals')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    setUnauthorizedHandler(null);
  });

  it('exposes ApiError as an Error subclass', () => {
    const error = new ApiError('NOT_FOUND', 'missing', 404);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('NOT_FOUND');
  });
});
