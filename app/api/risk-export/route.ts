// app/api/risk-export/route.ts
// RISK 탭 스왑유형별 평가내역 엑셀 다운로드 API
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tp = searchParams.get('tp'); // 'self' | 'mtm'
  const stdDt = searchParams.get('date') || '';

  if (!tp || !['self', 'mtm'].includes(tp)) {
    return NextResponse.json({ error: 'tp 파라미터 필요 (self | mtm)' }, { status: 400 });
  }

  try {
    // 대상 날짜 결정
    let targetDt = stdDt;
    if (!targetDt) {
      const dtResult = await sql`SELECT MAX(std_dt) AS dt FROM swap_prc WHERE fnd_cd = '10206020'`;
      targetDt = String(dtResult.rows[0]?.dt || '');
    }

    // 쿼리 조건
    const isSelf = tp === 'self';
    const result = isSelf
      ? await sql`
          SELECT p.obj_cd, p.cntr_nm, p.curr, p.notn, s.avg_prc, s.std_dt
          FROM strucprdp p
          JOIN swap_prc s ON s.obj_cd = p.obj_cd AND s.std_dt = ${targetDt} AND s.fnd_cd = '10206020'
          WHERE p.asst_lblt = '부채' AND p.tp = '자체발행' AND p.fnd_cd = '10206020'
            AND (p.type4 IS NULL OR p.type4 != 'Index')
            AND (p.struct_cond IS NULL OR p.struct_cond NOT ILIKE '%UST%')
            AND NOT (p.type4 = 'Floater' AND p.struct_cond ILIKE '%CD%'
                     AND p.obj_cd NOT IN ('I240521FE008', 'I230926FE005'))
            AND p.obj_cd NOT IN ('I231228FE013', 'I231228FE012')
          ORDER BY s.avg_prc ASC
        `
      : await sql`
          SELECT p.obj_cd, p.cntr_nm, p.curr, p.notn, s.avg_prc, s.std_dt
          FROM strucprdp p
          JOIN swap_prc s ON s.obj_cd = p.obj_cd AND s.std_dt = ${targetDt} AND s.fnd_cd = '10206020'
          WHERE p.tp = 'MTM' AND p.fnd_cd = '10206020'
            AND (p.call_yn = 'N' OR p.call_yn IS NULL)
          ORDER BY s.avg_prc ASC
        `;

    // 엑셀 데이터 구성
    const rows = result.rows.map((r, i) => ({
      'No': i + 1,
      'OBJ_CD': r.obj_cd,
      '거래상대방': r.cntr_nm || '-',
      '통화': r.curr || '-',
      '명목금액': Number(r.notn) || 0,
      'Swap Price': Number(r.avg_prc) || 0,
      '평가일': String(r.std_dt || ''),
    }));

    // 합계 행
    const totalNotn = rows.reduce((s, r) => s + r['명목금액'], 0);
    const totalPrc = rows.reduce((s, r) => s + r['Swap Price'], 0);
    rows.push({
      'No': 0,
      'OBJ_CD': '합계',
      '거래상대방': '',
      '통화': '',
      '명목금액': totalNotn,
      'Swap Price': totalPrc,
      '평가일': `${(totalPrc / 1e8).toFixed(1)}억`,
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // 컬럼 너비
    ws['!cols'] = [
      { wch: 5 },  // No
      { wch: 18 }, // OBJ_CD
      { wch: 28 }, // 거래상대방
      { wch: 6 },  // 통화
      { wch: 18 }, // 명목금액
      { wch: 18 }, // Swap Price
      { wch: 12 }, // 평가일
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = isSelf ? '자체발행 부채' : 'MTM헤지';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const label = isSelf ? '자체발행_부채' : 'MTM헤지';
    const filename = `${label}_${targetDt}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error('risk-export Error:', error);
    return NextResponse.json({ error: 'Export 실패' }, { status: 500 });
  }
}
