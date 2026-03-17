import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { MTMGroupData } from '@/app/lib/definitions';

export async function POST(request: NextRequest) {
  try {
    const { eff_dt, curr } = await request.json();

    if (!eff_dt || !curr) {
      return NextResponse.json(
        { error: 'eff_dt, curr 파라미터 필요' },
        { status: 400 },
      );
    }

    // 동일 eff_dt + curr 그룹 종목 조회 (자체발행 제외)
    const productsResult = await sql`
      SELECT obj_cd, tp, notn, cntr_nm
      FROM strucprdp
      WHERE eff_dt = ${eff_dt}
        AND curr = ${curr}
        AND fnd_cd = '10206020'
        AND (call_yn = 'N' OR call_yn IS NULL)
        AND tp != '자체발행'
      ORDER BY
        CASE tp WHEN '자산' THEN 1 WHEN 'MTM' THEN 2 WHEN '캐리' THEN 3 ELSE 4 END,
        obj_cd
    `;

    if (productsResult.rows.length === 0) {
      return NextResponse.json(
        { error: '해당 그룹에 종목이 없습니다' },
        { status: 404 },
      );
    }

    const objCodes = productsResult.rows.map((r) => String(r.obj_cd));

    // breakdownprc에서 tp별 가격 시계열 조회
    // @vercel/postgres는 ANY(${array})를 지원하므로 사용
    const bdResult = await sql`
      SELECT obj_cd, tp, std_dt, avg_prc
      FROM breakdownprc
      WHERE obj_cd = ANY(${objCodes as string[]})
      ORDER BY std_dt ASC, obj_cd, tp
    `;

    // obj_cd별 시계열 맵 생성 (tp별 합산 — breakdownprc의 자산+MTM = PnL 가격 부분)
    const prcMap = new Map<string, { std_dt: string; avg_prc: number }[]>();
    for (const row of bdResult.rows) {
      const objCd = row.obj_cd as string;
      if (!prcMap.has(objCd)) prcMap.set(objCd, []);
      prcMap.get(objCd)!.push({
        std_dt: row.std_dt as string,
        avg_prc: Number(row.avg_prc),
      });
    }

    // excpnp 쿠폰 데이터 조회 (해당 그룹 종목)
    const couponResult = await sql`
      SELECT obj_cd, pay_dt, tp, amt
      FROM excpnp
      WHERE obj_cd = ANY(${objCodes as string[]})
      ORDER BY pay_dt ASC
    `;

    const coupon_events = couponResult.rows.map((r) => ({
      pay_dt: String(r.pay_dt),
      obj_cd: String(r.obj_cd),
      tp: String(r.tp),
      amt: Number(r.amt),
    }));

    // 상품별 데이터 구성 (breakdownprc 기반)
    const products = productsResult.rows.map((row) => ({
      obj_cd: String(row.obj_cd),
      tp: String(row.tp),
      notn: Number(row.notn),
      cntr_nm: String(row.cntr_nm),
      mtm_data: prcMap.get(String(row.obj_cd)) || [],
    }));

    // 합산 시계열: 날짜별 전체 가격(breakdownprc) 합 + 해당 날짜까지의 누적 쿠폰
    // 1) 날짜별 가격 합산
    const datePrcMap = new Map<string, number>();
    for (const product of products) {
      for (const d of product.mtm_data) {
        datePrcMap.set(d.std_dt, (datePrcMap.get(d.std_dt) || 0) + d.avg_prc);
      }
    }

    // 2) 쿠폰 누적 계산 (pay_dt 기준, 해당 날짜 이전 쿠폰 합)
    const sortedDates = Array.from(datePrcMap.keys()).sort();
    const couponByDate = new Map<string, number>();
    let cumCoupon = 0;
    let couponIdx = 0;
    const sortedCoupons = [...coupon_events].sort((a, b) =>
      a.pay_dt.localeCompare(b.pay_dt),
    );

    for (const dt of sortedDates) {
      // 이 날짜 이전(포함)의 쿠폰 누적
      while (couponIdx < sortedCoupons.length && sortedCoupons[couponIdx].pay_dt <= dt) {
        cumCoupon += sortedCoupons[couponIdx].amt;
        couponIdx++;
      }
      couponByDate.set(dt, cumCoupon);
    }

    // 3) PnL = 가격(breakdownprc) + 누적쿠폰(excpnp)
    const combined_mtm = sortedDates.map((std_dt) => ({
      std_dt,
      avg_prc: (datePrcMap.get(std_dt) || 0) + (couponByDate.get(std_dt) || 0),
    }));

    const response: MTMGroupData = {
      eff_dt,
      curr,
      products,
      combined_mtm,
      coupon_events,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('PnL 시계열 조회 오류:', error);
    return NextResponse.json(
      { error: 'PnL 데이터 조회 실패' },
      { status: 500 },
    );
  }
}
