const { db } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

// --- TSV 파싱 유틸리티 ---

function parseSimpleTsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim() !== '');
  const headers = lines[0].split('\t').map((h) => h.replace(/"/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t').map((c) => c.replace(/"/g, '').trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

function parseMultilineTsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const firstNewline = content.indexOf('\n');
  const headerLine = content.substring(0, firstNewline);
  const headers = headerLine.split('\t').map((h) => h.replace(/"/g, '').trim());
  const expectedCols = headers.length;

  const rest = content.substring(firstNewline + 1);
  const rows = [];
  let currentFields = [];
  let currentField = '';
  let inQuote = false;

  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === '"') {
      if (inQuote && i + 1 < rest.length && rest[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === '\t' && !inQuote) {
      currentFields.push(currentField.trim());
      currentField = '';
    } else if (ch === '\n' && !inQuote) {
      currentFields.push(currentField.trim());
      currentField = '';
      if (currentFields.length >= expectedCols) {
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = currentFields[idx] || '';
        });
        rows.push(row);
      }
      currentFields = [];
    } else if (ch === '\r' || ch.charCodeAt(0) < 0x20 && ch !== '\n' && ch !== '\t') {
      // skip: CR 및 제어문자(SUB 0x1A 등) 무시
    } else {
      currentField += ch;
    }
  }

  if (currentField.trim() || currentFields.length > 0) {
    currentFields.push(currentField.trim());
    if (currentFields.length >= expectedCols) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = currentFields[idx] || '';
      });
      rows.push(row);
    }
  }

  return rows;
}

function toNum(val) {
  if (!val || val === '') return 0;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function findFile(dir, prefix) {
  const files = fs.readdirSync(dir);
  const match = files.find((f) => f.startsWith(prefix) && f.endsWith('.txt'));
  if (!match) throw new Error(`File not found with prefix: ${prefix} in ${dir}`);
  return path.join(dir, match);
}

// --- 벌크 INSERT (연결 자동 재생성) ---

/**
 * 대용량 벌크 INSERT - reconnectEvery건마다 연결을 끊고 다시 연결
 * Neon DB WebSocket 타임아웃 회피
 */
async function bulkInsertWithReconnect(tableName, columns, dataRows, conflictCols, updateCols, batchSize = 500, reconnectEvery = 2000) {
  let client = await db.connect();
  let totalInserted = 0;

  try {
    for (let i = 0; i < dataRows.length; i += batchSize) {
      const batch = dataRows.slice(i, i + batchSize);
      const colCount = columns.length;

      const valueSets = batch.map((_, idx) => {
        const params = columns.map((_, colIdx) => `$${idx * colCount + colIdx + 1}`);
        return `(${params.join(',')})`;
      });

      const values = batch.flat();

      let onConflict = '';
      if (conflictCols.length > 0 && updateCols.length > 0) {
        onConflict = ` ON CONFLICT (${conflictCols.join(',')}) DO UPDATE SET ${updateCols.map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`;
      }

      const sql = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES ${valueSets.join(',')}${onConflict}`;
      await client.query(sql, values);

      totalInserted += batch.length;
      console.log(`  ${tableName}: ${totalInserted} / ${dataRows.length}`);

      // reconnectEvery건마다 연결 재생성 (Neon 타임아웃 방지)
      if (totalInserted % reconnectEvery === 0 && totalInserted < dataRows.length) {
        await client.end();
        client = await db.connect();
        console.log(`  (reconnected at ${totalInserted})`);
      }
    }
  } finally {
    await client.end();
  }

  return totalInserted;
}

// --- 테이블 시드 함수 ---

async function seedDisplayOrdering(dataDir) {
  const client = await db.connect();
  await client.sql`
    CREATE TABLE IF NOT EXISTS display_ordering (
      id SERIAL PRIMARY KEY,
      nm VARCHAR(200) NOT NULL,
      display_order INT NOT NULL,
      table_name VARCHAR(100) NOT NULL,
      UNIQUE(nm, table_name)
    );
  `;
  await client.end();
  console.log('Created "display_ordering" table');

  const filePath = findFile(dataDir, '_ordering_');
  const rows = parseSimpleTsv(filePath);
  console.log(`Parsed ${rows.length} rows from _ordering_`);

  const dataRows = rows.map((r) => [r.nm, parseInt(r.ORDER) || 0, r.table]);

  const count = await bulkInsertWithReconnect(
    'display_ordering',
    ['nm', 'display_order', 'table_name'],
    dataRows,
    ['nm', 'table_name'],
    ['display_order'],
  );
  console.log(`Seeded ${count} rows into display_ordering`);
}

async function seedBookPnl(dataDir) {
  const client = await db.connect();
  await client.sql`
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
  `;
  await client.end();
  console.log('Created "book_pnl" table');

  const filePath = findFile(dataDir, 'bookpnlp_');
  const rows = parseSimpleTsv(filePath);
  console.log(`Parsed ${rows.length} rows from bookpnlp`);

  const dataRows = rows.map((r) => [
    r.STD_DT, r.BOOK_NM, toNum(r.Daily_PnL), toNum(r.Monthly_PnL),
    toNum(r.ACCMLT_PnL), r.REG_DTM || null, r.REGR_ID || null,
  ]);

  const count = await bulkInsertWithReconnect(
    'book_pnl',
    ['std_dt', 'book_nm', 'daily_pnl', 'monthly_pnl', 'accmlt_pnl', 'reg_dtm', 'regr_id'],
    dataRows,
    ['std_dt', 'book_nm'],
    ['daily_pnl', 'monthly_pnl', 'accmlt_pnl'],
  );
  console.log(`Seeded ${count} rows into book_pnl`);
}

async function seedAssetPosition(dataDir) {
  const client = await db.connect();
  await client.sql`
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
  `;
  await client.end();
  console.log('Created "asset_position" table');

  const filePath = findFile(dataDir, 'asstpstnp_');
  const rows = parseSimpleTsv(filePath);
  console.log(`Parsed ${rows.length} rows from asstpstnp`);

  const dataRows = rows.map((r) => [
    r.STD_DT, r.ASST_LBLT, r.NM, toNum(r.PSTN),
    toNum(r.INCREASE), r.REG_DTM || null, r.REGR_ID || null,
  ]);

  const count = await bulkInsertWithReconnect(
    'asset_position',
    ['std_dt', 'asst_lblt', 'nm', 'pstn', 'increase_amt', 'reg_dtm', 'regr_id'],
    dataRows,
    ['std_dt', 'asst_lblt', 'nm'],
    ['pstn', 'increase_amt'],
  );
  console.log(`Seeded ${count} rows into asset_position`);
}

async function seedFundPnl(dataDir) {
  const client = await db.connect();
  await client.sql`
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
  `;
  await client.end();
  console.log('Created "fund_pnl" table');

  const filePath = findFile(dataDir, 'fndpnlp_');
  const rows = parseMultilineTsv(filePath);
  console.log(`Parsed ${rows.length} rows from fndpnlp`);

  const validRows = rows.filter((r) => r.FND_NM && r.FND_NM !== '' && !/^\d+$/.test(r.FND_NM));
  console.log(`Valid rows: ${validRows.length} (skipped ${rows.length - validRows.length})`);

  const dataRows = validRows.map((r) => [
    r.STD_DT, r.FND_CLSSFCTN || null, r.FND_NM, r.FND_CD || null,
    toNum(r.NOTN_AMT), toNum(r.PRC_PnL), toNum(r.INT_PnL),
    toNum(r.TRD_PnL), toNum(r.MNY_PnL), toNum(r.ACCMLT_PnL),
    r.REG_DTM || null, r.REGR_ID || null,
  ]);

  const count = await bulkInsertWithReconnect(
    'fund_pnl',
    ['std_dt', 'fnd_clssfctn', 'fnd_nm', 'fnd_cd', 'notn_amt', 'prc_pnl', 'int_pnl', 'trd_pnl', 'mny_pnl', 'accmlt_pnl', 'reg_dtm', 'regr_id'],
    dataRows,
    ['std_dt', 'fnd_nm'],
    ['fnd_clssfctn', 'prc_pnl', 'int_pnl', 'trd_pnl', 'mny_pnl', 'accmlt_pnl'],
    500,   // batchSize
    2000,  // reconnectEvery (2000건마다 재연결)
  );
  console.log(`Seeded ${count} rows into fund_pnl`);
}

async function seedStrucprdp(dataDir, truncateFirst = false) {
  const client = await db.connect();
  await client.sql`
    CREATE TABLE IF NOT EXISTS strucprdp (
      id SERIAL PRIMARY KEY,
      no INT,
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
  `;
  // 기존 데이터 삭제 후 재적재 옵션
  if (truncateFirst) {
    await client.sql`TRUNCATE TABLE strucprdp RESTART IDENTITY`;
    console.log('Truncated "strucprdp" table (기존 데이터 삭제)');
  }
  await client.end();
  console.log('Created "strucprdp" table');

  const filePath = findFile(dataDir, 'strucprdp');
  const rows = parseMultilineTsv(filePath);
  console.log(`Parsed ${rows.length} rows from strucprdp`);

  const validRows = rows.filter((r) => r.OBJ_CD && r.OBJ_CD !== '');
  console.log(`Valid rows: ${validRows.length} (skipped ${rows.length - validRows.length})`);

  const dataRows = validRows.map((r) => [
    toNum(r.NO) || null,
    r.OBJ_CD,
    r.FND_CD || null,
    r.FND_NM || null,
    r.CNTR_NM || null,
    r.ASST_LBLT || null,
    r.TP || null,
    r.TRD_DT || null,
    r.EFF_DT || null,
    r.MAT_DT || null,
    r.CURR || null,
    toNum(r.NOTN),
    toNum(r.MAT_PRD),
    r.CALL_YN || null,
    r.RISK_CALL_YN || null,
    r.STRUCT_COND || null,
    r.PAY_COND || null,
    r.PAY_FREQ || null,
    r.PAY_DCF || null,
    r.RCV_COND || null,
    r.RCV_FREQ || null,
    r.RCV_DCF || null,
    r.NOTE || null,
    r.CALL_DT || null,
    r.TRMNTN_DT || null,
    r.TYPE1 || null,
    r.TYPE2 || null,
    r.TYPE3 || null,
    r.TYPE4 || null,
    r.OPTN_FREQ || null,
    r.CALL_NOTICE || null,
    r.FRST_CALL_DT || null,
    r.ADD_OPTN || null,
    r.UPFRNT || null,
    r.CREATED_AT || null,
    r.UPDATED_AT || null,
  ]);

  const count = await bulkInsertWithReconnect(
    'strucprdp',
    [
      'no', 'obj_cd', 'fnd_cd', 'fnd_nm', 'cntr_nm', 'asst_lblt', 'tp',
      'trd_dt', 'eff_dt', 'mat_dt', 'curr', 'notn', 'mat_prd',
      'call_yn', 'risk_call_yn', 'struct_cond', 'pay_cond', 'pay_freq', 'pay_dcf',
      'rcv_cond', 'rcv_freq', 'rcv_dcf', 'note', 'call_dt', 'trmntn_dt',
      'type1', 'type2', 'type3', 'type4', 'optn_freq', 'call_notice',
      'frst_call_dt', 'add_optn', 'upfrnt', 'created_at', 'updated_at',
    ],
    dataRows,
    ['obj_cd'],
    [
      'no', 'fnd_cd', 'fnd_nm', 'cntr_nm', 'asst_lblt', 'tp',
      'trd_dt', 'eff_dt', 'mat_dt', 'curr', 'notn', 'mat_prd',
      'call_yn', 'risk_call_yn', 'struct_cond', 'pay_cond', 'pay_freq', 'pay_dcf',
      'rcv_cond', 'rcv_freq', 'rcv_dcf', 'note', 'call_dt', 'trmntn_dt',
      'type1', 'type2', 'type3', 'type4', 'optn_freq', 'call_notice',
      'frst_call_dt', 'add_optn', 'upfrnt', 'created_at', 'updated_at',
    ],
    20,    // batchSize (36컬럼 x 20행 = 720 파라미터)
    200,   // reconnectEvery
  );
  console.log(`Seeded ${count} rows into strucprdp`);
}

// --- 메인 ---

// 파일 존재 여부를 확인하는 안전한 파일 찾기 함수
function findFileOptional(dir, prefix) {
  try {
    const files = fs.readdirSync(dir);
    const match = files.find((f) => f.startsWith(prefix) && f.endsWith('.txt'));
    return match ? path.join(dir, match) : null;
  } catch {
    return null;
  }
}

async function main() {
  const dataDir = path.join(process.cwd(), 'DataBase');

  console.log('=== FICC Data Seeding Start ===');
  console.log(`Data directory: ${dataDir}`);
  console.log('');

  // 각 시드 함수를 데이터 파일 존재 여부에 따라 선택적으로 실행
  if (findFileOptional(dataDir, '_ordering_')) {
    await seedDisplayOrdering(dataDir);
    console.log('');
  } else {
    console.log('Skipped "display_ordering" (no _ordering_*.txt file found)');
  }

  if (findFileOptional(dataDir, 'bookpnlp_')) {
    await seedBookPnl(dataDir);
    console.log('');
  } else {
    console.log('Skipped "book_pnl" (no bookpnlp_*.txt file found)');
  }

  if (findFileOptional(dataDir, 'asstpstnp_')) {
    await seedAssetPosition(dataDir);
    console.log('');
  } else {
    console.log('Skipped "asset_position" (no asstpstnp_*.txt file found)');
  }

  if (findFileOptional(dataDir, 'fndpnlp_')) {
    await seedFundPnl(dataDir);
    console.log('');
  } else {
    console.log('Skipped "fund_pnl" (no fndpnlp_*.txt file found)');
  }

  if (findFileOptional(dataDir, 'strucprdp')) {
    await seedStrucprdp(dataDir);
  } else {
    console.log('Skipped "strucprdp" (no strucprdp*.txt file found)');
  }

  console.log('');
  console.log('=== FICC Data Seeding Complete ===');
}

main().catch((err) => {
  console.error('An error occurred while seeding FICC data:', err);
});
