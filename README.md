# 책길 Frontend — React Native + Expo

프론트는 `native/`의 React Native + Expo 앱으로 개발합니다. iOS·Android·웹이 같은 화면과 API를 공유하며, 도서 탐색, 개념별 진단, 공통 개념 지도, 도서별 비교, 능력별 추천과 저장 복원, 회원가입·로그인·내 계정과 서재·독서 기록·공개 한줄평을 제공합니다.

화면은 밝은 글래스모피즘 테마를 사용합니다. 색상·표면·반응형·접근성 기준은 [design.md](design.md)에 기록하며 공통 토큰과 컴포넌트로 구현합니다.

## 실행

Node.js 22 이상이 필요합니다. Frontend 폴더에서 실행하세요.

```sh
npm --prefix native ci
npm start       # Expo 모바일 개발 서버
npm run web     # React Native 웹 빌드 + 로컬 API 프록시, 5183 포트
```

웹은 <http://127.0.0.1:5183>에서 확인할 수 있습니다. Backend 기본 주소는 `http://127.0.0.1:8087`이며 `BACKEND_URL`로 바꿉니다. 모바일 실행과 API 주소 설정, 화면 구조 및 현재 평가 범위는 [앱 문서](native/README.md)를 참고하세요.

서버와 데이터는 [실데이터 등록 문서](../Backend/docs/linear-algebra-live-handoff.md)와 [개념 진단·추천 계약](../Backend/docs/concept-learning-v1.md)을 참고하세요. 수동 진단 요청 예제는 [requests/assessment.http](requests/assessment.http)에 있습니다.

## 검증

```sh
npm run check       # 타입·린트, 인증/콘텐츠 검사, 웹 프록시 HTTP 검사
npm run build:web   # RN 웹 번들 생성
```

CI도 같은 검사를 실행합니다. 모바일 번들 및 실기기 검증 범위는 [앱 검증 기록](native/README.md#검증)을 참고하세요.

## 개발 방향

2026-10-03 사용자 결정에 따라 React Native + Expo를 유일한 프론트로 사용합니다. 기존 HTML/JavaScript 화면, 개발 서버, 데모 fixture와 해당 테스트는 제거했습니다.

향후 책장 사진 기능은 촬영 → 책별 영역/텍스트 인식 → 도서 식별·사용자 확인 → 식별된 도서만 대상으로 기존 개념 추천을 적용하는 방향입니다. 카메라/OCR 기능은 아직 구현하지 않았으며, OCR만으로 책의 난이도나 내용을 추정하지 않습니다.
