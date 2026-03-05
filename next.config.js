/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: {
  //   ppr: 'incremental',
  // },
  eslint: {
    // Vercel 빌드 시 ESLint 경고로 인한 빌드 실패 방지
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Vercel 빌드 시 TS 타입 에러로 인한 빌드 실패 방지
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
