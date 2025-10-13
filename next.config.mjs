import { execSync } from 'node:child_process';

function computeBuild() {
  try {
    const count = execSync('git rev-list --count HEAD', { stdio: ['ignore','pipe','ignore'] }).toString().trim();
    return count;
  } catch {
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7) || 'dev';
  }
}

const buildNumber = process.env.NEXT_PUBLIC_BUILD || computeBuild();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  },
  images: {
    remotePatterns: []
  },
  env: {
    NEXT_PUBLIC_BUILD: buildNumber,
    NEXT_PUBLIC_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA || ''
  }
};

export default nextConfig;
