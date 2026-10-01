# 독서 공간 UI 개편

## 참고한 GitHub 프로젝트
- https://github.com/booklore-app/booklore : 서재와 책 탐색을 구분하는 정보 구조.
- https://github.com/readest/readest : 독서에 집중하는 화면 구성. README의 실제 화면 이미지도 확인했다.
- 화면 참고: https://github.com/readest/readest/blob/main/data/screenshots/landing_all_platforms.png

외부 프로젝트의 소스나 이미지 파일은 복사하지 않았다. 기존 vanilla JS와 API를 유지하면서 직접 구현했다.

## 변경
- 사이드 탐색 메뉴에서 진단 / 책 둘러보기 / 서재를 바로 이동한다.
- 흰색과 차콜을 기본으로 파란색을 선택 상태와 주요 동작에 사용한다.
- 서재와 도서 목록은 책 중심의 그리드로 표시한다. 실제 표지가 API에 없어 제목으로 만든 대체 디자인을 사용한다.
- 메모 및 공개 후기 편집은 기록 관리 안에 접어 둔다. 저장 API와 공개 범위는 기존과 같다.
- 작은 화면에서는 상단 탐색 메뉴로 바뀌고 기록 편집은 전체 너비를 사용한다.

## 확인
- Node 테스트 28개 통과.
- 브라우저에서 탐색 메뉴 전환, 메모 저장, 공개 후기 조회 확인.
- 390px 모바일에서 가로 넘침 없음 확인.
- 미리보기는 로컬 fixture 데이터. 실제 연동은 Backend PR #29가 필요하다.
