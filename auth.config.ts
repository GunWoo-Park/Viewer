import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // 기존의 무조건 return true 부분을 지우고 아래 주석을 해제하세요.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // 로그인 안 된 사용자는 로그인 페이지로 리다이렉트
      } else if (isLoggedIn) {
        // ★ 핵심: 이미 로그인된 사용자가 로그인 페이지 등에 있으면 대시보드로 보냄
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;