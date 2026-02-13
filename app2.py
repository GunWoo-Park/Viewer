import streamlit as st
import pandas as pd
import os

# -----------------------------------------------------------------------------
# 1. 설정 및 데이터 파싱 로직
# -----------------------------------------------------------------------------
# 엑셀 파일명을 정확히 지정하세요.
TARGET_FILE = 'G.BTB_20251222_2.xlsx'

st.set_page_config(page_title="Structured Swap Dashboard", layout="wide", page_icon="📈")

# 숫자 우측 정렬 및 메트릭 스타일 지정
st.markdown("""
    <style>
        [data-testid="stMetricValue"] { font-size: 1.6rem !important; }
        .stDataFrame td { text-align: right !important; }
    </style>
""", unsafe_allow_html=True)


def clean_number(x):
    """문자열(콤마, 괄호 등)이 섞인 숫자를 안전하게 float로 변환합니다."""
    if pd.isna(x) or str(x).strip() in ['', '-', 'nan']: return 0.0
    try:
        val_str = str(x).replace(',', '').strip()
        # 회계 포맷: (100) -> -100 처리
        if val_str.startswith('(') and val_str.endswith(')'):
            val_str = '-' + val_str[1:-1]
        return float(val_str)
    except:
        return 0.0


@st.cache_data
def load_and_parse_data(file_name):
    """
    엑셀 파일을 읽어와서 상단 KPI와 각 상품 섹션(DataFrame)으로 자동 분리합니다.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, file_name)

    # 지정된 파일이 없으면 폴더 내 첫 번째 xlsx 파일로 시도
    if not os.path.exists(file_path):
        files = [f for f in os.listdir(current_dir) if f.endswith('.xlsx') and not f.startswith('~$')]
        if files:
            file_path = os.path.join(current_dir, files[0])
            # st.toast(f"⚠️ '{file_name}'이 없어 '{files[0]}' 파일을 로드합니다.", icon="📂")
        else:
            return None, None

    # 헤더 없이 원본 읽기
    df_raw = pd.read_excel(file_path, header=None, engine='openpyxl')

    global_info = {}
    parsed_sections = {}

    # --- 1. 상단 글로벌 정보 추출 (기준일, 잔고 등) ---
    # 상위 30행 탐색
    for r in range(min(30, len(df_raw))):
        for c in range(len(df_raw.columns) - 1):
            val = str(df_raw.iat[r, c]).strip()

            if "원화 잔고" in val:
                global_info['KRW_Bal'] = clean_number(df_raw.iat[r, c + 1])
            elif "외화 잔고" in val:
                global_info['USD_Bal'] = clean_number(df_raw.iat[r + 1, c + 1])  # 보통 바로 아래 행
            elif "After" in val:  # 기준일 (After 옆)
                global_info['Date'] = str(df_raw.iat[r, c + 1]).split(" ")[0]

    # --- 2. 섹션(상품 그룹) 분리 로직 ---
    # "Type"과 "STR.No."가 동시에 등장하는 행을 각 표의 '헤더'로 인식
    header_rows = []
    for idx, row in df_raw.iterrows():
        # 앞쪽 5개 컬럼만 문자열로 합쳐서 검색 (속도 최적화)
        row_str = " ".join([str(x) for x in row.values[:6] if pd.notna(x)])
        if "Type" in row_str and "STR" in row_str:
            header_rows.append(idx)

    for i, start_row in enumerate(header_rows):
        # (1) 섹션 이름 찾기 (헤더 1~3행 위쪽 탐색)
        section_name = f"Section {i + 1}"
        for offset in range(1, 4):
            if start_row - offset >= 0:
                # A열 또는 B열에서 제목 찾기
                candidate_a = str(df_raw.iat[start_row - offset, 0]).strip()
                candidate_b = str(df_raw.iat[start_row - offset, 1]).strip()

                # 'ROLL', 'nan'이 아닌 유효한 텍스트를 제목으로 선정
                if candidate_a and candidate_a not in ['nan', 'ROLL']:
                    section_name = candidate_a
                    break
                elif candidate_b and candidate_b not in ['nan', 'ROLL']:
                    section_name = candidate_b
                    break

        # (2) 데이터 끝 찾기 (다음 헤더 전까지)
        end_row = len(df_raw)
        if i < len(header_rows) - 1:
            end_row = header_rows[i + 1] - 3  # 다음 섹션 헤더 위쪽 여백 고려

        # (3) 데이터프레임 생성
        # 헤더값 가져오기 및 중복 컬럼명 처리
        raw_cols = df_raw.iloc[start_row].astype(str).values
        cols = []
        counts = {}
        for col in raw_cols:
            col = col.strip()
            if col in counts:
                counts[col] += 1
                cols.append(f"{col}_{counts[col]}")  # 중복 시 _1, _2 붙임
            else:
                counts[col] = 0
                cols.append(col)

        sub_df = df_raw.iloc[start_row + 1: end_row].copy()
        sub_df.columns = cols

        # (4) 유효 데이터 필터링: STR 번호가 있는 행만 남김
        str_col_name = next((c for c in cols if "STR" in c), None)
        if str_col_name:
            sub_df = sub_df[sub_df[str_col_name].notna()]
            sub_df = sub_df[sub_df[str_col_name].astype(str).str.strip() != 'nan']

            # (5) 숫자 변환 (MTM, P/L, Notional 등 주요 컬럼)
            for c in sub_df.columns:
                if any(k in c for k in ['MTM', 'P/L', 'CF', 'Sum', 'Carry', 'NT', 'Valuation']):
                    sub_df[c] = sub_df[c].apply(clean_number)

            parsed_sections[section_name] = sub_df

    return global_info, parsed_sections


# -----------------------------------------------------------------------------
# 3. 메인 UI 구성
# -----------------------------------------------------------------------------
def main():
    st.title("📊 구조화 스왑(BTB) 포트폴리오")

    # 데이터 로드
    global_info, sections = load_and_parse_data(TARGET_FILE)

    if sections is None:
        st.error(f"❌ '{TARGET_FILE}' 파일을 찾을 수 없습니다.")
        return

    # --- [상단] KPI 계기판 ---
    # 전체 PnL 집계 (각 섹션의 Daily PnL 합산)
    total_daily_pnl = 0
    total_mtm = 0
    summary_data = []

    for name, df in sections.items():
        # PnL 컬럼 찾기 (Daily P/L이 포함된 마지막 컬럼 사용)
        pnl_cols = [c for c in df.columns if "Daily P/L" in c or "Daily Carry" in c or "P/L Chg" in c]
        pnl_col = pnl_cols[-1] if pnl_cols else None

        # MTM 컬럼 찾기 (보통 Sum이나 Valuation)
        mtm_cols = [c for c in df.columns if "Sum" in c or "Valuation" in c]
        mtm_col = mtm_cols[0] if mtm_cols else None

        sec_pnl = df[pnl_col].sum() if pnl_col else 0
        sec_mtm = df[mtm_col].sum() if mtm_col else 0

        total_daily_pnl += sec_pnl
        total_mtm += sec_mtm
        summary_data.append({"Product": name, "Daily PnL": sec_pnl, "Total MTM": sec_mtm})

    # KPI 표시
    st.markdown(f"### 📅 기준일: **{global_info.get('Date', '-')}**")

    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    kpi1.metric("🇰🇷 원화 잔고", f"{global_info.get('KRW_Bal', 0):,.0f} 억")
    kpi2.metric("🇺🇸 외화 잔고", f"{global_info.get('USD_Bal', 0):,.0f} 억")
    kpi3.metric("💰 Total Daily PnL", f"{total_daily_pnl:,.0f}")
    kpi4.metric("📦 Total Net MTM", f"{total_mtm:,.0f}")

    st.divider()

    # --- [중단] 섹션별 성과 차트 ---
    if summary_data:
        summ_df = pd.DataFrame(summary_data).set_index("Product").sort_values("Daily PnL", ascending=False)

        col_chart, col_summ = st.columns([2, 1])
        with col_chart:
            st.subheader("📈 상품별 손익(PnL) 현황")
            # 0이 아닌 데이터만 차트에 표시
            chart_df = summ_df[summ_df['Daily PnL'] != 0]
            st.bar_chart(chart_df['Daily PnL'], color="#FF4B4B")

        with col_summ:
            st.subheader("📋 섹션별 요약")
            st.dataframe(summ_df.style.format("{:,.0f}"), use_container_width=True, height=400)

    st.divider()

    # --- [하단] 상세 내역 (탭) ---
    st.subheader("🔍 상세 거래 내역")

    # 탭 이름 정리 ($ 기호 제거 등)
    clean_keys = [k.replace("$", "").strip() for k in sections.keys()]
    tabs = st.tabs(clean_keys)

    for i, key in enumerate(sections.keys()):
        with tabs[i]:
            df_detail = sections[key]

            # PnL 컬럼 하이라이트 함수 (이익: 초록, 손실: 빨강)
            pnl_cols = [c for c in df_detail.columns if "P/L" in c or "Chg" in c]
            target_col = pnl_cols[-1] if pnl_cols else None

            def highlight_pnl(val):
                if isinstance(val, (int, float)):
                    if val < 0: return 'background-color: #ffebee; color: black'  # 연한 빨강
                    if val > 0: return 'background-color: #e8f5e9; color: black'  # 연한 초록
                return ''

            # 데이터프레임 스타일링 표시
            st_df = df_detail.style.format(precision=0, thousands=",")
            if target_col:
                st_df = st_df.map(highlight_pnl, subset=[target_col])

            st.dataframe(st_df, use_container_width=True, height=600)


if __name__ == "__main__":
    main()