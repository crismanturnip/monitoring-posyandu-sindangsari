import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.PW_E2E === '1' ? '.next-playwright' : '.next',
};

export default nextConfig;
