// app/lib/trading-context.tsx
// 트레이딩 터미널 글로벌 설정 컨텍스트
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type ColorMode = 'korean' | 'global';

interface TradingContextType {
  colorMode: ColorMode;
  toggleColorMode: () => void;
  isKorean: boolean;
}

const TradingContext = createContext<TradingContextType>({
  colorMode: 'korean',
  toggleColorMode: () => {},
  isKorean: true,
});

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [colorMode, setColorMode] = useState<ColorMode>('korean');

  const toggleColorMode = useCallback(() => {
    setColorMode((prev: ColorMode) => (prev === 'korean' ? 'global' : 'korean'));
  }, []);

  return (
    <TradingContext.Provider
      value={{
        colorMode,
        toggleColorMode,
        isKorean: colorMode === 'korean',
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}

export function useTradingContext() {
  return useContext(TradingContext);
}
