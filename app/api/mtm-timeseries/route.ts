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

    // breakdownprc에서 tp별·날짜별 합산 시계열 조회
    const bdResult = await sql`
      SELECT tp, std_dt, SUM(avg_prc) as total_prc
      FROM breakdownprc
      WHERE obj_cd = ANY(${objCodes as string[]})
      GROUP BY tp, std_dt
      ORDER BY std_dt ASC, tp
    `;

    // tp별 시계열 맵 생성
    const tpMap = new Map<string, { std_dt: string; avg_prc: number }[]>();
    for (const row of bdResult.rows) {
      const tp = row.tp as string;
      if (!tpMap.has(tp)) tpMap.set(tp, []);
      tpMap.get(tp)!.push({
        std_dt: row.std_dt as string,
        avg_prc: Number(row.total_prc),
      });
    }

    // excpnp 쿠폰 데이터 조회
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

    // products: tp별 그룹 (자산, MTM, 캐리)
    // tp별 notn 합산, 종목 수 표시
    const tpOrder = ['자산', 'MTM', '캐리'];
    const tpGroups = tpOrder
      .filter((tp) => tpMap.has(tp))
      .map((tp) => {
        // 해당 tp의 strucprdp 종목들
        const tpProducts = productsResult.rows.filter((r) => r.tp === tp);
        const totalNotn = tpProducts.reduce((s, r) => s + Number(r.notn), 0);
        const objCdList = tpProducts.map((r) => String(r.obj_cd)).join(', ');
        return {
          obj_cd: objCdList,
          tp,
          notn: totalNotn,
          cntr_nm: `${tpProducts.length}종목`,
          mtm_data: tpMap.get(tp) || [],
        };
      });

    // 날짜별 전체 합산 (자산+MTM+캐리)
    const datePrcMap = new Map<string, number>();
    for (const [, series] of tpMap) {
      for (const d of series) {
        datePrcMap.set(d.std_dt, (datePrcMap.get(d.std_dt) || 0) + d.avg_prc);
      }
    }

    // 쿠폰 누적 계산
    const sortedDates = Array.from(datePrcMap.keys()).sort();
    const couponByDate = new Map<string, number>();
    let cumCoupon = 0;
    let couponIdx = 0;
    const sortedCoupons = [...coupon_events].sort((a, b) =>
      a.pay_dt.localeCompare(b.pay_dt),
    );

    for (const dt of sortedDates) {
      while (couponIdx < sortedCoupons.length && sortedCoupons[couponIdx].pay_dt <= dt) {
        cumCoupon += sortedCoupons[couponIdx].amt;
        couponIdx++;
      }
      couponByDate.set(dt, cumCoupon);
    }

    // 통합 PnL = 가격(breakdownprc 전체 합) + 누적쿠폰
    const combined_mtm = sortedDates.map((std_dt) => ({
      std_dt,
      avg_prc: (datePrcMap.get(std_dt) || 0) + (couponByDate.get(std_dt) || 0),
    }));

    const response: MTMGroupData = {
      eff_dt,
      curr,
      products: tpGroups,
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
