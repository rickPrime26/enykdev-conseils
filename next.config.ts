import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// The plugin tells Next.js where the request config lives. Without it,
// getRequestConfig is never called and every t() throws at render time.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Bundles a minimal server into .next/standalone, so the Docker image can
  // run the app without node_modules. Set when we dockerised the web service.
  output: 'standalone',
};

export default withNextIntl(nextConfig);
