// This file contains type definitions for your data.
// It describes the shape of the data, and what data type each property should accept.
// For simplicity of teaching, we're manually defining these types.
// However, these types are generated automatically if you're using an ORM such as Prisma.
export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  image_url: string;
};

export type Invoice = {
  id: string;
  customer_id: string;
  amount: number;
  date: string;
  // In TypeScript, this is called a string union type.
  // It means that the "status" property can only be one of the two strings: 'pending' or 'paid'.
  status: 'pending' | 'paid';
};

export type Revenue = {
  month: string;
  revenue: number;
};

export type LatestInvoice = {
  id: string;
  name: string;
  image_url: string;
  email: string;
  amount: string;
};

// The database returns a number for amount, but we later format it to a string with the formatCurrency function
export type LatestInvoiceRaw = Omit<LatestInvoice, 'amount'> & {
  amount: number;
};

export type InvoicesTable = {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  image_url: string;
  date: string;
  amount: number;
  status: 'pending' | 'paid';
};

export type CustomersTableType = {
  id: string;
  name: string;
  email: string;
  image_url: string;
  total_invoices: number;
  total_pending: number;
  total_paid: number;
};

export type FormattedCustomersTable = {
  id: string;
  name: string;
  email: string;
  image_url: string;
  total_invoices: number;
  total_pending: string;
  total_paid: string;
};

export type CustomerField = {
  id: string;
  name: string;
};

export type InvoiceForm = {
  id: string;
  customer_id: string;
  amount: number;
  status: 'pending' | 'paid';
};

// --- FICC 데이터 타입 ---

export type BookPnl = {
  std_dt: string;
  book_nm: string;
  daily_pnl: number;
  monthly_pnl: number;
  accmlt_pnl: number;
};

export type AssetPosition = {
  std_dt: string;
  asst_lblt: string;
  nm: string;
  pstn: number;
  increase_amt: number;
};

export type FundPnl = {
  std_dt: string;
  fnd_clssfctn: string;
  fnd_nm: string;
  fnd_cd: string;
  notn_amt: number;
  prc_pnl: number;
  int_pnl: number;
  trd_pnl: number;
  mny_pnl: number;
  accmlt_pnl: number;
};

export type DisplayOrdering = {
  nm: string;
  display_order: number;
  table_name: string;
};

export type PnlAttributionRow = {
  name: string;
  daily_pnl: number;
};

// --- 구조화 상품 타입 ---

export type Strucprdm = {
  id: number;
  obj_cd: string;
  fnd_cd: string;
  fnd_nm: string;
  cntr_nm: string;
  asst_lblt: string;
  tp: string;
  trd_dt: string;
  eff_dt: string;
  mat_dt: string;
  curr: string;
  notn: number;
  mat_prd: number;
  call_yn: string;
  risk_call_yn: string;
  struct_cond: string;
  pay_cond: string;
  pay_freq: string;
  pay_dcf: string;
  rcv_cond: string;
  rcv_freq: string;
  rcv_dcf: string;
  note: string;
  call_dt: string;
  trmntn_dt: string;
  type1: string;
  type2: string;
  type3: string;
  type4: string;
  optn_freq: string;
  call_notice: string;
  add_optn: string;
  upfrnt: string;
  created_at: string;
  updated_at: string;
};

export type StrucprdmSummary = {
  totalCount: number;
  krwCount: number;
  usdCount: number;
  assetCount: number;
  liabilityCount: number;
  krwNotionalTotal: number;
  usdNotionalTotal: number;
  typeDistribution: { struct_type: string; count: number }[];
  cntrDistribution: { cntr_nm: string; count: number }[];
};

export type BTBDashboardData = {
  latestDate: string;
  totalBalance: number;
  assetBalance: number;
  liabilityBalance: number;
  dailyPnl: number;
  monthlyPnl: number;
  accmltPnl: number;
  pnlAttribution: PnlAttributionRow[];
};
