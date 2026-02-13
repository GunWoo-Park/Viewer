// app/lib/excel-loader.ts
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export async function getExcelRawData(fileName: string) {
  const filePath = path.join(process.cwd(), 'app/ui/dashboard', fileName);

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // header: 1 옵션을 사용하여 데이터를 2차원 배열(행, 열)로 가져옵니다.
    // 이는 app.py의 pd.read_excel(header=None)과 동일한 역할을 합니다.
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    return rawData;
  } catch (error) {
    console.error("Excel Load Error:", error);
    return null;
  }
}