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

    return NextResponse.json({
      obj_cd: String(info.obj_cd),
      cntr_nm: String(info.cntr_nm),
      curr: String(info.curr),
      notn: Number(info.notn),
      mtm_series: mtmResult.rows.map((r) => ({
        std_dt: String(r.std_dt),
        kis_prc: Number(r.kis_prc),
        kap_prc: Number(r.kap_prc),
        avg_prc: Number(r.avg_prc),
      })),
      coupons: couponResult.rows.map((r) => ({
        pay_dt: String(r.pay_dt),
        tp: String(r.tp),
        curr: String(r.curr),
        amt: Number(r.amt),
      })),
    });
  } catch (error) {
    console.error('PnL Detail API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
