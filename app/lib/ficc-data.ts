// app/lib/ficc-data.ts
import { formatCurrency } from './utils';

// FICC 시장 데이터 타입 정의
export type MarketIndex = {
  name: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
};

export type AlgoSignal = {
  id: string;
  strategy: string; // 예: 'Mean Reversion', 'Trend Following'
  asset: string;    // 예: 'KTB 3Y', 'USD/KRW'
  action: 'BUY' | 'SELL';
  price: string;
  timestamp: string;
  status: 'executing' | 'completed' | 'pending';
};

// 가상 시장 데이터 (카드용)
export async function fetchMarketIndices() {
  // 실제로는 API 호출 (e.g., Bloomberg, Yonhap Infomax API)
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 지연 시뮬레이션

  const indices: MarketIndex[] = [
    { name: 'USD/KRW', value: '1,324.50', change: '+5.20', trend: 'up' },
    { name: 'KTB 3Y', value: '3.450%', change: '-0.020', trend: 'down' },
    { name: 'KTB 10Y', value: '3.520%', change: '-0.015', trend: 'down' },
    { name: 'KOSPI', value: '2,650.12', change: '+12.45', trend: 'up' },
  ];
  return indices;
}

// 가상 알고리즘 매매 신호 (리스트용)
export async function fetchAlgoSignals() {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const signals: AlgoSignal[] = [
    { id: '1', strategy: 'Trend Following', asset: 'USD/KRW Futures', action: 'BUY', price: '1,325.00', timestamp: '14:30:05', status: 'completed' },
    { id: '2', strategy: 'Mean Reversion', asset: 'KTB 10Y Futures', action: 'SELL', price: '112.45', timestamp: '14:28:12', status: 'executing' },
    { id: '3', strategy: 'Stat Arb', asset: 'KOSPI 200', action: 'BUY', price: '355.20', timestamp: '14:15:00', status: 'completed' },
    { id: '4', strategy: 'Liquidity Prov', asset: 'CD 91d', action: 'BUY', price: '3.65%', timestamp: '13:50:22', status: 'pending' },
    { id: '5', strategy: 'FX Arbitrage', asset: 'JPY/KRW', action: 'SELL', price: '9.02', timestamp: '13:45:10', status: 'completed' },
  ];
  return signals;
}