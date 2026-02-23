'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 하이드레이션 불일치 방지
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-[36px] w-[36px]" />;

  const modes = [
    { key: 'dark', icon: MoonIcon, label: '다크' },
    { key: 'light', icon: SunIcon, label: '라이트' },
    { key: 'system', icon: ComputerDesktopIcon, label: '시스템' },
  ] as const;

  const currentIndex = modes.findIndex((m) => m.key === theme);
  const next = modes[(currentIndex + 1) % modes.length];
  const Current = modes[currentIndex >= 0 ? currentIndex : 0].icon;

  return (
    <button
      onClick={() => setTheme(next.key)}
      className="flex h-[36px] w-[36px] items-center justify-center rounded-md
        bg-gray-50 dark:bg-gray-700 hover:bg-sky-100 dark:hover:bg-gray-600
        text-gray-600 dark:text-gray-300 transition-colors"
      title={`현재: ${modes[currentIndex >= 0 ? currentIndex : 0].label} → ${next.label} 모드로 전환`}
    >
      <Current className="w-5 h-5" />
    </button>
  );
}
