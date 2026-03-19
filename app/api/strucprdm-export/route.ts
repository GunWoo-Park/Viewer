// app/api/strucprdm-export/route.ts
// 구조화 상품 목록 엑셀 다운로드 API (Daily PnL 포함)
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as XLSX from 'xlsx';

const TP_LABEL: Record<string, string> = {
  자산: '자산(원천)', MTM: 'MTM헤지', 캐리: '캐리연속', 자체발행: '자체발행',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const callFilter = searchParams.get('callFilter') || 'N';
  const tpFilter = searchParams.get('tpFilter') || 'ASSET';
  const query = (searchParams.get('query') || '').toLowerCase();

  try {
    // 1) 상품 목록 조회 (call + tp 필터는 SQL, 텍스트 검색은 JS에서 처리)
    const result = await sql`
      SELECT obj_cd, cntr_nm, fnd_nm, asst_lblt, tp, curr, notn, mat_prd,
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
      ORDER BY no ASC
    `;

    // 텍스트 검색 필터 (JS — $, 특수문자 안전)
    let filtered = result.rows;
    if (query) {
      filtered = result.rows.filter((r) => {
        const fields = [
          r.obj_cd, r.cntr_nm, r.fnd_nm, r.struct_cond,
          r.type1, r.type2, r.type3, r.type4,
          r.tp, r.curr, r.asst_lblt,
        ];
        return fields.some((f) => f && String(f).toLowerCase().includes(query));
      });
    }

    // 2) Daily PnL 조회 (breakdownprc 가격 변동 + excpnp 쿠폰)
    const [pnlResult, couponResult] = await Promise.all([
      sql`
        WITH latest_dates AS (
          SELECT DISTINCT std_dt FROM breakdownprc
          ORDER BY std_dt DESC LIMIT 2
        ),
        today AS (
          SELECT obj_cd, SUM(avg_prc) AS prc
          FROM breakdownprc
          WHERE std_dt = (SELECT MAX(std_dt) FROM latest_dates)
          GROUP BY obj_cd
        ),
        yesterday AS (
          SELECT obj_cd, SUM(avg_prc) AS prc
          FROM breakdownprc
          WHERE std_dt = (SELECT MIN(std_dt) FROM latest_dates)
          GROUP BY obj_cd
        )
        SELECT t.obj_cd,
               t.prc AS today_prc,
               COALESCE(y.prc, 0) AS yesterday_prc,
               t.prc - COALESCE(y.prc, 0) AS daily_pnl
        FROM today t
        LEFT JOIN yesterday y ON y.obj_cd = t.obj_cd
      `,
      // T일 쿠폰 (breakdownprc 최신일 = pay_dt)
      sql`
        SELECT obj_cd, SUM(amt) AS coupon
        FROM excpnp
        WHERE pay_dt = (SELECT MAX(std_dt) FROM breakdownprc)
        GROUP BY obj_cd
      `,
    ]);

    // 쿠폰 맵
    const couponMap: Record<string, number> = {};
    for (const r of couponResult.rows) {
      couponMap[String(r.obj_cd)] = Number(r.coupon) || 0;
    }

    // PnL 맵 (가격 변동 + 쿠폰)
    const pnlMap: Record<string, { todayPrc: number; dailyPnl: number; coupon: number }> = {};
    for (const r of pnlResult.rows) {
      const objCd = String(r.obj_cd);
      const pricePnl = Number(r.daily_pnl) || 0;
      const coupon = couponMap[objCd] || 0;
      pnlMap[objCd] = {
        todayPrc: Number(r.today_prc) || 0,
        dailyPnl: pricePnl + coupon,
        coupon,
      };
    }
    // 쿠폰만 있고 breakdownprc에 없는 종목도 처리
    for (const [objCd, coupon] of Object.entries(couponMap)) {
      if (!pnlMap[objCd]) {
        pnlMap[objCd] = { todayPrc: 0, dailyPnl: coupon, coupon };
      }
    }

    // 3) 엑셀 데이터 구성
    const fmtDt = (d: string) => d && d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : d || '';

    const rows = filtered.map((r, i) => {
      const structType = r.type1 || r.type4 || '';
      const subTypes = [r.type2, r.type3, r.type1 ? r.type4 : ''].filter(Boolean).join(' / ');
      const pnl = pnlMap[r.obj_cd];

      return {
        'No': i + 1,
        'OBJ_CD': r.obj_cd,
        '거래상대방': r.cntr_nm || '',
        '자산/부채': r.asst_lblt || '',
        '스왑유형': TP_LABEL[r.tp] || r.tp || '',
        '통화': r.curr || '',
        '명목금액': Number(r.notn) || 0,
        '평가금액(원)': pnl ? pnl.todayPrc : 0,
        '쿠폰(원)': pnl ? pnl.coupon : 0,
        'Daily PnL(원)': pnl ? pnl.dailyPnl : 0,
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
      { wch: 5 },  { wch: 18 }, { wch: 25 }, { wch: 8 },  { wch: 10 },
      { wch: 6 },  { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 18 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 5 },
      { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 40 }, { wch: 30 },
      { wch: 30 },
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
