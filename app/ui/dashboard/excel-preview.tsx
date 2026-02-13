// app/ui/dashboard/excel-preview.tsx
'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { lusitana } from '@/app/ui/fonts';
import { Button } from '@/app/ui/button';

export default function ExcelPreview() {
  const [data, setData] = useState<any[]>([]);
  const [columnNames, setColumnNames] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0]; // 첫 번째 시트 선택
      const ws = wb.Sheets[wsname];

      // 엑셀 내용을 JSON 배열로 변환
      const json = XLSX.utils.sheet_to_json(ws);

      if (json.length > 0) {
        setData(json);
        // 첫 번째 행의 키값들을 추출하여 컬럼명 설정
        setColumnNames(Object.keys(json[0] as object));
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="mt-6 w-full overflow-hidden">
      <div className="flex flex-col gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <h2 className={`${lusitana.className} text-xl`}>Excel Quick Viewer</h2>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
        />
        <p className="text-xs text-gray-400">* 데이터는 DB에 저장되지 않으며 새로고침 시 초기화됩니다.</p>
      </div>

      {data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 bg-white text-sm text-left">
            <thead className="bg-gray-100">
              <tr>
                {columnNames.map((col) => (
                  <th key={col} className="px-4 py-3 font-semibold text-gray-900 capitalize">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  {columnNames.map((col) => (
                    <td key={col} className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {row[col]?.toString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}