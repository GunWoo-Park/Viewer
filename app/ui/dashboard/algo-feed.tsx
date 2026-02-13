// app/ui/dashboard/algo-feed.tsx
import { ArrowPathIcon, SignalIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { lusitana } from '@/app/ui/fonts';
import { fetchAlgoSignals } from '@/app/lib/ficc-data';

export default async function AlgoFeed() {
  const signals = await fetchAlgoSignals();

  return (
    <div className="flex w-full flex-col md:col-span-4">
      <h2 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Live Algo Signals
      </h2>
      <div className="flex grow flex-col justify-between rounded-xl bg-gray-50 p-4">
        <div className="bg-white px-6">
          {signals.map((signal, i) => {
            return (
              <div
                key={signal.id}
                className={clsx(
                  'flex flex-row items-center justify-between py-4',
                  {
                    'border-t': i !== 0,
                  },
                )}
              >
                <div className="flex items-center">
                  <div className="mr-4 rounded-full bg-blue-100 p-2">
                    <SignalIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold md:text-base">
                      {signal.asset}
                      <span className="ml-2 text-xs text-gray-400 font-normal">
                        ({signal.strategy})
                      </span>
                    </p>
                    <p className="hidden text-sm text-gray-500 sm:block">
                      {signal.timestamp}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                    <p
                    className={`${lusitana.className} truncate text-sm font-medium md:text-base ${signal.action === 'BUY' ? 'text-red-600' : 'text-blue-600'}`}
                    >
                    {signal.action} @ {signal.price}
                    </p>
                    <p className="text-xs text-gray-400">{signal.status}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center pb-2 pt-6">
          <ArrowPathIcon className="h-5 w-5 text-gray-500 animate-spin" />
          <h3 className="ml-2 text-sm text-gray-500 ">Real-time monitoring...</h3>
        </div>
      </div>
    </div>
  );
}