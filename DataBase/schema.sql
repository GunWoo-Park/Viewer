-- FICC Dashboard Database Schema
-- Generated: 2026-02-25
-- PostgreSQL (Neon)

-- =============================================
-- 1. 기본 테이블 (Next.js Course 원본)
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  image_url VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(255) NOT NULL,
  date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS revenue (
  month VARCHAR(4) NOT NULL UNIQUE,
  revenue INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- =============================================
-- 2. BTB 포트폴리오 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS book_pnl (
  id SERIAL PRIMARY KEY,
  std_dt VARCHAR(8) NOT NULL,
  book_nm VARCHAR(100) NOT NULL,
  daily_pnl DOUBLE PRECISION DEFAULT 0,
  monthly_pnl DOUBLE PRECISION DEFAULT 0,
  accmlt_pnl DOUBLE PRECISION DEFAULT 0,
  reg_dtm TIMESTAMP,
  regr_id VARCHAR(50),
  UNIQUE(std_dt, book_nm)
);

CREATE TABLE IF NOT EXISTS fund_pnl (
  id SERIAL PRIMARY KEY,
  std_dt VARCHAR(8) NOT NULL,
  fnd_clssfctn VARCHAR(200),
  fnd_nm VARCHAR(200) NOT NULL,
  fnd_cd VARCHAR(50),
  notn_amt DOUBLE PRECISION DEFAULT 0,
  prc_pnl DOUBLE PRECISION DEFAULT 0,
  int_pnl DOUBLE PRECISION DEFAULT 0,
  trd_pnl DOUBLE PRECISION DEFAULT 0,
  mny_pnl DOUBLE PRECISION DEFAULT 0,
  accmlt_pnl DOUBLE PRECISION DEFAULT 0,
  reg_dtm TIMESTAMP,
  regr_id VARCHAR(50),
  UNIQUE(std_dt, fnd_nm)
);

CREATE TABLE IF NOT EXISTS asset_position (
  id SERIAL PRIMARY KEY,
  std_dt VARCHAR(8) NOT NULL,
  asst_lblt VARCHAR(20) NOT NULL,
  nm VARCHAR(200) NOT NULL,
  pstn DOUBLE PRECISION DEFAULT 0,
  increase_amt DOUBLE PRECISION DEFAULT 0,
  reg_dtm TIMESTAMP,
  regr_id VARCHAR(50),
  UNIQUE(std_dt, asst_lblt, nm)
);

CREATE TABLE IF NOT EXISTS display_ordering (
  id SERIAL PRIMARY KEY,
  nm VARCHAR(200) NOT NULL,
  display_order INTEGER NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  UNIQUE(nm, table_name)
);

-- =============================================
-- 3. 구조화상품 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS strucprdp (
  id SERIAL PRIMARY KEY,
  no INTEGER,
  obj_cd VARCHAR(50) NOT NULL UNIQUE,
  fnd_cd VARCHAR(50),
  fnd_nm VARCHAR(200),
  cntr_nm VARCHAR(200),
  asst_lblt VARCHAR(20),
  tp VARCHAR(50),
  trd_dt VARCHAR(8),
  eff_dt VARCHAR(8),
  mat_dt VARCHAR(8),
  curr VARCHAR(10),
  notn DOUBLE PRECISION DEFAULT 0,
  mat_prd DOUBLE PRECISION DEFAULT 0,
  call_yn VARCHAR(5),
  risk_call_yn VARCHAR(5),
  struct_cond TEXT,
  pay_cond TEXT,
  pay_freq VARCHAR(50),
  pay_dcf VARCHAR(50),
  rcv_cond TEXT,
  rcv_freq VARCHAR(50),
  rcv_dcf VARCHAR(50),
  note TEXT,
  call_dt VARCHAR(50),
  trmntn_dt VARCHAR(50),
  type1 VARCHAR(100),
  type2 VARCHAR(100),
  type3 VARCHAR(100),
  type4 VARCHAR(100),
  optn_freq VARCHAR(50),
  call_notice VARCHAR(100),
  frst_call_dt VARCHAR(50),
  add_optn TEXT,
  upfrnt VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strucprdm (
  id SERIAL PRIMARY KEY,
  obj_cd VARCHAR(50) NOT NULL UNIQUE,
  fnd_cd VARCHAR(50),
  fnd_nm VARCHAR(200),
  cntr_nm VARCHAR(200),
  asst_lblt VARCHAR(20),
  tp VARCHAR(50),
  trd_dt VARCHAR(8),
  eff_dt VARCHAR(8),
  mat_dt VARCHAR(8),
  curr VARCHAR(10),
  notn DOUBLE PRECISION DEFAULT 0,
  mat_prd DOUBLE PRECISION DEFAULT 0,
  call_yn VARCHAR(5),
  risk_call_yn VARCHAR(5),
  struct_cond TEXT,
  pay_cond TEXT,
  pay_freq VARCHAR(50),
  pay_dcf VARCHAR(50),
  rcv_cond TEXT,
  rcv_freq VARCHAR(50),
  rcv_dcf VARCHAR(50),
  note TEXT,
  call_dt VARCHAR(50),
  trmntn_dt VARCHAR(50),
  type1 VARCHAR(100),
  type2 VARCHAR(100),
  type3 VARCHAR(100),
  type4 VARCHAR(100),
  optn_freq VARCHAR(50),
  call_notice VARCHAR(100),
  add_optn TEXT,
  upfrnt VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS swap_prc (
  no INTEGER,
  std_dt VARCHAR(8),
  fnd_cd VARCHAR(20),
  fnd_nm VARCHAR(100),
  obj_cd VARCHAR(30),
  obj_nm VARCHAR(100),
  prd_dvsn VARCHAR(20),
  prd_grp VARCHAR(50),
  asst_lvl VARCHAR(20),
  trd_tp VARCHAR(20),
  cntrprt VARCHAR(50),
  pstn VARCHAR(20),
  fxd_rt NUMERIC,
  init_prncpl_ex VARCHAR(20),
  lst_prncpl_ex VARCHAR(20),
  crrnt2 VARCHAR(10),
  ntnl2 NUMERIC,
  crrnt1 VARCHAR(10),
  ntnl1 NUMERIC,
  kis_prc NUMERIC,
  kap_prc NUMERIC,
  nic_prc NUMERIC,
  fnp_prc NUMERIC,
  lstyr_prc NUMERIC,
  avg_prc NUMERIC,
  buy_pnl NUMERIC,
  buy_pnl_accnt NUMERIC,
  ystrdy_npv NUMERIC,
  tdy_npv NUMERIC,
  calc_blnc NUMERIC,
  swp_asst_lblt NUMERIC,
  swp_asst_lblt_accnt NUMERIC,
  prmm_asst_lblt NUMERIC,
  trd_dt VARCHAR(8),
  eff_dt VARCHAR(8),
  adjst_mtrty VARCHAR(8),
  inpt_mtrty VARCHAR(8),
  mar NUMERIC,
  rcv_ytm NUMERIC,
  rcv_dur NUMERIC,
  pay_ytm NUMERIC,
  pay_dur NUMERIC,
  swap_dur NUMERIC,
  prc_diff VARCHAR(20),
  avg_prc_usd NUMERIC,
  nd_yn VARCHAR(5),
  erly_exr_yn VARCHAR(5),
  erly_exr_dt VARCHAR(8)
);

-- =============================================
-- 4. 시장 데이터 테이블 (Market Dashboard)
-- =============================================

CREATE TABLE IF NOT EXISTS tb_macro_index (
  base_date DATE NOT NULL,
  asset_class VARCHAR(20) NOT NULL,
  ticker VARCHAR(20) NOT NULL,
  close_value NUMERIC,
  change_val NUMERIC,
  change_pct NUMERIC,
  PRIMARY KEY (base_date, asset_class, ticker)
);

CREATE TABLE IF NOT EXISTS tb_domestic_rate (
  base_date DATE NOT NULL,
  rate_type VARCHAR(20) NOT NULL,
  maturity VARCHAR(30) NOT NULL,
  ticker_name VARCHAR(30),
  yield_val NUMERIC,
  change_bp NUMERIC,
  PRIMARY KEY (base_date, rate_type, maturity)
);

CREATE TABLE IF NOT EXISTS tb_ktb_futures (
  base_date DATE NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  close_price NUMERIC,
  volume BIGINT,
  open_interest BIGINT,
  net_foreign BIGINT,
  net_fin_invest BIGINT,
  net_bank BIGINT,
  PRIMARY KEY (base_date, ticker)
);

CREATE TABLE IF NOT EXISTS tb_primary_market (
  base_date DATE NOT NULL,
  issuer_name VARCHAR(50) NOT NULL,
  credit_rating VARCHAR(10),
  maturity VARCHAR(30) NOT NULL,
  issue_yield NUMERIC,
  issue_amt INTEGER,
  spread_bp NUMERIC,
  PRIMARY KEY (base_date, issuer_name, maturity)
);

CREATE TABLE IF NOT EXISTS tb_bond_valuation (
  base_date DATE NOT NULL,
  bond_alias VARCHAR(20) NOT NULL,
  sector VARCHAR(20),
  standard_name VARCHAR(50),
  maturity_date DATE,
  close_yield NUMERIC,
  change_bp NUMERIC,
  m_duration NUMERIC,
  outstanding NUMERIC,
  PRIMARY KEY (base_date, bond_alias)
);

CREATE TABLE IF NOT EXISTS tb_yield_curve_matrix (
  base_date DATE NOT NULL,
  sector VARCHAR(20) NOT NULL,
  credit_rating VARCHAR(10) NOT NULL DEFAULT '',
  tenor VARCHAR(10) NOT NULL,
  yield_rate NUMERIC,
  PRIMARY KEY (base_date, sector, credit_rating, tenor)
);

CREATE TABLE IF NOT EXISTS tb_bond_lending (
  base_date DATE NOT NULL,
  bond_ticker VARCHAR(20) NOT NULL,
  borrow_amt NUMERIC,
  repay_amt NUMERIC,
  net_change NUMERIC,
  balance NUMERIC,
  PRIMARY KEY (base_date, bond_ticker)
);

CREATE TABLE IF NOT EXISTS tb_economic_calendar (
  event_date DATE NOT NULL,
  seq INTEGER NOT NULL,
  event_desc VARCHAR(200),
  PRIMARY KEY (event_date, seq)
);
