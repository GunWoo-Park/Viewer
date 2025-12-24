// app/lib/excel-loader.ts
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export async function getExcelSheetsData(fileName: string) {
  // 프로젝트 내 dashboard 폴더 경로 설정
  const filePath = path.join(process.cwd(), 'app/ui/dashboard', fileName);

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // 모든 시트의 데이터를 객체 형태로 추출
    const allSheetsData = workbook.SheetNames.map(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      return {
        name: sheetName,
        data: XLSX.utils.sheet_to_json(worksheet)
      };
    });

    return allSheetsData;
  } catch (error) {
    console.error("Excel Load Error:", error);
    return null;
  }
}