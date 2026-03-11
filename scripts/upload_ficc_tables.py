#!/usr/bin/env python3
"""
DataBase 폴더의 TSV 파일을 PostgreSQL에 업로드 (배치 처리)
- breakdownprc, eq_unasp, excpnp: 없는 데이터만 INSERT (ON CONFLICT DO NOTHING)
- strucprdp: UPSERT (obj_cd 기준)

사용법:
  python3 scripts/upload_ficc_tables.py                  # 최신 파일 자동 감지
  python3 scripts/upload_ficc_tables.py --date 202603110923  # 특정 타임스탬프 지정

DataBase 폴더에서 {테이블명}_{타임스탬프}.txt 형식의 최신 파일을 자동 감지합니다.
"""

import sys
import os
import csv
import glob
import psycopg2
from psycopg2.extras import execute_values

DB_URL = "postgresql://neondb_owner:npg_IcbygUXf0Sa4@ep-sweet-smoke-adz6o5mz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'DataBase')

BATCH_SIZE = 500  # 배치 크기


def clean(v):
    """따옴표 제거 및 빈값 처리"""
    if v is None:
        return None
    v = v.strip().strip('"')
    if v == '' or v == 'NULL' or v == '\\N':
        return None
    return v


def num(v):
    """숫자 변환"""
    v = clean(v)
    if v is None:
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def find_latest_file(table_name, target_ts=None):
    """DataBase 폴더에서 테이블의 최신 파일 찾기"""
    pattern = os.path.join(DB_DIR, f'{table_name}_*.txt')
    files = glob.glob(pattern)
    if not files:
        return None

    if target_ts:
        target = os.path.join(DB_DIR, f'{table_name}_{target_ts}.txt')
        return target if os.path.exists(target) else None

    return max(files, key=os.path.getmtime)


def read_tsv(filepath):
    """TSV 파일 읽기 (헤더 + 데이터)"""
    rows = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t')
        headers = [h.strip().strip('"').upper() for h in next(reader)]
        for row in reader:
            if len(row) >= len(headers):
                rows.append(row[:len(headers)])
            elif len(row) > 0:
                padded = row + [None] * (len(headers) - len(row))
                rows.append(padded)
    return headers, rows


def upload_breakdownprc(conn, filepath):
    """breakdownprc: 배치 INSERT (ON CONFLICT DO NOTHING)"""
    print(f"\n[breakdownprc] {os.path.basename(filepath)}")
    headers, rows = read_tsv(filepath)
    cur = conn.cursor()

    # 기존 키 조회
    cur.execute("SELECT obj_cd || '|' || sp_num || '|' || tp || '|' || std_dt FROM breakdownprc")
    existing = {r[0] for r in cur.fetchall()}
    print(f"  DB 기존: {len(existing)}건")

    # 신규 행만 필터링
    new_rows = []
    skipped = 0
    for row in rows:
        obj_cd = clean(row[0])
        sp_num = clean(row[1])
        tp = clean(row[3])
        std_dt = clean(row[4])
        if not obj_cd or not std_dt:
            continue

        key = f"{obj_cd}|{sp_num}|{tp}|{std_dt}"
        if key in existing:
            skipped += 1
            continue

        asst_lblt = clean(row[2])
        kis_prc = num(row[5])
        kap_prc = num(row[6])
        avg_prc = num(row[7])
        created_at = clean(row[8]) if len(row) > 8 else None
        updated_at = clean(row[9]) if len(row) > 9 else None

        new_rows.append((obj_cd, sp_num, asst_lblt, tp, std_dt,
                         kis_prc or 0, kap_prc or 0, avg_prc or 0,
                         created_at, updated_at))

    # 배치 INSERT
    if new_rows:
        for i in range(0, len(new_rows), BATCH_SIZE):
            batch = new_rows[i:i + BATCH_SIZE]
            execute_values(cur,
                """INSERT INTO breakdownprc (obj_cd, sp_num, asst_lblt, tp, std_dt, kis_prc, kap_prc, avg_prc, created_at, updated_at)
                   VALUES %s ON CONFLICT (obj_cd, sp_num, tp, std_dt) DO NOTHING""",
                batch, page_size=BATCH_SIZE)
        conn.commit()

    cur.close()
    print(f"  신규 INSERT: {len(new_rows)}건, 스킵(기존): {skipped}건")
    return len(new_rows)


def upload_eq_unasp(conn, filepath):
    """eq_unasp: 배치 INSERT (ON CONFLICT DO NOTHING)"""
    print(f"\n[eq_unasp] {os.path.basename(filepath)}")
    headers, rows = read_tsv(filepath)
    cur = conn.cursor()

    cur.execute("SELECT std_dt || '|' || unas_id FROM eq_unasp")
    existing = {r[0] for r in cur.fetchall()}
    print(f"  DB 기존: {len(existing)}건")

    new_rows = []
    skipped = 0
    for row in rows:
        std_dt = clean(row[0])
        unas_id = clean(row[1])
        if not std_dt or not unas_id:
            continue

        key = f"{std_dt}|{unas_id}"
        if key in existing:
            skipped += 1
            continue

        reg_dtm = clean(row[2]) if len(row) > 2 else None
        regr_id = clean(row[3]) if len(row) > 3 else None
        mdfy_dtm = clean(row[4]) if len(row) > 4 else None
        mdfyr_id = clean(row[5]) if len(row) > 5 else None
        clprc_val = num(row[6]) if len(row) > 6 else 0
        divd_rt = num(row[7]) if len(row) > 7 else 0
        aply_qnto_val = num(row[8]) if len(row) > 8 else 0
        vltl_val = num(row[9]) if len(row) > 9 else 0

        new_rows.append((std_dt, unas_id, reg_dtm, regr_id, mdfy_dtm, mdfyr_id,
                         clprc_val or 0, divd_rt or 0, aply_qnto_val or 0, vltl_val or 0))

    if new_rows:
        for i in range(0, len(new_rows), BATCH_SIZE):
            batch = new_rows[i:i + BATCH_SIZE]
            execute_values(cur,
                """INSERT INTO eq_unasp (std_dt, unas_id, reg_dtm, regr_id, mdfy_dtm, mdfyr_id, clprc_val, divd_rt, aply_qnto_val, vltl_val)
                   VALUES %s ON CONFLICT (std_dt, unas_id) DO NOTHING""",
                batch, page_size=BATCH_SIZE)
        conn.commit()

    cur.close()
    print(f"  신규 INSERT: {len(new_rows)}건, 스킵(기존): {skipped}건")
    return len(new_rows)


def upload_excpnp(conn, filepath):
    """excpnp: 배치 INSERT (ON CONFLICT DO NOTHING)"""
    print(f"\n[excpnp] {os.path.basename(filepath)}")
    headers, rows = read_tsv(filepath)
    cur = conn.cursor()

    cur.execute("SELECT pay_dt || '|' || obj_cd || '|' || tp || '|' || curr || '|' || amt::text FROM excpnp")
    existing = {r[0] for r in cur.fetchall()}
    print(f"  DB 기존: {len(existing)}건")

    new_rows = []
    skipped = 0
    for row in rows:
        pay_dt = clean(row[0])
        fnd_cd = clean(row[1])
        fnd_nm = clean(row[2])
        obj_cd = clean(row[3])
        tp = clean(row[4])
        curr = clean(row[5])
        amt = num(row[6])
        created_at = clean(row[7]) if len(row) > 7 else None
        updated_at = clean(row[8]) if len(row) > 8 else None

        if not pay_dt or not obj_cd:
            continue

        amt_val = amt if amt is not None else 0
        key = f"{pay_dt}|{obj_cd}|{tp}|{curr}|{amt_val}"
        if key in existing:
            skipped += 1
            continue

        new_rows.append((pay_dt, fnd_cd, fnd_nm, obj_cd, tp, curr, amt_val, created_at, updated_at))

    if new_rows:
        for i in range(0, len(new_rows), BATCH_SIZE):
            batch = new_rows[i:i + BATCH_SIZE]
            execute_values(cur,
                """INSERT INTO excpnp (pay_dt, fnd_cd, fnd_nm, obj_cd, tp, curr, amt, created_at, updated_at)
                   VALUES %s ON CONFLICT (pay_dt, obj_cd, tp, curr, amt) DO NOTHING""",
                batch, page_size=BATCH_SIZE)
        conn.commit()

    cur.close()
    print(f"  신규 INSERT: {len(new_rows)}건, 스킵(기존): {skipped}건")
    return len(new_rows)


def upload_strucprdp(conn, filepath):
    """strucprdp: 배치 UPSERT (obj_cd 기준)"""
    print(f"\n[strucprdp] {os.path.basename(filepath)}")
    headers, rows = read_tsv(filepath)
    cur = conn.cursor()

    all_rows = []
    for row in rows:
        obj_cd = clean(row[0])
        if not obj_cd:
            continue

        fnd_cd = clean(row[1])
        fnd_nm = clean(row[2])
        cntr_nm = clean(row[3])
        asst_lblt = clean(row[4])
        tp = clean(row[5])
        trd_dt = clean(row[6])
        eff_dt = clean(row[7])
        mat_dt = clean(row[8])
        curr = clean(row[9])
        notn = num(row[10])
        mat_prd = num(row[11])
        call_yn = clean(row[12])
        risk_call_yn = clean(row[13])
        struct_cond = clean(row[14])
        pay_cond = clean(row[15])
        pay_freq = clean(row[16])
        pay_dcf = clean(row[17])
        rcv_cond = clean(row[18])
        rcv_freq = clean(row[19])
        rcv_dcf = clean(row[20])
        note = clean(row[21])
        call_dt = clean(row[22])
        trmntn_dt = clean(row[23])
        type1 = clean(row[24])
        type2 = clean(row[25])
        type3 = clean(row[26])
        type4 = clean(row[27])
        optn_freq = clean(row[28]) if len(row) > 28 else None
        call_notice = clean(row[29]) if len(row) > 29 else None
        frst_call_dt = clean(row[30]) if len(row) > 30 else None
        add_optn = clean(row[31]) if len(row) > 31 else None
        upfrnt = clean(row[32]) if len(row) > 32 else None
        no_val = num(row[33]) if len(row) > 33 else None
        created_at = clean(row[34]) if len(row) > 34 else None
        updated_at = clean(row[35]) if len(row) > 35 else None

        all_rows.append((obj_cd, fnd_cd, fnd_nm, cntr_nm, asst_lblt, tp,
                         trd_dt, eff_dt, mat_dt, curr, notn or 0, mat_prd or 0,
                         call_yn, risk_call_yn, struct_cond, pay_cond, pay_freq, pay_dcf,
                         rcv_cond, rcv_freq, rcv_dcf, note, call_dt, trmntn_dt,
                         type1, type2, type3, type4, optn_freq, call_notice,
                         frst_call_dt, add_optn, upfrnt,
                         int(no_val) if no_val else None, created_at, updated_at))

    if all_rows:
        for i in range(0, len(all_rows), BATCH_SIZE):
            batch = all_rows[i:i + BATCH_SIZE]
            execute_values(cur,
                """INSERT INTO strucprdp (obj_cd, fnd_cd, fnd_nm, cntr_nm, asst_lblt, tp,
                    trd_dt, eff_dt, mat_dt, curr, notn, mat_prd, call_yn, risk_call_yn,
                    struct_cond, pay_cond, pay_freq, pay_dcf, rcv_cond, rcv_freq, rcv_dcf,
                    note, call_dt, trmntn_dt, type1, type2, type3, type4,
                    optn_freq, call_notice, frst_call_dt, add_optn, upfrnt, no, created_at, updated_at)
                   VALUES %s
                   ON CONFLICT (obj_cd) DO UPDATE SET
                    fnd_cd=EXCLUDED.fnd_cd, fnd_nm=EXCLUDED.fnd_nm, cntr_nm=EXCLUDED.cntr_nm,
                    asst_lblt=EXCLUDED.asst_lblt, tp=EXCLUDED.tp, trd_dt=EXCLUDED.trd_dt,
                    eff_dt=EXCLUDED.eff_dt, mat_dt=EXCLUDED.mat_dt, curr=EXCLUDED.curr,
                    notn=EXCLUDED.notn, mat_prd=EXCLUDED.mat_prd, call_yn=EXCLUDED.call_yn,
                    risk_call_yn=EXCLUDED.risk_call_yn, struct_cond=EXCLUDED.struct_cond,
                    pay_cond=EXCLUDED.pay_cond, pay_freq=EXCLUDED.pay_freq, pay_dcf=EXCLUDED.pay_dcf,
                    rcv_cond=EXCLUDED.rcv_cond, rcv_freq=EXCLUDED.rcv_freq, rcv_dcf=EXCLUDED.rcv_dcf,
                    note=EXCLUDED.note, call_dt=EXCLUDED.call_dt, trmntn_dt=EXCLUDED.trmntn_dt,
                    type1=EXCLUDED.type1, type2=EXCLUDED.type2, type3=EXCLUDED.type3, type4=EXCLUDED.type4,
                    optn_freq=EXCLUDED.optn_freq, call_notice=EXCLUDED.call_notice,
                    frst_call_dt=EXCLUDED.frst_call_dt, add_optn=EXCLUDED.add_optn, upfrnt=EXCLUDED.upfrnt,
                    no=EXCLUDED.no, updated_at=EXCLUDED.updated_at""",
                batch, page_size=BATCH_SIZE)
        conn.commit()

    cur.close()
    print(f"  UPSERT: {len(all_rows)}건")
    return len(all_rows)


def main():
    target_ts = None
    if len(sys.argv) > 1 and sys.argv[1] == '--date' and len(sys.argv) > 2:
        target_ts = sys.argv[2]

    print("=" * 60)
    print("FICC 테이블 업로드")
    print(f"DataBase 폴더: {DB_DIR}")
    print("=" * 60)

    # 각 테이블의 최신 파일 찾기
    tables = {
        'breakdownprc': upload_breakdownprc,
        'eq_unasp': upload_eq_unasp,
        'excpnp': upload_excpnp,
        'strucprdp': upload_strucprdp,
    }

    files_found = {}
    for table_name in tables:
        f = find_latest_file(table_name, target_ts)
        if f:
            files_found[table_name] = f
            print(f"  {table_name}: {os.path.basename(f)}")
        else:
            print(f"  {table_name}: 파일 없음!")

    if not files_found:
        print("\n업로드할 파일이 없습니다.")
        return

    conn = psycopg2.connect(DB_URL)
    total = 0
    try:
        for table_name, filepath in files_found.items():
            fn = tables[table_name]
            total += fn(conn, filepath)
    except Exception as e:
        conn.rollback()
        print(f"\n오류 발생: {e}")
        raise
    finally:
        conn.close()

    # call_yn 자동 감지: 발행일 이후 MTM=0이면 call_yn='Y'로 업데이트
    print(f"\n--- call_yn 자동 감지 ---")
    conn2 = psycopg2.connect(DB_URL)
    try:
        cur = conn2.cursor()
        cur.execute("""
            WITH zero_mtm AS (
                SELECT s.obj_cd, s.eff_dt, b.std_dt, SUM(b.avg_prc) AS total_mtm
                FROM strucprdp s
                JOIN breakdownprc b ON b.obj_cd = s.obj_cd
                WHERE s.call_yn = 'N' AND b.std_dt > s.eff_dt
                GROUP BY s.obj_cd, s.eff_dt, b.std_dt
                HAVING ABS(SUM(b.avg_prc)) < 0.01
            ),
            first_zero AS (
                SELECT obj_cd, MIN(std_dt) AS call_dt
                FROM zero_mtm GROUP BY obj_cd
            )
            SELECT obj_cd, call_dt FROM first_zero ORDER BY obj_cd
        """)
        call_targets = cur.fetchall()
        if call_targets:
            for obj_cd, call_dt in call_targets:
                cur.execute(
                    "UPDATE strucprdp SET call_yn = 'Y', call_dt = %s, updated_at = NOW() WHERE obj_cd = %s AND call_yn = 'N'",
                    (call_dt, obj_cd)
                )
                print(f"  {obj_cd}: call_yn → Y (call_dt={call_dt})")
            conn2.commit()
            print(f"  → {len(call_targets)}건 업데이트")
        else:
            print("  → 감지된 신규 Call 종목 없음")
    except Exception as e:
        conn2.rollback()
        print(f"  call_yn 감지 오류: {e}")
    finally:
        conn2.close()

    print(f"\n{'=' * 60}")
    print(f"완료: 총 {total}건 처리")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    main()
