/**
 * strucprdp 테이블만 단독으로 재적재하는 스크립트
 * 기존 데이터를 TRUNCATE 후 새 데이터를 INSERT
 *
 * 사용법: node scripts/reseed-strucprdp.js
 */
// .env 파일 로드 (dotenv 또는 수동)
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.replace(/\r/g, '').trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  });
}
const { db } = require('@vercel/postgres');

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
      // skip CR 및 제어문자
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

async function main() {
  const dataDir = path.join(process.cwd(), 'DataBase');
  console.log('=== strucprdp 테이블 재적재 시작 ===');

  // 1. 기존 데이터 삭제
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
  await client.sql`TRUNCATE TABLE strucprdp RESTART IDENTITY`;
  await client.end();
  console.log('기존 strucprdp 데이터 삭제 완료 (TRUNCATE)');

  // 2. 새 데이터 파일 파싱
  const files = fs.readdirSync(dataDir);
  const match = files.find((f) => f.startsWith('strucprdp') && f.endsWith('.txt'));
  if (!match) {
    console.error('strucprdp*.txt 파일을 찾을 수 없습니다.');
    process.exit(1);
  }
  const filePath = path.join(dataDir, match);
  console.log(`파일: ${match}`);

  const rows = parseMultilineTsv(filePath);
  console.log(`파싱된 행 수: ${rows.length}`);

  const validRows = rows.filter((r) => r.OBJ_CD && r.OBJ_CD !== '');
  console.log(`유효 행 수: ${validRows.length} (스킵: ${rows.length - validRows.length})`);

  // 3. 데이터 적재
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
    20,
    200,
  );

  console.log(`\n=== 완료: ${count}건 적재 ===`);
}

main().catch((err) => {
  console.error('에러 발생:', err);
  process.exit(1);
});
