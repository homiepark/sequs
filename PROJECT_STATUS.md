# SEQMV — 시퀀스 무브먼트 PT센터 스케줄 앱 (Next.js 리빌드)

> 이 문서는 단일 HTML 버전(`pt-center (1).html`)을 **Next.js 15 + PWA**로 리빌드한 현재 상태를 정리한 문서입니다.
> 다음 세션에서 이 문서를 읽으면 빌드 맥락을 그대로 이어서 작업할 수 있습니다.

---

## 1. 프로젝트 개요
- **대상**: 시퀀스 무브먼트 재활센터 (PT 4인 체제) 스케줄 관리
- **배포 플랫폼**: Vercel (`homiepark/sequs` repo → main 브랜치 자동 배포)
- **DB**: Firebase Realtime Database — 프로젝트 `movement-4a23f`, 리전 `asia-southeast1`, 저장 경로 `/ptcenter`
- **기기**: 모바일(iOS Safari) + PC 동시 지원. PWA 설치 가능.
- **저장소 정책**: 풋살 로그 앱과 독립 — 이 레포(`sequs`)에만 커밋.

## 2. 트레이너 & 운영 시간
| ID | 이름 | 색상(hex) | 비고 |
|----|------|-----------|------|
| t1 | 이성훈 | `#ff6b35` | 대표 (급여 정산 제외) |
| t2 | 최서윤 | `#3ecfff` | 급여 정산 대상 |
| t3 | 박빛나 | `#b07fff` | 원천징수 포함 |
| t4 | 최상민 | `#ff4fad` | 원천징수 포함 |

- 운영 시간: 월~토, 08:00 ~ 21:00 (1시간 단위 + `:30` 체크로 30분 시작 가능)
- 시간 헤더는 `9시` 형식으로 표기 (`formatHourLabel`)

## 3. 기술 스택
- **프레임워크**: Next.js 15 (App Router) + React 19 + TypeScript
- **스타일**: Tailwind CSS 3.4 (`hoverOnlyWhenSupported: true` 옵션 — iOS에서 hover 달라붙음 방지)
- **상태 저장**:
  - `lib/store.tsx` — `StoreProvider`/`useStore` (메모리 + localStorage + Firebase 3단 싱크)
  - `lib/highlight.tsx` — `HighlightProvider` (회원 검색 강조 상태)
- **Firebase**: `firebase/compat` — JSON roundtrip으로 `undefined` 제거 후 `set()` 호출 (bd85494)
- **PWA**: `public/manifest.json` + `public/sw.js`, iOS 설치 안내 시트 (`InstallButton.tsx`)
- **파일 루트**: `/home/user/sequs`

## 4. 디렉터리 구조
```
app/
  layout.tsx         — 루트 레이아웃, 폰트, PWA 메타
  page.tsx           — <App /> 렌더
  globals.css        — 전역 CSS (neonGlow, memberHighlight, blocked-pattern 애니메이션 포함)

lib/
  types.ts           — 모든 타입 + 상수 (TRAINERS, HOURS, SALARY_CONFIGS, SALARY_EXCLUDED) + 헬퍼
  firebase.ts        — Firebase init, writeDB, writeBackupSnapshot (try/catch 보호)
  store.tsx          — StoreProvider / useStore (db, mutate, undo, export/import JSON)
  highlight.tsx      — HighlightProvider / useHighlight
  useGridGestures.ts — 핀치 줌 + 스와이프 (callback ref 방식)
  useContainerWidth.ts — ResizeObserver 기반 컨테이너 너비 훅

components/
  App.tsx            — 최상위 래퍼 (HighlightProvider)
  Header.tsx         — 네비 + 싱크 상태 + Undo 버튼 + 설치 버튼 + 하이라이트 칩
  InstallButton.tsx  — PWA 설치 (iOS 안내 바텀시트)
  PWARegister.tsx    — 서비스워커 등록

components/pages/
  SchedulePage.tsx   — 3뷰 모드 (개별 / 하루전체 / 주간전체) + 주 탭 + 메모바 + 돋보기
  FixedPage.tsx      — 고정 수업 / 고정 블록 관리
  MembersPage.tsx    — 회원 목록 + 멀티 트레이너 + 메모 + 중복 감지
  StatsPage.tsx      — 트레이너별 KPI + 출석 + 급여 정산

components/schedule/
  SessionCard.tsx       — 수업 카드 (가예약 스타일 / 가 배지 / 메모 아이콘 / 하이라이트)
  SessionModal.tsx      — 예약/수정 모달 (자동완성, 가예약 체크, 충돌 감지)
  SessionMemoModal.tsx  — 세션 메모 편집기 (키: sess.time, 레거시 키 폴백)
  ActionMenu.tsx        — 바텀시트(모바일) / 팝업(PC) — 메모 내용 인라인 표시
  BulkBlockModal.tsx    — 다중 슬롯 차단 + 사유
  FixedConflictModal.tsx — 3-way (취소 / 유지 / 덮어쓰기)
  MemberAutocomplete.tsx — 이름/초성 검색 (autofocus)
  FixedEndDateModal.tsx  — 고정 수업 종료일 지정
  CancelChips.tsx       — 캔슬 히스토리 칩 (전역 center 정렬 예외 — 좌측 정렬)
  MemoBar.tsx           — 하루 메모 (세팅 시 네온 펄스)
  WeekTabs.tsx          — 월 범위 주 탭

components/members/
  BulkAddModal.tsx       — 여러 명 동시 추가 + 중복 감지
  MemberSearchModal.tsx  — 전역 검색 (초성)
  MemberScheduleModal.tsx — 특정 회원 전체 스케줄 (과거+미래)

components/ui/
  Modal.tsx        — 기본 모달 (overscroll-contain)
  TrainerTabs.tsx  — 트레이너 필터 (hideAll 옵션)
  Toast.tsx        — 토스트 알림
```

## 5. DB 스키마 (`lib/types.ts` 기준)
```ts
interface DB {
  members: Member[]         // { id, name, phone, tid, tids?, memo? }
  sessions: Session[]       // { id, date, time, tid, mid, customName?, isFixed?, fixedId?, isTentative? }
  fixedSchedules: FixedSchedule[]  // { id, tid, mid, customName?, dayOfWeek(1~6), time, startDate?, endDate?, skippedDates? }
  fixedBlocks?: FixedBlock[]       // { id, tid|"all", dayOfWeek, times[], label?, startDate?, endDate? }
  att: Record<string, AttStatus>   // key: `${date}_${sess.id}` → present/absent/precancel/daycancel
  blocks: Record<string, boolean>  // key: `${date}_${tid}_${time}`
  blockReasons?: Record<string, string>
  cancelHistory: CancelHistoryEntry[]
  memos?: Record<string, string>         // key: date → 하루 메모
  sessionMemos?: Record<string, string>  // key: `${date}_${tid}_${time}` → 수업별 메모
  monthlyExtras?: Record<string, { volansCount?: number }>
}
```

회원 멀티 트레이너: 레거시 단일 `tid`는 `normalizeDB`에서 `tids=[tid]`로 승격. `memberTrainers(m)`/`memberHasTrainer(m, tid)` 헬퍼 사용.

## 6. 구현 완료된 핵심 기능
### 스케줄 페이지 (3뷰 모드)
- **개별 뷰**: 트레이너 1명의 주간 시간×요일 그리드. 주간 수업 요약 헤더.
- **하루 전체 뷰**: 선택 요일의 트레이너 4열 테이블. 기본 진입 시 **오늘 요일**이 먼저 열림 (아닐 시 월요일).
- **주간 전체 뷰**: 월~토 × 트레이너4 CSS 그리드. 모바일에서도 sticky 컬럼 유지 (HTML table → grid 리팩터).
- 뷰 모드 버튼 옆 **돋보기 🔍** — 회원 전역 검색 + 해당 회원 수업에 점선 하이라이트.

### 수업 예약 모달 (`SessionModal.tsx`)
- 트레이너 선택 → 해당 트레이너 회원 자동 필터 (+ "전체 보기" 토글)
- 이름 칸 **오토포커스** + 자동완성 (이름/초성 검색)
- "직접 입력(미등록)", "30분 시작", "가예약", "고정 수업 등록" 체크
- 고정 수업 등록 시 기존 수업 **충돌 감지** → 3-way 선택 (취소/유지/덮어쓰기)

### 수업 액션 메뉴 (`ActionMenu.tsx`)
- 모바일 바텀시트 / PC 팝업 자동 분기
- 메모 아이콘 있는 수업 클릭 시 **메모 내용 인라인 표시**
- 예약 / 수정 / 이번만 수정 / 사전/당일 캔슬 / 캔슬 취소 / 삭제 / 차단 / 가예약 전환 / 종료일 지정

### 자동 출석 & 캔슬 히스토리
- 예약된 수업은 기본 **present** (명시적 취소 없으면 출석 카운트)
- 사전/당일 캔슬 시 `cancelHistory`에 누적. 같은 슬롯 재예약 시에도 캔슬 이력 보존.
- 셀 하단에 "홍길동 사캔/당캔" 칩으로 표시 + ✕로 개별 삭제.

### 가예약(Tentative)
- `isTentative: true` 플래그. 카드에 `가` 배지 + 외곽선 스타일.
- 가예약 상태에서는 `cancelHistory` 생성 없이 깔끔하게 삭제 가능.

### 하루 메모 / 수업 메모
- 하루 메모: 설정되면 상단 배너가 **네온 펄스** (prefers-reduced-motion 가드 제거 — PC에서도 항상 반짝)
- 수업 메모: 슬롯별 저장. 카드에 📝 아이콘 표시. 액션 메뉴 하단 메모 내용 인라인.
- 키: `sess.time` 기준 + 레거시 `ctx.time` 폴백 (:30 저장 이슈 해결).

### 회원 관리 (`MembersPage.tsx`)
- 가나다 정렬, 트레이너 멀티 선택, 메모, 이름 중복 감지
- `BulkAddModal` — 여러 명 한 번에 추가 + 중복 경고

### 통계 (`StatsPage.tsx`)
- 트레이너별 탭, KPI(출석/결석/사전/당일), 회원별 출석 횟수 테이블
- **급여 정산 섹션** (t2/t3/t4): 세션가, 근로소득, 보험, 퇴직적립, 볼란스 카운트, 원천징수
- 이성훈(t1)은 "대표 (수업료 정산 제외)" 배지로 별도 안내

### PWA
- iOS 홈화면 설치 유도 (`InstallButton.tsx`)
- manifest.json + sw.js 등록 (`PWARegister.tsx`)

### Undo
- Ctrl+Z 또는 헤더 ↩ 버튼. `lib/store.tsx` 히스토리 스택 기반.

### 핀치 줌 & 스와이프
- `useGridGestures` — callback ref로 listener 부착 (useRef 객체는 useEffect가 재실행 안 되는 이슈 해결)
- 모든 뷰 모드에서 핀치 줌 동작 + 좌우 스와이프로 주 이동

## 7. 해결된 주요 버그 (커밋 근거)
| 문제 | 해결 커밋 |
|------|-----------|
| Hydration mismatch (localStorage 초기값) | 초기값 `emptyDB()` + useEffect 하이드레이션 |
| Firebase `undefined` crash | `bd85494` — JSON roundtrip으로 undefined 제거 |
| 모바일 sticky 컬럼 너비 깨짐 | `df681eb` — HTML table → CSS grid |
| :30 수업 메모 저장 후 사라짐 | `75e85df` — 메모 키를 `sess.time` 기준으로 |
| 개별 뷰 캔슬 칩 잘림 | `994eae1` — overflow 제거, 셀 minHeight |
| iOS 탭 하이라이트 잔상 | `441d8b8`, `33af91a` — hoverOnlyWhenSupported + tap-highlight 제거 |
| 줌인 시 개별 뷰 회/검 갈라짐 | `51211a6` — sticky 컬럼에도 명시 `bg: var(--sf)` |
| PC 주간 전체 핀치 줌 미동작 | `75273ea` — useRef 객체 대신 callback ref |
| 트레이너 컬럼 오버플로우 → 월요일 숨김 | `2e9370a` — th/td에 명시 width |
| 고정/비고정 카드 크기 차이 | `0beae03` — 모바일 week-all에서 고정 배지 숨김 |
| PC에서 메모 네온 미표시 | `d0a18e0` — `prefers-reduced-motion` 가드 제거 |

## 8. 개발/배포
```bash
# /home/user/sequs
pnpm install                 # 최초 1회
pnpm dev                     # http://localhost:3000
pnpm build && pnpm start     # 프로덕션 로컬 확인
pnpm typecheck               # 타입 체크
```
- Vercel이 `main` 브랜치 push를 감지 → 자동 배포
- Firebase 환경변수는 `lib/firebase.ts`에 하드코딩된 공개 설정 사용

## 9. ⚠️ 유저 액션이 필요한 미해결 항목
### Firebase Realtime Database 보안 규칙 만료 (5일 내)
Firebase에서 "테스트 모드" 규칙이 5일 후 만료된다는 메일을 받음.

**해결 방법** (유저가 직접 Firebase Console에서):
1. https://console.firebase.google.com/ 접속
2. 프로젝트 `movement-4a23f` 선택
3. 좌측 메뉴 → **"Realtime Database" (실시간 데이터베이스)** 클릭
4. 상단 탭에서 **"규칙(Rules)"** 선택
5. 아래와 같이 수정 후 "게시":

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
> ※ 위는 완전 개방 규칙 (내부 팀 전용이라 문제 없음). 공개 앱이 된다면 Firebase Auth 연동 후 `auth != null` 조건으로 바꾸기.

## 10. 최근 커밋 요약 (main, 최신순)
```
1395035 Move 회원 검색 icon from header to next to 주간 전체 view mode button
f2f5b94 Member highlight + schedule drill-in + fixed conflict detection
f3b1f25 Member autocomplete: auto-focus input + 초성 search
d0a18e0 Make memo neon always pulse + stronger glow
8fc4abf Show memo content inline inside the action menu
75e85df Fix :30 session memos vanishing on save
38ae0aa Neon-pulsing memo banner
bd85494 Strip undefined values before Firebase writes
ce169d2 Tentative booking (가예약) + block on canceled cells
55212c2 Optional 차단 사유 on time blocks
90a3b0e Time column: '9시' format, centered and larger
2f3f664 Reset day tab to Monday when navigating to a different week
43b8c83 Add '종료일 지정' for fixed schedules; warn harder on full delete
51211a6 Fix gray/black split on zoomed-in 개별 view
441d8b8 Tailwind hoverOnlyWhenSupported so hover never sticks on iOS taps
df681eb Salary configs + week-all to CSS grid
0f19fd5 Add install-to-home-screen button with iOS instructions
```

## 11. 다음 세션에서 이어갈 때 체크리스트
1. `git pull origin main` 으로 최신 코드 받기
2. `pnpm install && pnpm dev`
3. 위 **9번** Firebase 규칙 만료 이슈 유저에게 확인 (이미 처리했는지)
4. 이후 요청은 대화에서 받기
5. 커밋은 설명 한국어 ok, 네임스페이스 없이 짧은 명령형 영어 타이틀 유지 (예: `Fix ...`, `Add ...`, `Make ...`)

---

_레거시 단일 HTML 버전 요약은 `pt-center-project-summary.md` 참고._
