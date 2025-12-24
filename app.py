import streamlit as st
import pandas as pd
import os

# -----------------------------------------------------------------------------
# 1. 기본 설정 및 파일 로드
# -----------------------------------------------------------------------------
TARGET_FILE = 'G.BTB_20251222.xlsx'

st.set_page_config(page_title="Gapping BTB Dashboard", layout="wide")


@st.cache_data
def load_excel_raw(file_name):
    """엑셀 파일을 헤더 없이 원본 그대로 읽어옵니다 (위치 기반 데이터 추출용)"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, file_name)

    if not os.path.exists(file_path):
        return None

    # header=None으로 설정하여 엑셀의 모든 셀을 있는 그대로 읽어옴
    df = pd.read_excel(file_path, sheet_name=0, header=None, engine='openpyxl')
    return df


def find_loc(df, keyword):
    """엑셀에서 특정 단어(keyword)가 포함된 셀의 위치(행, 열)를 찾습니다."""
    # 데이터프레임 전체를 순회하며 키워드 검색
    for r in range(len(df)):
        for c in range(len(df.columns)):
            val = str(df.iat[r, c]).strip()
            # 엑셀 셀 안에 줄바꿈이 있어도 찾을 수 있도록 처리
            if keyword in val:
                return r, c
    return None, None


def clean_number(value):
    """엑셀의 숫자(문자열 섞인 경우 포함)를 파이썬 숫자로 변환합니다."""
    try:
        if pd.isna(value) or str(value).strip() == '': return 0
        if isinstance(value, (int, float)): return value
        # 콤마 제거 및 숫자 변환
        return float(str(value).replace(',', ''))
    except:
        return 0


# -----------------------------------------------------------------------------
# 2. 메인 대시보드 화면 구성
# -----------------------------------------------------------------------------
def main():
    st.title(f"📊 BTB Monitoring Dashboard")

    df = load_excel_raw(TARGET_FILE)

    if df is None:
        st.error(f"❌ 파일을 찾을 수 없습니다: {TARGET_FILE}")
        st.warning("엑셀 파일이 app.py와 같은 폴더에 있는지 확인해주세요.")
        return

    # --- [상단] 핵심 지표 (KPI) 파싱 ---
    # 1. 기준일 찾기
    r_date, c_date = find_loc(df, "기준일")
    date_str = df.iat[r_date, c_date + 1] if r_date is not None else "-"

    # 2. 잔고 찾기 ("원화 잔고(억)" 위치 기준)
    r_bal, c_bal = find_loc(df, "원화 잔고(억)")

    # 3. PnL 찾기 ("daily PnL" 위치 기준)
    r_pnl, c_pnl = find_loc(df, "daily PnL")

    # 상단 요약 표시
    st.markdown(f"### 📅 기준일: **{date_str}**")

    kpi1, kpi2, kpi3, kpi4 = st.columns(4)

    if r_bal is not None:
        won_bal = clean_number(df.iat[r_bal, c_bal + 1])  # 원화 잔고
        usd_bal = clean_number(df.iat[r_bal + 1, c_bal + 1])  # 외화 잔고
        total_bal = clean_number(df.iat[r_bal + 2, c_bal + 1])  # 전체 잔고 (보통 2칸 아래)

        kpi1.metric("전체 운용 잔고", f"{total_bal:,.0f} 억")
        kpi2.metric("원화 잔고", f"{won_bal:,.0f} 억")
        kpi3.metric("외화 잔고", f"{usd_bal:,.0f} 억")

    if r_pnl is not None:
        # daily PnL은 키워드 바로 오른쪽 칸
        daily_val = clean_number(df.iat[r_pnl, c_pnl + 1])
        kpi4.metric("Daily PnL", f"{daily_val:,.0f}")

    st.divider()

    # --- [중단] 탭(Tab)으로 상세 정보 구분 ---
    tab1, tab2, tab3 = st.tabs(["💰 손익(PnL) 상세", "⚠️ 리스크(Risk) 관리", "📉 분포 분석"])

    # === Tab 1: PnL 상세 ===
    with tab1:
        st.subheader("PnL Attribution Breakdown")

        # PnL 항목 추출 로직 (왼쪽 '미인식' 세트와 오른쪽 '인식' 세트 모두 확인)
        pnl_items = []

        # 1. 미인식 Set 찾기
        r1, c1 = find_loc(df, "캐리미인식 set PnL")
        if r1:
            for i in range(1, 15):  # 아래로 15줄 탐색
                if r1 + i >= len(df): break
                name = df.iat[r1 + i, c1]
                val = df.iat[r1 + i, c1 + 1]
                if pd.notna(name) and str(name).strip() != "":
                    # 값이 숫자인 경우만
                    num = clean_number(val)
                    if num != 0: pnl_items.append({"Item": str(name), "PnL": num, "Type": "미인식/기타"})

        # 2. 인식 Set 찾기
        r2, c2 = find_loc(df, "캐리인식 set PnL")
        if r2:
            for i in range(1, 15):
                if r2 + i >= len(df): break
                name = df.iat[r2 + i, c2]
                val = df.iat[r2 + i, c2 + 1]
                if pd.notna(name) and str(name).strip() != "":
                    num = clean_number(val)
                    if num != 0: pnl_items.append({"Item": str(name), "PnL": num, "Type": "인식"})

        # 시각화
        col_pnl1, col_pnl2 = st.columns([2, 1])

        with col_pnl1:
            if pnl_items:
                pnl_df = pd.DataFrame(pnl_items)
                # 막대 차트 (Streamlit 내장 차트 사용)
                st.bar_chart(pnl_df.set_index("Item")['PnL'])
            else:
                st.info("PnL 상세 내역을 찾을 수 없습니다.")

        with col_pnl2:
            if pnl_items:
                st.dataframe(pnl_df, hide_index=True, use_container_width=True)

    # === Tab 2: 리스크 테이블 ===
    with tab2:
        st.subheader("🔥 Top 3 고위험 종목 (조기종료)")
        r_risk, c_risk = find_loc(df, "top3 고위험 종목")

        if r_risk:
            # 헤더(제목)와 데이터(3줄) 추출
            # 헤더 포함 4줄, 데이터 8칸(컬럼) 가져오기
            headers = df.iloc[r_risk, c_risk:c_risk + 8].values
            data_rows = df.iloc[r_risk + 1:r_risk + 4, c_risk:c_risk + 8].values

            risk_df = pd.DataFrame(data_rows, columns=headers)
            # 첫 번째 컬럼(순위)을 인덱스처럼 사용하거나 숨김
            st.dataframe(risk_df, hide_index=True, use_container_width=True)
        else:
            st.info("고위험 종목 데이터를 찾을 수 없습니다.")

        st.divider()

        st.subheader("⚡ Top 3 고확률 종목 (자산스왑)")
        r_prob, c_prob = find_loc(df, "top3 고확률 종목")
        if r_prob:
            headers_prob = df.iloc[r_prob, c_prob:c_prob + 8].values
            data_prob = df.iloc[r_prob + 1:r_prob + 4, c_prob:c_prob + 8].values
            prob_df = pd.DataFrame(data_prob, columns=headers_prob)
            st.dataframe(prob_df, hide_index=True, use_container_width=True)

    # === Tab 3: 분포 차트 ===
    with tab3:
        st.subheader("조기 종료시 PnL 변화 분포")
        # "조기 종료시 PnL" 글자 찾기 (줄바꿈 포함될 수 있어 부분일치 사용)
        r_dist, c_dist = find_loc(df, "조기 종료시 PnL")

        if r_dist:
            dist_data = []
            # 데이터가 제목보다 2칸 아래(r_dist+2) 줄부터 시작한다고 가정
            for i in range(2, 10):
                label = df.iat[r_dist + i, c_dist]  # 구간 이름 (예: 20억 ~ 30억)
                if pd.isna(label): break

                # 구조: [구간명] [원화] [외화] [합계(Sum)]
                val_sum = clean_number(df.iat[r_dist + i, c_dist + 3])
                dist_data.append({"Range": label, "PnL Change": val_sum})

            if dist_data:
                chart_df = pd.DataFrame(dist_data)
                # 인덱스를 Range로 설정하여 차트의 X축으로 사용
                st.bar_chart(chart_df.set_index("Range"))
            else:
                st.info("분포 데이터를 읽을 수 없습니다.")


if __name__ == "__main__":
    main()