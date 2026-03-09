// PnL 상세 조회 API — 종목별 KIS/KAP 가격 시계열 + 쿠폰 내역
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

    // USD 종목: 최근 기준일 -1 영업일 MAR 환율 조회
    let usdMarRate = 0;
    if (curr === 'USD') {
      // breakdownprc 최신일 기준
      const latestDt = await sql`
        SELECT DISTINCT std_dt FROM breakdownprc
        WHERE obj_cd = ${obj_cd}
        ORDER BY std_dt DESC LIMIT 1
      `;
      if (latestDt.rows.length > 0) {
        const latestDate = String(latestDt.rows[0].std_dt);
        const marResult = await sql`
          SELECT clprc_val FROM eq_unasp
          WHERE unas_id = 'USD/KRW_MAR' AND std_dt < ${latestDate}
          ORDER BY std_dt DESC LIMIT 1
        `;
        if (marResult.rows.length > 0) {
          usdMarRate = Number(marResult.rows[0].clprc_val);
        }
      }
    }

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

    // USD 종목: MAR로 나눠서 달러 기준으로 변환
    const divider = (curr === 'USD' && usdMarRate > 0) ? usdMarRate : 1;

    return NextResponse.json({
      obj_cd: String(info.obj_cd),
      cntr_nm: String(info.cntr_nm),
      curr,
      notn: Number(info.notn),
      usdMarRate,
      mtm_series: mtmResult.rows.map((r) => ({
        std_dt: String(r.std_dt),
        kis_prc: Number(r.kis_prc) / divider,
        kap_prc: Number(r.kap_prc) / divider,
        avg_prc: Number(r.avg_prc) / divider,
      })),
      coupons: couponResult.rows.map((r) => ({
        pay_dt: String(r.pay_dt),
        tp: String(r.tp),
        curr: String(r.curr),
        amt: Number(r.amt) / divider,
      })),
    });
  } catch (error) {
    console.error('PnL Detail API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
