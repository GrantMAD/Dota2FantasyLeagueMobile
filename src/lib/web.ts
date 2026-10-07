export function getWebBaseUrl(): string {
  const baseUrl = (
    process.env.EXPO_PUBLIC_WEB_URL?.trim() ||
    process.env.EXPO_PUBLIC_API_URL?.trim()
  );
  if (!baseUrl) {
    throw new Error('Website configuration is missing. Set EXPO_PUBLIC_WEB_URL.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error('EXPO_PUBLIC_WEB_URL must be a valid absolute URL.');
  }

  const host = parsedUrl.hostname;
  const isPrivateIpv4 =
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host);
  const isLocalHost = ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(host) ||
    host.endsWith('.local') ||
    isPrivateIpv4;
  const isLocalDevelopment = __DEV__ && parsedUrl.protocol === 'http:' && isLocalHost;

  if (
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash ||
    parsedUrl.pathname !== '/'
  ) {
    throw new Error('EXPO_PUBLIC_WEB_URL must be a website origin without credentials, path, query, or fragment.');
  }
  if (parsedUrl.protocol !== 'https:' && !isLocalDevelopment) {
    throw new Error('The website must use HTTPS outside local development.');
  }

  return parsedUrl.toString().replace(/\/+$/, '');
}
