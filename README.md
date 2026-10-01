# 책길 Frontend — 혼합 진단 데모

CAU 캡스톤 8조의 진단·프로필 화면입니다. Backend main의 혼합 assessment API(`SELF_REPORT` + `MULTIPLE_CHOICE`)를 사용하며 외부 패키지 없이 Node.js 22 이상으로 실행합니다. Passage-grounded comprehension 문항은 제시문, question-only prompt, 네 선택지를 분리해 표시합니다.

## 구현 단계

| 단계 | 범위 | 상태 |
| --- | --- | --- |
| 1 | 분야 선택 → 혼합 진단 답변 저장 → 이어하기 → 프로필 표시 | 구현, API/프록시 테스트 및 fixture 브라우저 검증 |
| 2 | 추천 도서 목록·추천 이유 | 구현. prerequisite-first v2의 준비도·학습 기회·근거 표시 |
| 3 | 피드백 | 미구현 |
| 4 | 실제 Spring·ML·PostgreSQL과 전체 흐름 검증 | 로컬 통합 검증 |

현재 점수는 서버가 반환한 값을 표시합니다. 객관식 정답과 해설은 Frontend에 전달되지 않으며 correctness는 Backend가 snapshot answer key로 계산합니다. 결과를 과학적으로 검증된 능력 측정으로 설명하지 않고, `stub` 계산 버전은 화면에 데모라고 표시합니다. 파이프라인·ML·Backend 저장소 변경은 없습니다.

## 실행

1. [Backend 실행 문서](https://github.com/CAU-2026-2-capstone-5-team-8/Backend)를 따라 서버와 DB, 데모 사용자·분야·문항을 준비합니다.
2. 이 저장소에서 `npm start`를 실행합니다. 별도의 `npm install`은 필요 없습니다.
3. 브라우저에서 <http://127.0.0.1:5173>을 열고 실제 데모 사용자 번호와 하위 분야를 선택합니다. 사용자 번호의 기본값 1은 존재를 보장하지 않습니다.

기본 백엔드 주소는 `http://127.0.0.1:8080`입니다. macOS 또는 Linux shell에서 변경하려면:

```sh
BACKEND_URL=http://127.0.0.1:8080 npm start
```

`PORT` 환경변수로 프론트 포트를 바꿀 수 있습니다. 브라우저는 동일 출처의 `/api`로 요청하고 개발 서버가 지정된 백엔드로 전달합니다. 인증 없는 **로컬 개발용** 서버로, `127.0.0.1`에만 바인딩합니다. 운영 배포 전 인증·인가와 운영 프록시 구성이 필요합니다.

## 동작과 제한

- `SELF_REPORT`는 `knowsConcept`, `MULTIPLE_CHOICE`는 zero-based `selectedChoiceIndex`로 답변하며 저장 성공 후에만 다음 문항으로 이동합니다.
- 객관식 passage와 prompt는 별도 영역에 표시하고 선택지는 Backend 순서를 유지합니다. Frontend는 정답을 알거나 추측하지 않습니다.
- 모든 문항을 저장해야 프로필 확인 버튼이 나타납니다. 이전 문항으로 돌아가 수정할 수 있습니다.
- 브라우저에 최근 진단 ID만 저장합니다. 새로고침 후 ‘이전 진단 이어하기’로 서버의 저장 상태를 복구합니다. 아직 저장하지 않은 선택은 복구되지 않습니다.
- 계산 중인 진단은 답변 폼을 숨깁니다. 완료 API 오류 시 서버 메시지와 문의 번호를 표시하고 재시도할 수 있습니다.
- 통신 오류가 나면 먼저 ‘저장 상태 다시 확인’을 사용하세요. 진단 생성 응답을 받기 전에 연결이 끊긴 경우에는 생성 결과를 자동 복구할 수 없습니다.
- 현재 승인된 generated Linear Algebra 문항은 Level 1 5문항과 grounded comprehension v4 1문항으로, generated-only 9문항 bank는 아직 완성되지 않았습니다. 실제 Backend assessment 생성은 coverage 부족으로 실패할 수 있습니다.
- 피드백, 로그인, 분야별 generated bank 확장, 모바일 실기기 검증은 이번 단계에 포함되지 않습니다.

## 검증

```sh
npm run check
npm test
```

자동 테스트는 두 answer mode의 진행률과 요청 body, 잘못된 답변의 network-call 전 차단, legacy self-report 호환, ID 검증, HTML 오류 응답 차단, API 오류 정보 보존, 프록시의 경로·본문·HTTP 상태 전달, 정적 파일 노출 범위, 리다이렉트 차단을 확인합니다.

브라우저 fixture는 8개의 자기평가와 1개의 v4-like grounded comprehension 문항으로 구성됩니다. 실제 승인된 v4 문항의 display passage, stem, choices를 UI contract 확인용으로 복사했지만 production artifact 동기화나 실제 Spring/DB 통합 테스트를 대신하지 않습니다.

백엔드 없이 화면만 확인할 때는 첫 터미널에서 `node test/demo-backend.mjs`, 두 번째 터미널에서 아래를 실행합니다:

```sh
BACKEND_URL=http://127.0.0.1:8089 npm start
```

fixture는 메모리에서 단일 진단만 유지하며 프로필은 고정값입니다. 상세 진단 fixture만 서버 내부에 테스트용 객관식 정답 인덱스를 사용합니다. 정답은 API 응답에 포함하지 않으며 production 정답/채점 구현이 아닙니다. 실제 generated v4 import는 Backend의 documented `question-import` flow가 필요합니다. `npm start`는 fixture를 자동 실행하지 않습니다.

## API 요청 예제

VS Code REST Client 등에서 [requests/assessment.http](requests/assessment.http)를 열면 수동으로 동일 흐름을 실행할 수 있습니다. 예제 ID를 실제 응답으로 교체하고 **모든 발급 문항에 답변한 후** 완료 요청을 보내세요. `conceptId`가 아니라 `questions[].id`가 답변 API의 문항 ID입니다.


## 상세 진단과 화면 개편 (2026-10-02)

완료한 진단의 결과 화면에서 `GET /api/assessments/{sessionId}/diagnostics`를 별도로 호출합니다. 개념별 펼침 영역에는 기초/중간/심화 × 어휘/배경지식/개념 이해 응답 점수와 응답 수, 자기평가/객관식 출처 수, 다음 복습·확인 항목이 표시됩니다. 0%와 미측정은 구별하며 책 난이도나 숙달 확률로 해석하지 않습니다. 미등록 개념 ID는 원문을 표시합니다.

- Backend PR #27, ML PR #31의 진단 API가 반영된 서버가 필요합니다. Frontend만 반영하면 서버 버전에 따라 상세 진단 사용 불가 안내가 나옵니다.
- 상세 진단 로딩/실패/재시도는 프로필·추천과 독립적입니다. 화면 이동 후 늦게 도착한 응답은 새 화면을 덮어쓰지 않습니다.
- 흰색·자주색 중심의 첫 화면, 실제 API 분야 라디오 선택, 제시문·객관식·결과·추천의 글자 크기와 여백을 정리했습니다. 외부 폰트/CDN/패키지를 추가하지 않았습니다.
- 현재 ML 기준으로 다시 조회하므로 과거 저장 프로필과 같은 기준 버전이라고 보장하지 않습니다. 응답 점수는 표본 수와 자기평가 비중을 함께 보세요.

자동 테스트에는 상세 진단 API 경로, 0%/미측정 구분, 출처 표시, HTML 이스케이프, 오류 및 재시도, 화면 이동 중 응답 도착을 추가했습니다. 브라우저에서는 9문항 완료→프로필→개념별 근거→추천 이동과 390px 화면을 fixture로 확인했습니다. 실제 Spring/DB/ML 전체 E2E나 모바일 실기기 검증은 아닙니다.

fixture 서버 포트는 `PORT`로 바꿀 수 있습니다. `DIAGNOSTICS_UNAVAILABLE=1`로 실행하면 완료 후 상세 진단에 503을 반환하여 오류 UI를 확인할 수 있습니다. 진단 fixture의 수치는 테스트 응답에서 계산하지만 실제 ML 알고리즘을 사용하지 않습니다.

## 내 서재·책별 후기

상단 **내 서재**에서 등록 도서를 찾아 담고, 읽고 싶어요/읽는 중/완독 상태와 메모(1,000자)를 저장합니다. 추천 결과에서도 책을 담을 수 있습니다. 이미 담은 책의 메모와 상태는 덮어쓰지 않습니다. 공개 후기(300자)와 체감 난이도는 별도 폼에서 저장하며 책별로 다른 독자에게 표시됩니다. 서재에서 제외해도 공개 후기는 유지되며 별도로 삭제할 수 있습니다.

Backend의 `reading-shelf-reviews` 기능이 필요합니다. 기존 12개 API 외에 서재/후기 API 7개를 사용합니다. userId는 시작 화면의 체험 계정 설정과 동일하며, 로그인 없이 번호로 구분하는 로컬 데모입니다. 메모를 공개 후기 목록에 내보내지 않지만 인증된 비공개 저장소는 아닙니다. 후기 정보를 ML 점수에 자동 반영하지 않습니다.

화면 fixture는 `test/library-fixture.mjs`의 메모리 저장소를 사용합니다. 재시작하면 기록이 사라지고 인증·실제 DB 저장을 검증하지 않습니다. 실제 데이터 저장과 사용자별 키 검증은 Backend PostgreSQL 통합 테스트에서 담당합니다.
