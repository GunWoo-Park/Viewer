import { sql } from '@vercel/postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
  BTBDashboardData,
  PnlAttributionRow,
  Strucprdm,
  StrucprdmSummary,
} from './definitions';
import { formatCurrency } from './utils';
import { unstable_noStore as noStore} from "next/cache";

// export const dynamic = "force-dynamic"; // https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config

export async function fetchRevenue() {
  noStore();

  try {
    const data = await sql<Revenue>`SELECT * FROM revenue`;

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore();

  try {
    const data = await sql<LatestInvoiceRaw>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    const latestInvoices = data.rows.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  noStore();

  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0].rows[0].count ?? '0');
    const numberOfCustomers = Number(data[1].rows[0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }

  // const dataPromise = sql`
  //     SELECT 
  //       (SELECT COUNT(*) FROM invoices) AS invoice_count,
  //       (SELECT COUNT(*) FROM customers) AS customer_count,
  //       (SELECT SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) FROM invoices) AS total_paid,
  //       (SELECT SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) FROM invoices) AS total_pending
  //   `;

  //   const data = await dataPromise;

  //   const numberOfInvoices = Number(data.rows[0].invoice_count ?? '0');
  //   const numberOfCustomers = Number(data.rows[0].customer_count ?? '0');
  //   const totalPaidInvoices = formatCurrency(data.rows[0].total_paid ?? '0');
  //   const totalPendingInvoices = formatCurrency(data.rows[0].total_pending ?? '0');

  //   return {
  //     numberOfCustomers,
  //     numberOfInvoices,
  //     totalPaidInvoices,
  //     totalPendingInvoices,
  //   };
  // } catch (error) {
  //   console.error('Database Error:', error);
  //   throw new Error('Failed to fetch card data.');
  // }
  
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  noStore();

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await sql<InvoicesTable>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoices.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  noStore();

  try {
    const count = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  noStore();

  try {
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  noStore();

  try {
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  noStore();

  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  noStore();

  try {
    const user = await sql`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

// --- FICC 대시보드 데이터 조회 함수 ---

export async function fetchLatestFiccDate(): Promise<string> {
  noStore();

  try {
    const data = await sql`
      SELECT DISTINCT std_dt
      FROM book_pnl
      ORDER BY std_dt DESC
      LIMIT 1
    `;
    return data.rows[0]?.std_dt || '';
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch latest FICC date.');
  }
}

export async function fetchDashboardKPI(stdDt: string) {
  noStore();

  try {
    const [assetData, liabilityData, pnlData] = await Promise.all([
      sql`
        SELECT COALESCE(SUM(pstn), 0) AS total
        FROM asset_position
        WHERE asst_lblt = '자산' AND std_dt = ${stdDt}
      `,
      sql`
        SELECT COALESCE(SUM(pstn), 0) AS total
        FROM asset_position
        WHERE asst_lblt = '부채' AND std_dt = ${stdDt}
      `,
      sql`
        SELECT
          COALESCE(SUM(daily_pnl), 0) AS daily_pnl,
          COALESCE(SUM(monthly_pnl), 0) AS monthly_pnl,
          COALESCE(SUM(accmlt_pnl), 0) AS accmlt_pnl
        FROM book_pnl
        WHERE std_dt = ${stdDt}
      `,
    ]);

    return {
      totalAsset: Number(assetData.rows[0].total),
      totalLiability: Number(liabilityData.rows[0].total),
      dailyPnl: Number(pnlData.rows[0].daily_pnl),
      monthlyPnl: Number(pnlData.rows[0].monthly_pnl),
      accmltPnl: Number(pnlData.rows[0].accmlt_pnl),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch dashboard KPI data.');
  }
}

export async function fetchPnlAttribution(
  stdDt: string,
): Promise<PnlAttributionRow[]> {
  noStore();

  try {
    const data = await sql`
      SELECT
        fp.fnd_nm AS name,
        (COALESCE(fp.prc_pnl, 0) + COALESCE(fp.int_pnl, 0) + COALESCE(fp.trd_pnl, 0) + COALESCE(fp.mny_pnl, 0)) AS daily_pnl
      FROM fund_pnl fp
      INNER JOIN display_ordering d
        ON fp.fnd_nm = d.nm AND d.table_name = 'fndpnlp'
      WHERE fp.std_dt = ${stdDt}
      ORDER BY d.display_order ASC
    `;

    return data.rows.map((row) => ({
      name: row.name,
      daily_pnl: Number(row.daily_pnl),
    }));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch PnL attribution data.');
  }
}

export async function fetchBTBDashboardData(): Promise<BTBDashboardData | null> {
  noStore();

  try {
    const latestDate = await fetchLatestFiccDate();
    if (!latestDate) return null;

    const [kpi, pnlAttribution] = await Promise.all([
      fetchDashboardKPI(latestDate),
      fetchPnlAttribution(latestDate),
    ]);

    // 날짜 포맷: YYYYMMDD → YYYY-MM-DD
    const formattedDate = latestDate.replace(
      /(\d{4})(\d{2})(\d{2})/,
      '$1-$2-$3',
    );

    return {
      latestDate: formattedDate,
      totalBalance: kpi.totalAsset + kpi.totalLiability,
      assetBalance: kpi.totalAsset,
      liabilityBalance: kpi.totalLiability,
      dailyPnl: kpi.dailyPnl,
      monthlyPnl: kpi.monthlyPnl,
      accmltPnl: kpi.accmltPnl,
      pnlAttribution,
    };
  } catch (error) {
    console.error('Database Error:', error);
    // 테이블 미존재 등의 에러 시 null 반환 → page.tsx에서 안내 메시지 표시
    return null;
  }
}

// --- 구조화 상품 (strucprdm) 데이터 조회 함수 ---

const STRUCPRDM_PER_PAGE = 15;

export async function fetchStrucprdmSummary(): Promise<StrucprdmSummary | null> {
  noStore();

  try {
    const [countData, notionalData, typeData, cntrData] = await Promise.all([
      sql`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE curr = 'KRW') AS krw_count,
          COUNT(*) FILTER (WHERE curr = 'USD') AS usd_count,
          COUNT(*) FILTER (WHERE asst_lblt = '자산') AS asset_count,
          COUNT(*) FILTER (WHERE asst_lblt = '부채') AS liability_count
        FROM strucprdm
      `,
      sql`
        SELECT
          COALESCE(SUM(notn) FILTER (WHERE curr = 'KRW'), 0) AS krw_total,
          COALESCE(SUM(notn) FILTER (WHERE curr = 'USD'), 0) AS usd_total
        FROM strucprdm
      `,
      sql`
        SELECT
          CONCAT_WS(' / ',
            NULLIF(type1, ''),
            NULLIF(type2, ''),
            NULLIF(type3, ''),
            NULLIF(type4, '')
          ) AS struct_type,
          COUNT(*) AS count
        FROM strucprdm
        WHERE type1 IS NOT NULL AND type1 != ''
        GROUP BY struct_type
        ORDER BY count DESC
        LIMIT 10
      `,
      sql`
        SELECT cntr_nm, COUNT(*) AS count
        FROM strucprdm
        WHERE cntr_nm IS NOT NULL AND cntr_nm != ''
        GROUP BY cntr_nm
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    return {
      totalCount: Number(countData.rows[0].total),
      krwCount: Number(countData.rows[0].krw_count),
      usdCount: Number(countData.rows[0].usd_count),
      assetCount: Number(countData.rows[0].asset_count),
      liabilityCount: Number(countData.rows[0].liability_count),
      krwNotionalTotal: Number(notionalData.rows[0].krw_total),
      usdNotionalTotal: Number(notionalData.rows[0].usd_total),
      typeDistribution: typeData.rows.map((r) => ({
        struct_type: r.struct_type,
        count: Number(r.count),
      })),
      cntrDistribution: cntrData.rows.map((r) => ({
        cntr_nm: r.cntr_nm,
        count: Number(r.count),
      })),
    };
  } catch (error) {
    console.error('Database Error:', error);
    return null;
  }
}

export async function fetchFilteredStrucprdm(
  query: string,
  currentPage: number,
  callFilter: string = 'N',
): Promise<Strucprdm[]> {
  noStore();

  const offset = (currentPage - 1) * STRUCPRDM_PER_PAGE;

  try {
    // callFilter: 'Y' = 콜된 종목만, 'N' = 미콜 종목만(기본), 'ALL' = 전체
    const data = await sql<Strucprdm>`
      SELECT *
      FROM strucprdm
      WHERE
        (
          obj_cd ILIKE ${`%${query}%`} OR
          cntr_nm ILIKE ${`%${query}%`} OR
          fnd_nm ILIKE ${`%${query}%`} OR
          struct_cond ILIKE ${`%${query}%`} OR
          type1 ILIKE ${`%${query}%`} OR
          type2 ILIKE ${`%${query}%`} OR
          type3 ILIKE ${`%${query}%`} OR
          type4 ILIKE ${`%${query}%`} OR
          tp ILIKE ${`%${query}%`} OR
          curr ILIKE ${`%${query}%`} OR
          asst_lblt ILIKE ${`%${query}%`}
        )
        AND (
          ${callFilter} = 'ALL'
          OR call_yn = ${callFilter}
          OR (${callFilter} = 'N' AND call_yn IS NULL)
        )
      ORDER BY id ASC
      LIMIT ${STRUCPRDM_PER_PAGE} OFFSET ${offset}
    `;

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch strucprdm data.');
  }
}

export async function fetchStrucprdmPages(
  query: string,
  callFilter: string = 'N',
): Promise<number> {
  noStore();

  try {
    const count = await sql`
      SELECT COUNT(*)
      FROM strucprdm
      WHERE
        (
          obj_cd ILIKE ${`%${query}%`} OR
          cntr_nm ILIKE ${`%${query}%`} OR
          fnd_nm ILIKE ${`%${query}%`} OR
          struct_cond ILIKE ${`%${query}%`} OR
          type1 ILIKE ${`%${query}%`} OR
          type2 ILIKE ${`%${query}%`} OR
          type3 ILIKE ${`%${query}%`} OR
          type4 ILIKE ${`%${query}%`} OR
          tp ILIKE ${`%${query}%`} OR
          curr ILIKE ${`%${query}%`} OR
          asst_lblt ILIKE ${`%${query}%`}
        )
        AND (
          ${callFilter} = 'ALL'
          OR call_yn = ${callFilter}
          OR (${callFilter} = 'N' AND call_yn IS NULL)
        )
    `;

    return Math.ceil(Number(count.rows[0].count) / STRUCPRDM_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch strucprdm page count.');
  }
}

export async function fetchStrucprdmById(objCd: string): Promise<Strucprdm | null> {
  noStore();

  try {
    const data = await sql<Strucprdm>`
      SELECT * FROM strucprdm WHERE obj_cd = ${objCd}
    `;
    return data.rows[0] || null;
  } catch (error) {
    console.error('Database Error:', error);
    return null;
  }
}
