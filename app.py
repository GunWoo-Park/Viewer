import streamlit as st
import pandas as pd
import os

# -----------------------------------------------------------------------------
# 1. 파일 경로 설정 (코드 파일과 같은 폴더에 위치해야 함)
# -----------------------------------------------------------------------------
TARGET_FILE = 'app/ui/dashboard/G.BTB_20251222.xlsx'

# 페이지 기본 설정
st.set_page_config(page_title="Excel Viewer", layout="wide")


# 2. 데이터 로드 함수 (캐싱 적용으로 속도 향상)
@st.cache_data
def load_all_sheets(file_name):
    """
    엑셀 파일의 모든 시트를 한 번에 읽어옵니다.
    sheet_name=None: 모든 시트를 {'시트명': DataFrame} 형태의 딕셔너리로 반환
    """
    # 현재 실행 중인 파일의 위치를 기준으로 절대 경로 생성
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, file_name)

    if not os.path.exists(file_path):
        return None

    return pd.read_excel(file_path, sheet_name=None, engine='openpyxl')


def main():
    st.title(f"📊 {TARGET_FILE} 시각화")

    # 3. 데이터 로드
    all_sheets = load_all_sheets(TARGET_FILE)

    # 파일이 없을 경우 에러 메시지 표시
    if all_sheets is None:
        st.error(f"❌ 파일을 찾을 수 없습니다: **{TARGET_FILE}**")
        st.warning("프로젝트 폴더(파이썬 파일 위치)에 엑셀 파일이 있는지 확인해주세요.")
        return

    # 시트 이름 목록 가져오기
    sheet_names = list(all_sheets.keys())

    if not sheet_names:
        st.warning("엑셀 파일에 시트가 없습니다.")
        return

    # 4. 사이드바에서 시트 선택 기능
    st.sidebar.header("🗂 시트 선택")
    selected_sheet = st.sidebar.radio("확인할 시트를 선택하세요:", sheet_names)

    # 5. 선택된 시트의 데이터 가져오기
    df = all_sheets[selected_sheet]

    # 6. 데이터 시각화 (표)
    st.markdown(f"### 📌 Sheet: **{selected_sheet}**")
    st.caption(f"데이터 크기: {df.shape[0]} 행, {df.shape[1]} 열")

    # 데이터프레임 표시 (use_container_width=True로 가로 꽉 차게 표시)
    st.dataframe(df, use_container_width=True)

    # 7. (선택사항) 데이터 그래프 시각화
    # 숫자형 데이터가 있는 경우에만 그래프 옵션을 보여줍니다.
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()

    if numeric_cols:
        with st.expander("📈 데이터 그래프 보기 (클릭하여 펼치기)"):
            col1, col2 = st.columns([1, 3])

            with col1:
                chart_type = st.selectbox("그래프 유형", ["Line Chart", "Bar Chart", "Area Chart"])
                # X축은 전체 컬럼 중 선택, Y축은 숫자 컬럼 중 선택
                x_axis = st.selectbox("X축 선택", df.columns)
                y_axis = st.multiselect("Y축 선택", numeric_cols, default=numeric_cols[:1])

            with col2:
                if y_axis:
                    chart_data = df.set_index(x_axis)[y_axis]
                    if chart_type == "Line Chart":
                        st.line_chart(chart_data)
                    elif chart_type == "Bar Chart":
                        st.bar_chart(chart_data)
                    elif chart_type == "Area Chart":
                        st.area_chart(chart_data)


if __name__ == "__main__":
    main()