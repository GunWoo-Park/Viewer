import { Inter, Lusitana } from 'next/font/google';

export const inter = Inter({ subsets: ['latin'] });
export const lusitana = Lusitana({
  weight: ["400", "700"],
  subsets: ['latin'],
});

// 시스템 모노스페이스 폰트 사용 (Google Fonts 네트워크 의존성 제거)
// CSS variable로 등록하여 font-trading 클래스에서 사용
export const robotoMono = {
  variable: '--font-roboto-mono',
  className: '', // 시스템 폰트이므로 className 불필요
};
