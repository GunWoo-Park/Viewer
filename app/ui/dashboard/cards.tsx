// app/ui/dashboard/cards.tsx
import {
  BanknotesIcon,
  PresentationChartLineIcon,
  ScaleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { lusitana } from '@/app/ui/fonts';
import { fetchMarketIndices } from '@/app/lib/ficc-data'; // 위에서 만든 파일 import

const iconMap = {
  'USD/KRW': BanknotesIcon,
  'KTB 3Y': ScaleIcon,
  'KTB 10Y': ScaleIcon,
  'KOSPI': PresentationChartLineIcon,
};

export default async function CardWrapper() {
  const indices = await fetchMarketIndices();

  return (
    <>
      {indices.map((index) => {
        // 아이콘 매핑 (기본값 GlobeAltIcon)
        const Icon = iconMap[index.name as keyof typeof iconMap] || GlobeAltIcon;
        const isUp = index.trend === 'up';

        return (
          <div key={index.name} className="rounded-xl bg-gray-50 dark:bg-gray-800 p-2 shadow-sm">
            <div className="flex p-4 items-center justify-between">
              <div className="flex items-center">
                <Icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                <h3 className="ml-2 text-sm font-medium dark:text-gray-200">{index.name}</h3>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${isUp ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                {index.change}
              </span>
            </div>
            <p
              className={`${lusitana.className}
                truncate rounded-xl bg-white dark:bg-gray-900 px-4 py-8 text-center text-2xl font-bold dark:text-gray-100`}
            >
              {index.value}
            </p>
          </div>
        );
      })}
    </>
  );
}
// import {
//   BanknotesIcon,
//   ClockIcon,
//   UserGroupIcon,
//   InboxIcon,
// } from '@heroicons/react/24/outline';
// import { lusitana } from '@/app/ui/fonts';
// import { fetchCardData } from '@/app/lib/data';
//
// const iconMap = {
//   collected: BanknotesIcon,
//   customers: UserGroupIcon,
//   pending: ClockIcon,
//   invoices: InboxIcon,
// };
//
// export function Card({
//   title,
//   value,
//   type,
// }: {
//   title: string;
//   value: number | string;
//   type: 'invoices' | 'customers' | 'pending' | 'collected';
// }) {
//   const Icon = iconMap[type];
//
//   return (
//     <div className="rounded-xl bg-gray-50 p-2 shadow-sm">
//       <div className="flex p-4">
//         {Icon ? <Icon className="h-5 w-5 text-gray-700" /> : null}
//         <h3 className="ml-2 text-sm font-medium">{title}</h3>
//       </div>
//       <p
//         className={`${lusitana.className}
//           truncate rounded-xl bg-white px-4 py-8 text-center text-2xl`}
//       >
//         {value}
//       </p>
//     </div>
//   );
// }
//
// export default async function CardWrapper() {
//   const {
//     numberOfCustomers,
//     numberOfInvoices,
//     totalPaidInvoices,
//     totalPendingInvoices,
//   } = await fetchCardData();
//
//   return (
//     <>
//       <Card title="Collected" value={totalPaidInvoices} type="collected" />
//       <Card title="Pending" value={totalPendingInvoices} type="pending" />
//       <Card title="Total Invoices" value={numberOfInvoices} type="invoices" />
//       <Card
//         title="Total Customers"
//         value={numberOfCustomers}
//         type="customers"
//       />
//     </>
//   );
// }
