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

    // 동일 eff_dt + curr 그룹 종목 조회
    const productsResult = await sql`
      SELECT obj_cd, tp, notn, cntr_nm
      FROM strucprdp
      WHERE eff_dt = ${eff_dt}
        AND curr = ${curr}
        AND fnd_cd = '10206020'
        AND (call_yn = 'N' OR call_yn IS NULL)
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

    // 각 종목의 MTM 시계열 조회 (최근 90영업일)
    const objCodes = productsResult.rows.map((r) => String(r.obj_cd));

    const mtmResult = await sql`
      SELECT obj_cd, std_dt, avg_prc
      FROM swap_prc
      WHERE obj_cd = ANY(${objCodes as string[]})
        AND fnd_cd = '10206020'
        AND std_dt >= (
          SELECT DISTINCT std_dt FROM swap_prc
          WHERE fnd_cd = '10206020'
          ORDER BY std_dt DESC
          OFFSET 89 LIMIT 1
        )
      ORDER BY obj_cd, std_dt ASC
    `;

    // obj_cd별 시계열 맵 생성
    const mtmMap = new Map<string, { std_dt: string; avg_prc: number }[]>();
    for (const row of mtmResult.rows) {
      const objCd = row.obj_cd as string;
      if (!mtmMap.has(objCd)) mtmMap.set(objCd, []);
      mtmMap.get(objCd)!.push({
        std_dt: row.std_dt as string,
        avg_prc: Number(row.avg_prc),
      });
    }

    // 상품별 데이터 구성
    const products = productsResult.rows.map((row) => ({
      obj_cd: String(row.obj_cd),
      tp: String(row.tp),
      notn: Number(row.notn),
      cntr_nm: String(row.cntr_nm),
      mtm_data: mtmMap.get(String(row.obj_cd)) || [],
    }));

    // 합산 시계열 (날짜별 전체 MTM 합)
    const dateMap = new Map<string, number>();
    for (const product of products) {
      for (const mtm of product.mtm_data) {
        dateMap.set(mtm.std_dt, (dateMap.get(mtm.std_dt) || 0) + mtm.avg_prc);
      }
    }

    const combined_mtm = Array.from(dateMap.entries())
      .map(([std_dt, avg_prc]) => ({ std_dt, avg_prc }))
      .sort((a, b) => a.std_dt.localeCompare(b.std_dt));

    const response: MTMGroupData = {
      eff_dt,
      curr,
      products,
      combined_mtm,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('MTM 시계열 조회 오류:', error);
    return NextResponse.json(
      { error: 'MTM 데이터 조회 실패' },
      { status: 500 },
    );
  }
}
