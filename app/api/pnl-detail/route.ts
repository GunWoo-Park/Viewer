// PnL 상세 조회 API — 종목별 KIS/KAP 가격 시계열 + 쿠폰 내역
// USD 종목: 각 날짜별 -1영업일 MAR로 나눠서 달러 기준 변환
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { obj_cd } = await request.json();

    if (!obj_cd) {
      return NextResponse.json({ error: 'obj_cd is required' }, { status: 400 });
    }

    // 종목 기본정보
    const infoResult = await sql`
      SELECT obj_cd, cntr_nm, curr, notn
      FROM strucprdp
      WHERE obj_cd = ${obj_cd}
      LIMIT 1
    `;

    if (infoResult.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const info = infoResult.rows[0];
    const curr = String(info.curr);

    // breakdownprc 시계열 — 전체 TP(자산/MTM/캐리) 합산
    const mtmResult = await sql`
      SELECT std_dt,
             SUM(kis_prc) AS kis_prc,
             SUM(kap_prc) AS kap_prc,
             SUM(avg_prc) AS avg_prc
      FROM breakdownprc
      WHERE obj_cd = ${obj_cd}
      GROUP BY std_dt
      ORDER BY std_dt ASC
    `;

    // excpnp 쿠폰 내역
    const couponResult = await sql`
      SELECT pay_dt, tp, curr, amt
      FROM excpnp
      WHERE obj_cd = ${obj_cd}
      ORDER BY pay_dt DESC
    `;

    // USD 종목: 날짜별 MAR 환율 조회 (각 날짜의 -1영업일 MAR)
    let marByDate: Record<string, number> = {};
    let latestMar = 0;

    if (curr === 'USD') {
      // 전체 MAR 시계열 가져오기
      const marAll = await sql`
        SELECT std_dt, clprc_val FROM eq_unasp
        WHERE unas_id = 'USD/KRW_MAR'
        ORDER BY std_dt ASC
      `;

      const marDates: string[] = [];
      const marValues: Record<string, number> = {};
      for (const r of marAll.rows) {
        const dt = String(r.std_dt);
        marDates.push(dt);
        marValues[dt] = Number(r.clprc_val);
      }

      // 각 시계열 날짜에 대해 -1영업일 MAR 매핑
      const allDatesSet = new Set<string>();
      for (const r of mtmResult.rows) allDatesSet.add(String(r.std_dt));
      for (const r of couponResult.rows) allDatesSet.add(String(r.pay_dt));
      const allDates = Array.from(allDatesSet);

      for (const targetDate of allDates) {
        // targetDate보다 작은 가장 큰 MAR 날짜
        let prevBizMar = 0;
        for (let i = marDates.length - 1; i >= 0; i--) {
          if (marDates[i] < targetDate) {
            prevBizMar = marValues[marDates[i]];
            break;
          }
        }
        if (prevBizMar > 0) {
          marByDate[targetDate] = prevBizMar;
        }
      }

      // 최근일 MAR (모달 헤더에 표시용)
      if (mtmResult.rows.length > 0) {
        const lastDate = String(mtmResult.rows[mtmResult.rows.length - 1].std_dt);
        latestMar = marByDate[lastDate] || 0;
      }
    }

    // 시계열 변환: USD는 해당 날짜의 -1영업일 MAR로 나눔
    const mtmSeries = mtmResult.rows.map((r: Record<string, unknown>) => {
      const stdDt = String(r.std_dt);
      const divider = (curr === 'USD' && marByDate[stdDt]) ? marByDate[stdDt] : 1;
      return {
        std_dt: stdDt,
        kis_prc: Number(r.kis_prc) / divider,
        kap_prc: Number(r.kap_prc) / divider,
        avg_prc: Number(r.avg_prc) / divider,
      };
    });

    // 쿠폰 변환: USD는 pay_dt -1영업일 MAR로 나눔
    const coupons = couponResult.rows.map((r: Record<string, unknown>) => {
      const payDt = String(r.pay_dt);
      const divider = (curr === 'USD' && marByDate[payDt]) ? marByDate[payDt] : 1;
      return {
        pay_dt: payDt,
        tp: String(r.tp),
        curr: String(r.curr),
        amt: Number(r.amt) / divider,
      };
    });

    return NextResponse.json({
      obj_cd: String(info.obj_cd),
      cntr_nm: String(info.cntr_nm),
      curr,
      notn: Number(info.notn),
      usdMarRate: latestMar,
      mtm_series: mtmSeries,
      coupons,
    });
  } catch (error) {
    console.error('PnL Detail API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
