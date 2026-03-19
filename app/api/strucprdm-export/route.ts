// app/api/strucprdm-export/route.ts
// 구조화 상품 목록 엑셀 다운로드 API
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as XLSX from 'xlsx';

// 스왑 유형 라벨
const TP_LABEL: Record<string, string> = {
  자산: '자산(원천)', MTM: 'MTM헤지', 캐리: '캐리연속', 자체발행: '자체발행',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const callFilter = searchParams.get('callFilter') || 'N';
  const tpFilter = searchParams.get('tpFilter') || 'ASSET';
  const query = searchParams.get('query') || '';

  try {
    const result = await sql`
      SELECT obj_cd, cntr_nm, asst_lblt, tp, curr, notn, mat_prd,
             trd_dt, eff_dt, mat_dt, call_yn, call_dt,
             type1, type2, type3, type4, struct_cond,
             pay_cond, rcv_cond
      FROM strucprdp
      WHERE fnd_cd = '10206020'
        AND (
          ${callFilter} = 'ALL'
          OR call_yn = ${callFilter}
          OR (${callFilter} = 'N' AND call_yn IS NULL)
        )
        AND (
          ${tpFilter} = 'ALL'
          OR (${tpFilter} = 'ASSET' AND tp != '자체발행')
          OR (${tpFilter} = 'SELF' AND tp = '자체발행')
        )
        AND (
          ${query} = ''
          OR obj_cd ILIKE ${`%${query}%`}
          OR cntr_nm ILIKE ${`%${query}%`}
          OR tp ILIKE ${`%${query}%`}
          OR curr ILIKE ${`%${query}%`}
        )
      ORDER BY no ASC
    `;

    const rows = result.rows.map((r, i) => {
      const structType = r.type1 || r.type4 || '';
      const subTypes = [r.type2, r.type3, r.type1 ? r.type4 : ''].filter(Boolean).join(' / ');
      const fmtDt = (d: string) => d && d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : d || '';

      return {
        'No': i + 1,
        'OBJ_CD': r.obj_cd,
        '거래상대방': r.cntr_nm || '',
        '자산/부채': r.asst_lblt || '',
        '스왑유형': TP_LABEL[r.tp] || r.tp || '',
        '통화': r.curr || '',
        '명목금액': Number(r.notn) || 0,
        '잔존만기(년)': Number(r.mat_prd) || 0,
        '거래일': fmtDt(r.trd_dt),
        '시작일': fmtDt(r.eff_dt),
        '만기일': fmtDt(r.mat_dt),
        'Call': r.call_yn || 'N',
        'Call일': fmtDt(r.call_dt),
        '구조유형': structType,
        '세부유형': subTypes,
        '구조조건': r.struct_cond || '',
        '지급조건': r.pay_cond || '',
        '수취조건': r.rcv_cond || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 18 },  // OBJ_CD
      { wch: 25 },  // 거래상대방
      { wch: 8 },   // 자산/부채
      { wch: 10 },  // 스왑유형
      { wch: 6 },   // 통화
      { wch: 18 },  // 명목금액
      { wch: 10 },  // 잔존만기
      { wch: 12 },  // 거래일
      { wch: 12 },  // 시작일
      { wch: 12 },  // 만기일
      { wch: 5 },   // Call
      { wch: 12 },  // Call일
      { wch: 16 },  // 구조유형
      { wch: 20 },  // 세부유형
      { wch: 40 },  // 구조조건
      { wch: 30 },  // 지급조건
      { wch: 30 },  // 수취조건
    ];

    const wb = XLSX.utils.book_new();
    const label = tpFilter === 'SELF' ? '자체발행' : tpFilter === 'ALL' ? '전체' : 'G.BTB';
    XLSX.utils.book_append_sheet(wb, ws, `상품목록_${label}`);

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `구조화상품_${label}_${new Date().toISOString().slice(0,10)}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error('strucprdm-export Error:', error);
    return NextResponse.json({ error: 'Export 실패' }, { status: 500 });
  }
}
