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

fixture는 메모리에서 단일 진단만 유지하며 프로필은 고정값입니다. 객관식 정답은 포함하거나 노출하지 않습니다. 실제 generated v4 import는 Backend의 documented `question-import` flow가 필요합니다. `npm start`는 fixture를 자동 실행하지 않습니다.

## API 요청 예제

VS Code REST Client 등에서 [requests/assessment.http](requests/assessment.http)를 열면 수동으로 동일 흐름을 실행할 수 있습니다. 예제 ID를 실제 응답으로 교체하고 **모든 발급 문항에 답변한 후** 완료 요청을 보내세요. `conceptId`가 아니라 `questions[].id`가 답변 API의 문항 ID입니다.
