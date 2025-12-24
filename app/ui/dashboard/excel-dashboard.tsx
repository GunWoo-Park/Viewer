// app/ui/dashboard/excel-dashboard.tsx
import { getExcelSheetsData } from '@/app/lib/excel-loader';
import { lusitana } from '@/app/ui/fonts';
// Recharts를 사용하는 것을 권장합니다 (pnpm add recharts)

export default async function ExcelDashboard() {
  const sheets = await getExcelSheetsData('G.BTB_20251222.xlsx'); //

  if (!sheets) return <div>데이터 파일을 찾을 수 없습니다.</div>;

  // 예: 첫 번째 시트의 데이터를 차트용 데이터로 사용
  const chartData = sheets[0].data;

  return (
    <div className="space-y-8">
      {sheets.map((sheet, idx) => (
        <section key={idx} className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className={`${lusitana.className} text-xl mb-4`}>
            Sheet: {sheet.name}
          </h2>

          {/* 여기에 Recharts 컴포넌트를 배치하여 데이터를 시각화 */}
          {/* 예: <MyResponsiveLine data={sheet.data} /> */}

          <div className="mt-4 overflow-x-auto">
             <p className="text-sm text-gray-500 mb-2">Total Rows: {sheet.data.length}</p>
             {/* 데이터 프리뷰 테이블 구현 */}
          </div>
        </section>
      ))}
    </div>
  );
}