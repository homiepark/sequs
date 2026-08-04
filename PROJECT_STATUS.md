# SEQMV — 시퀀스 무브먼트 PT센터 스케줄 앱 (Next.js 리빌드)

> 단일 HTML 버전(`pt-center (1).html`)을 **Next.js 15 + PWA**로 리빌드한 프로덕션 앱.
> 다음 세션은 이 파일 하나만 읽으면 아키텍처·데이터 모델·기능·최근 이슈·배포 흐름을 그대로 이어받을 수 있습니다.

---

## 0. TL;DR (다음 세션 5분 브리핑)
- **레포**: `homiepark/sequs` · 배포: Vercel (main 자동 배포)
- **개발 브랜치**: `claude/rebuild-pt-center-app-s1w3S` — main 직접 푸시 금지, PR 통해서만 머지 (feature 브랜치엔 force-push 허용, 이전 커밋은 이미 main에 squash-merge 됨)
- **DB**: Firebase Realtime DB, 프로젝트 `movement-4a23f`, path `/ptcenter`. 규칙은 `{".read": true, ".write": true}` (열림, 팀 내부용). 매일 자동 백업 → `/ptcenter_backups/{YYYY-MM-DD}`
- **저장 형태**: id 있는 컬렉션은 **map 형태 저장** (아래 6번 참고). 로컬 코드에선 배열로 다루고 firebase 경계에서 변환.
- **동기화**: **path-level `update()`** 만 씀 (`set(전체)` 아님). 다중 트레이너 동시 편집 안전.
- **개발**: `pnpm install && pnpm dev` (http://localhost:3000). 타입 체크 `pnpm typecheck`, 프로덕션 빌드 `pnpm build`.

---

## 1. 프로젝트 개요
- **대상**: 시퀀스 무브먼트 재활센터 (PT 4인 체제) 스케줄 관리
- **사용 환경**: 트레이너 여러 명이 각자 기기(모바일 + PC + PWA)에서 실시간 공유
- **저장소 정책**: 풋살 로그 앱과 독립 — 이 레포(`sequs`)에만 커밋

---

## 2. 트레이너 & 운영 시간 (`lib/types.ts` `TRAINERS`)
| ID | 이름 | 색상 | 급여 정산 |
|----|------|------|-----------|
| t1 | 이성훈 | `#ff6b35` | **대표 (수업료 정산 제외)** — `SALARY_EXCLUDED[t1]` |
| t2 | 최서윤 | `#3ecfff` | 근로+사업 mix, 원천징수 X (세금계산서 발행) |
| t3 | 박빛나 | `#b07fff` | 근로+사업 mix, 원천징수 O (3.3%) |
| t4 | 최상민 | `#ff4fad` | 근로+사업 mix, 원천징수 O (3.3%), 4대보험 87,530원 |

- **운영**: 월~토 08:00~21:00, 1시간 단위 + `:30` 체크로 30분 시작 가능
- **시간 헤더 표기**: `9시` 형식 (`formatHourLabel`)
- **볼란스 판매**: 트레이너 월별 볼란스 수 입력 → 사업소득에 가산 (`monthlyExtras`)

---

## 3. 기술 스택
- **프레임워크**: Next.js 15 (App Router) + React 19 + TypeScript
- **스타일**: Tailwind CSS 3.4, `hoverOnlyWhenSupported: true` (iOS hover 잔상 방지)
- **상태**:
  - `lib/store.tsx` — `StoreProvider`/`useStore` (메모리 + localStorage + Firebase 3단 sync)
  - `lib/highlight.tsx` — `HighlightProvider`/`useHighlight` (회원 강조 상태)
- **Firebase SDK**: `firebase/database` v11 (compat 아님)
- **PWA**: `public/manifest.json` + `public/sw.js`, `components/PWARegister.tsx`, `components/InstallButton.tsx`
- **파일 루트**: `/home/user/sequs`

---

## 4. 디렉터리 구조 (2026-05-14 기준)
```
app/
  layout.tsx           — 루트, 폰트, PWA 메타
  page.tsx             — <App /> 렌더
  globals.css          — 전역 CSS + 애니메이션 (memoNeonGlow, memberHighlight, blocked-pattern)

lib/
  types.ts             — 모든 타입 + 상수 (TRAINERS, HOURS, SALARY_CONFIGS, SALARY_EXCLUDED)
                         + 헬퍼 (getSessionsForDate, memberTrainers, isSlotBlocked, normalizeDB,
                         emptyDB, unblockSlot, formatHourLabel, sessionSlotKey,
                         recentMemberMemoLog, arrFromMaybeMap)
  firebase.ts          — Firebase init, subscribeDB, writeDBDelta (path-level),
                         writeFullAsMaps (일회 migration), writeBackupSnapshot,
                         remoteHasArrayShape, diffArr/diffRec 헬퍼
  store.tsx            — StoreProvider (mutate, undo, syncError, retrySync, exportJSON, importJSON)
  highlight.tsx        — HighlightProvider / useHighlight
  useGridGestures.ts   — 핀치 줌 + 스와이프 (callback ref)
  useContainerWidth.ts — ResizeObserver 훅

components/
  App.tsx              — 최상위 (HighlightProvider + Header + 페이지 라우팅 + Toast + PWARegister)
  Header.tsx           — 네비, 싱크 상태, ⚠️ 동기화 실패 배너 + 재시도, Undo 버튼, 설치 버튼, 검색 chip
  InstallButton.tsx    — PWA 설치 (iOS 안내 바텀시트)
  PWARegister.tsx      — 서비스워커 등록

components/pages/
  SchedulePage.tsx     — 3뷰 모드 (개별/하루전체/주간전체) + 주 탭 + 메모바 + 회원 검색 돋보기
  FixedPage.tsx        — 고정 수업 목록 + 고정 차단 관리
  MembersPage.tsx      — 회원 목록, 멀티 트레이너, 특이사항 + 이슈 로그, 중복 감지
  StatsPage.tsx        — 트레이너 탭, KPI (출석/🎁무료/결석/사캔/당캔), 급여 정산, 회원별 출석 표

components/schedule/
  SessionCard.tsx       — 수업 카드 (가/🎁 사유 인라인/고정/결석/메모 배지, 하이라이트, ✕ 버튼)
  SessionModal.tsx      — 예약/수정 (자동완성, 30분, 가예약, 🎁 무료+사유 칩, 고정 등록+충돌)
  SessionMemoModal.tsx  — 수업 메모 편집 + 회원 특이사항 편집 + 회원 이슈 로그
  ActionMenu.tsx        — 바텀시트/팝업, 메모 인라인 표시, 시간 차단(수업 캔슬됨) 옵션
  BulkBlockModal.tsx    — 다중 슬롯 차단 + 사유 + directCancel 모드 (셀 세션 있을 때)
                         + 3-way 충돌 처리 (모두 캔슬/건너뛰기/취소)
  FixedConflictModal.tsx — 고정 수업 등록 시 3-way (취소/유지/덮어쓰기)
  MemberAutocomplete.tsx — 이름/초성 검색, autofocus, preferOneOff (무료 체크 시 일회성 강조)
  FixedEndDateModal.tsx  — 고정 수업 종료일 지정
  CancelChips.tsx       — 캔슬 히스토리 칩 (좌측 정렬 예외)
  MemoBar.tsx           — 하루 메모 (설정 시 네온 펄스)
  WeekTabs.tsx          — 월 범위 주 탭

components/members/
  BulkAddModal.tsx       — 여러 명 동시 추가 + 중복 감지
  MemberSearchModal.tsx  — 전역 회원 검색 (초성)
  MemberScheduleModal.tsx — 특정 회원 전체 스케줄 조회

components/ui/
  Modal.tsx        — 기본 모달 (overscroll-contain)
  TrainerTabs.tsx  — 트레이너 필터 (hideAll 옵션)
  Toast.tsx        — 토스트 알림
```

---

## 5. DB 스키마 (TS 타입, `lib/types.ts` 기준 최신)
```ts
interface Session {
  id: string;             // "s"+timestamp or "fx_{fid}_{date}" (virtual)
  date: string;           // YYYY-MM-DD
  time: string;           // HH:00 or HH:30
  tid: TrainerId;         // t1|t2|t3|t4
  mid: string | null;     // 등록 회원 id or null
  customName?: string | null;  // 직접 입력(미등록)
  isFixed?: boolean;      // 고정 수업 virtual 인지
  fixedId?: string;       // 고정 수업 ID (virtual일 때)
  isTentative?: boolean;  // 가예약
  isFree?: boolean;       // 🎁 무료 수업 (급여 정산에서 제외)
  freeReason?: string;    // 무료 사유 ("체험" / "보상/사과" / "이벤트" / 자유입력)
}

interface FixedSchedule {
  id, tid, mid, customName,
  dayOfWeek: 1..6,        // 1=월 ~ 6=토
  time,
  startDate?, endDate?,
  skippedDates?: string[]  // "이번만 삭제" 시 이 배열에 date 추가
}

interface FixedBlock {
  id, tid: TrainerId | "all",
  dayOfWeek: 1..6,
  times: string[],        // 여러 시간 한 규칙에
  label?: string,          // 있으면 셀에 label 표시
  startDate?, endDate?,
  skippedDates?: string[]  // 특정 날짜만 차단 해제 시 여기 추가 (PR: unblock-single-day)
}

interface Member {
  id, name, phone, tid,     // 레거시 tid (첫 담당)
  tids?: TrainerId[],        // 멀티 트레이너 담당
  memo?: string,             // 회원 특이사항
  memoLog?: MemberMemoEntry[],  // 회원 이슈 로그 (날짜별 누적)
  countSessions?: boolean,   // 세션 회차 카운트 대상 (opt-in)
  sessionStart?: number,     // (레거시 폴백) 앱 도입 전 누적 회차
  sessionAnchor?: { date, time, number },  // "이 수업 = N회차" 기준 (누적)
  packageAnchor?: { date, time, index, size },  // "이 수업 = size회권 중 index번째" (누적과 독립)
  vip?: boolean              // 수동 VIP (누적 100회↑ 는 자동)
}
interface MemberMemoEntry { id, date, text, createdAt }

type AttStatus = "present" | "absent" | "precancel" | "daycancel"

interface CancelHistoryEntry {
  id, date, time, tid, mid, memName,
  type: "precancel" | "daycancel",
  cancelledAt: string
}

interface DB {
  members: Member[]
  sessions: Session[]
  fixedSchedules: FixedSchedule[]
  fixedBlocks?: FixedBlock[]
  att: Record<`${date}_${sessionId}`, AttStatus>
  blocks: Record<`${date}_${tid}_${time}`, boolean>
  blockReasons?: Record<`${date}_${tid}_${time}`, string>
  cancelHistory: CancelHistoryEntry[]
  memos?: Record<date, string>          // 하루 메모
  sessionMemos?: Record<`${date}_${tid}_${time}`, string>  // 수업 메모
  monthlyExtras?: Record<`${YYYY-MM}_${tid}`, { volansCount?: number }>
}
```

**중요 규칙**:
- 회원 멀티 트레이너: 레거시 `tid`는 `normalizeDB`에서 `tids=[tid]`로 승격. 헬퍼 `memberTrainers(m)`, `memberHasTrainer(m, tid)` 사용
- `getSessionsForDate(db, ds)` 는 실제 세션 + 활성 고정 수업 (skippedDates 제외 + override 처리) 병합해 반환
- 세션 id: 실제 세션은 `s${timestamp}`, 가상(고정 유래)은 `fx_${fixedId}_${date}` — attendance 키가 `${date}_${sess.id}`로 통일
- 무료 수업(`isFree: true`) 은 회원 출석 카운트는 되지만 **수업료 계산에서 제외** (StatsPage `sessions = trainerPresent.length - freeCount`)

---

## 6. Firebase 저장 형태 & 마이그레이션
**저장 형태 (2026-05-08 이후)**:
- id 있는 컬렉션 (`members, sessions, fixedSchedules, fixedBlocks, cancelHistory`) → id 키 map으로 저장. 예: `sessions: { s1: {...}, s2: {...} }`
- Record 필드 (`att, blocks, blockReasons, memos, sessionMemos, monthlyExtras`) → 원래 map, 그대로

**왜?** — 이전엔 매 mutate 마다 `set(/ptcenter, 전체 DB)` 로 통째로 덮어써서 두 트레이너가 동시에 다른 항목 편집하면 **last-write-wins on the entire tree** → 상대방 변경분이 통째로 사라짐. 실제 어제(2026-05-07~08) 하루 종일 데이터 손실 발생.

**해결 (`lib/firebase.ts`)**:
- `writeDBDelta(prev, next)` — 변경된 항목만 `update()` 로 path-level 쓰기 (예: `update({"sessions/s1": {...}, "members/m3": {...}})`)
- `remoteHasArrayShape(raw)` + `writeFullAsMaps(db)` — 앱 첫 클라이언트가 레거시 array 형태 감지 시 자동으로 map 형태로 rewrite (idempotent, 4명 동시 열어도 안전)
- `normalizeDB(raw)` — 읽기 시 array/map 둘 다 배열로 변환 (`arrFromMaybeMap<T>`)
- 실패 시 로컬 상태 보호: `store.tsx` 의 `writeFailedRef` 가 true인 동안 서버 subscribe 이벤트가 로컬을 덮어쓰지 못하게 가드
- 첫 remote subscribe 받기 전엔 mutate 차단 (`hasFirstRemoteRef`) — stale localStorage 가 새 데이터 덮는 것 방지
- 쓰기 실패 시 Header 상단에 빨간 배너 + 재시도 버튼 (`retrySync`)

**백업**:
- 매일 최초 접속자가 `/ptcenter_backups/{YYYY-MM-DD}` 에 스냅샷 씀 (`writeBackupSnapshot`)
- localStorage `seqmv_last_backup_date` 로 하루 1회 방지
- 형태: `{ at: ISO, data: <full DB> }` — data는 array 형태 그대로 저장 (backups 는 마이그레이션 안 함)

---

## 7. 핵심 기능 (전부, 하나도 빠짐없이)

### 7.1 스케줄 페이지 — 3 뷰 모드
- **개별 뷰** (`SingleTrainerView`): 트레이너 1명의 주간 시간×요일 그리드
  - 헤더: `이성훈 · 이번 주 32회 (🎁 3)` — 총 수업 + 무료 카운트
  - 요일별 카운트 chip
- **하루 전체 뷰** (`AllTrainerDayView`): 특정 요일 × 트레이너 4열 테이블
  - 진입 시 오늘 요일 자동 선택 (아니면 월요일)
- **주간 전체 뷰** (`WeekAllView`): 월~토 × 트레이너4 CSS 그리드
  - 모바일에서도 sticky 컬럼 유지 (기존 HTML table → grid 리팩터로 해결)

각 뷰마다:
- 셀 클릭 → `ActionMenu` 팝업(PC) / 바텀시트(모바일)
- 우클릭도 동작
- 핀치 줌 (모바일 두 손가락) / 상단 좌우 스와이프로 주 이동
- 뷰 모드 버튼 옆 🔍 회원 검색 (전역, `MemberSearchModal`)
- 하이라이트 상태: 검색한 회원의 예약은 점선 테두리 애니메이션

### 7.2 수업 예약 모달 (`SessionModal`)
- 트레이너 선택 → 담당 회원 자동 필터 (+ "전체 회원 보기")
- 이름 자동완성 (`MemberAutocomplete`): 이름/초성 검색, autofocus, 스크롤 chain 방지
  - 신규 이름 입력 시: `➕ 새 회원 등록` (강조) vs `일회성으로 추가` (보조)
  - **preferOneOff**: 🎁 무료 체크되면 우선순위 스왑 → `✨ 일회성 추가`가 강조됨 (체험/이벤트 손님 UX)
- 체크박스:
  - 30분 시작
  - 가예약으로 등록
  - 🎁 무료 수업 → 사유 칩 [체험] [보상/사과] [이벤트] + 자유 입력
  - 고정 수업으로 등록 → 시작일/종료일/종료일 없음, 미리보기 표시
- 회원 프로필 표시: 회원 특이사항 + 최근 회원 이슈 (`recentMemberMemoLog`)
- 고정 등록 시 기존 수업 충돌 감지 → `FixedConflictModal` (취소/유지/덮어쓰기)

### 7.3 액션 메뉴 (`ActionMenu`)
- 모바일 = 바텀시트 (스크롤 가능, 헤더에 시간/이름/날짜)
- PC = 우클릭/좌클릭 위치 팝업 (viewport 밖 방지)
- 상단에 회원 특이사항 + 수업 메모 + 최근 이슈 인라인 표시
- 액션 목록 (조건부):
  - 수업 예약 (빈 셀)
  - 시간 차단 / **시간 차단 (수업 캔슬됨)** — 세션 있으면 라벨 변경
  - 가예약 → 확정
  - 이번만 수정 / 가예약 수정
  - 메모 작성 / 메모 수정
  - 사전 캔슬 / 당일 캔슬 / 캔슬 취소 / 이 자리 재예약
  - 이번만 삭제 (고정 수업)
  - 종료일 지정 (고정 수업 이후 중단)
  - 가예약 취소
  - 수업 삭제 / 고정 전체 삭제 (전체 삭제엔 강한 경고)
  - 차단 해제

### 7.4 시간 차단
- 빈 셀에서 → `BulkBlockModal` 정규 모드
  - 여러 시간 다중 선택, 전체 트레이너 옵션, 매주 반복(고정 차단), 사유
  - 선택된 시간에 활성 수업 있으면 상단에 경고
  - 저장 시 충돌 있으면 3-way: `📵 모두 사전 캔슬하고 차단` / `⏭ 수업 있는 시간 건너뛰고 차단` / `← 돌아가기`
  - **:30 세션도 시 단위로 정규화하여 충돌 감지** (`s.time.replace(":30", ":00")`) — 이거 안 하면 :30 세션이 시 슬롯 차단에 덮여버림
- 세션 있는 셀에서 → `directCancel` 모드
  - 시간/트레이너/고정 옵션 숨김
  - 그 시간 세션 목록 + 사유 입력 + 단일 버튼 `📵 캔슬 + 차단`
- **고정 차단 (fixedBlock)** 도 특정 날짜만 skip 가능: `unblockSlot(d, ds, tid, time)` 이 그 날짜를 `fb.skippedDates` 에 추가 (times 배열은 유지 → 다음 주 반복 살아있음)

### 7.5 자동 출석 & 캔슬 히스토리
- 예약된 수업은 기본 present (명시적 취소 없을 시 출석 카운트)
- 사캔/당캔 시 `att` + `cancelHistory` 둘 다 기록
- 같은 슬롯 재예약해도 캔슬 이력은 보존 (수동 삭제 전까지)
- 셀 하단에 "홍길동 사캔"/"당캔" 칩 표시 + ✕로 개별 삭제
- 개별 뷰에서도 칩 정상 표시 (overflow 문제 fix됨)

### 7.6 가예약 (Tentative)
- `isTentative: true` 플래그, 카드에 `가` 배지 + 외곽선 dashed
- 가예약 상태에서 취소 시 cancelHistory 남기지 않고 깔끔히 삭제
- 확정 액션으로 정식 수업 전환

### 7.7 🎁 무료 수업
- `isFree: true` + `freeReason?: string`
- 사유 preset: **체험 / 보상/사과 / 이벤트** + 자유 입력
- 카드에 🎁 배지, 짧은 사유(≤6자) 인라인 표시 ("🎁 체험")
- 통계 KPI에 별도 카운트, 급여 정산에서 세션료 계산 제외
- 회원별 표에 "🎁 체험 N" 칩 표시
- 엑셀 복사 시 총/무료/유료 분리 컬럼

### 7.8 하루 메모 / 수업 메모 / 회원 특이사항+이슈
- **하루 메모** (`MemoBar`): 하루 전체 뷰 상단, 설정되면 네온 펄스 (prefers-reduced-motion 가드 없음 — PC에서도 반짝)
- **수업 메모**: 슬롯별, 카드에 📝 배지, 액션 메뉴 하단 인라인 표시
  - 키: `sess.time` 기준 (레거시 `ctx.time` 폴백) — :30 저장 이슈 해결
- **회원 특이사항** (`member.memo`): 회원 프로필에 저장, 예약/액션 메뉴에서 노출
- **회원 이슈 로그** (`member.memoLog`): 날짜별 누적, `SessionMemoModal` 에서 편집 가능

### 7.9 회원 관리 (`MembersPage`)
- 가나다 정렬, 트레이너 멀티 선택, 특이사항 + 이슈 로그 관리
- `BulkAddModal` — 여러 명 한 번에 추가 + 중복 감지
- 등록 시 이름 중복 경고 (단일 & 대량 둘 다)

### 7.10 통계 (`StatsPage`)
- 트레이너 탭 (전체 or 개별)
- 상단 KPI: **출석 · 🎁 무료 · 결석 · 사전캔슬 · 당일캔슬**
- 트레이너별 카드:
  - 헤더: `이성훈 — 132회 (유료 124 + 🎁 8)` — 무료 있으면 분리
  - 급여 정산 (t2/t3/t4 만): 세션료 = (총-무료) × 단가, 근로소득, 4대보험, 퇴직금, 볼란스 판매 수 입력, 사업소득, 원천세, 총급여
  - t1 은 `대표 (수업료 정산 제외)` 배지
  - 회원별 출석 표: 각 회원 출석 횟수 + 무료 배지 (🎁 체험 N)
  - 📋 엑셀 복사 (탭 구분 텍스트)

### 7.11 고정 페이지 (`FixedPage`)
- 트레이너별 고정 수업 목록 (요일별 정렬)
- 고정 차단 규칙 목록
- 수정/삭제, 스킵 날짜 관리는 액션 메뉴에서

### 7.12 Undo (`store.tsx` `undo`)
- 최근 50개 mutate 스택
- Ctrl+Z 또는 Header 의 ↩ 버튼
- input/textarea/contentEditable 안에선 무시

### 7.13 Import / Export
- StatsPage 상단 📥 내보내기 (JSON 파일 다운로드)
- 📤 가져오기 — 확인 dialog 후 전체 덮어쓰기

### 7.14 PWA
- iOS 홈화면 설치 안내 (`InstallButton`)
- `public/sw.js` 네트워크 우선, 캐시 폴백. Firebase WebSocket 은 다른 origin이라 sw 안 탐

### 7.15 핀치 줌 & 스와이프 (`useGridGestures`)
- callback ref 방식 (useRef 객체는 useEffect 재실행 안 되는 이슈 해결)
- 모든 뷰 모드에서 동작
- 좌우 스와이프로 주 이동

---

## 8. 해결된 주요 이슈 히스토리 (전체)
| 문제 | 커밋 |
|------|------|
| Hydration mismatch (localStorage 초기값) | 초기 emptyDB + useEffect 하이드레이션 |
| Firebase `undefined` crash (set() 동기 throw) | `bd85494` JSON roundtrip |
| :30 수업 메모 저장 후 사라짐 | `75e85df` sess.time 기준 키 |
| 모바일 sticky 컬럼 너비 깨짐 (week-all) | `df681eb` HTML table → CSS grid |
| PC 주간 전체 핀치 줌 미동작 | `75273ea` callback ref |
| 트레이너 컬럼 오버플로우 → 월요일 숨김 | `2e9370a` th/td 명시 width |
| 고정/비고정 카드 크기 차이 | `0beae03` compactOnMobile |
| iOS 탭 하이라이트 잔상 | `441d8b8`, `33af91a` |
| 줌인 시 개별 뷰 회/검 갈라짐 (iOS sticky compositing) | `51211a6` sticky에 bg 명시 |
| 개별 뷰 캔슬 칩 잘림 | `994eae1` overflow 제거 |
| PC에서 메모 네온 미표시 | `d0a18e0` prefers-reduced-motion 가드 제거 |
| 자동완성 스크롤이 페이지로 chain | `fc4e83a` |
| 고정 수업 전체 삭제 vs 종료일 지정 헷갈림 | `43b8c83` 강한 경고 |
| PC 액션 메뉴 뷰포트 밖 잘림 | `dabc121` 위치 계산 보정 |
| 고정 차단 시간 하나 해제하면 모든 주 풀림 | `27cd3e5` skippedDates 방식 |
| 셀 인라인 "차단 해제" 버튼이 fixedBlock 무시 | `27cd3e5` unblockSlot 통합 |
| Firebase 쓰기 실패 = 로컬만 갱신 후 서버 stale로 덮어쓰기 | `e69564e` writeFailedRef 가드 + 배너 |
| 다중 클라이언트 last-write-wins 데이터 손실 | `71d3fd5` path-level update() + auto migration |
| 차단 3-way 모달에서 :30 세션 미탐지 | `9f9670d` 시 단위 정규화 |
| 수업 있는 시간 차단이 2단계 필요 (캔슬 → 차단) | `52c3831` ActionMenu 옵션 추가 + `342a809` directCancel 모드 |
| KST 날짜 하루 밀림 (`toISOString().slice(0,10)` 가 UTC로 변환) | `af5278e` 전부 `fmtDateToISO()` (로컬 날짜) 로 교체 |

---

## 9. 오늘 세션 (2026-05-14) 진행 요약
5월 7~8일 데이터 손실 사건 대응 + 무료 수업 시스템 + 차단 UX 통합.

### 9.1 데이터 손실 조사
- 원인: 다중 클라이언트가 각자 stale 상태로 `set(전체)` 하면서 서로 덮어씀 (last-write-wins on entire tree)
- 5/8 아침 백업으로 5/7 스케줄 표 재구성해서 사용자에게 제공 (직접 손 입력 or 자동 복원 옵션 안내)

### 9.2 아키텍처 개편 (PR 없이 직접 main에 있던 커밋들 `e69564e`, `71d3fd5`)
- `writeDB` → `writeDBDelta(prev, next)` — path-level `update()`
- 첫 로드 시 array 형태 감지하면 map으로 자동 rewrite
- 쓰기 실패 시 로컬 보호 + 상단 빨간 배너

### 9.3 무료 수업 (PR #1, #2)
- Session 에 `isFree` + `freeReason`
- 모달 체크박스 + 사유 칩
- 카드 🎁 배지 (짧은 사유 인라인)
- 통계 KPI + 급여 정산 제외
- 회원별 표에 🎁 카운트, 엑셀 복사 컬럼
- **PR #2**: 체험 손님 UX — 🎁 체크 시 자동완성이 "일회성 추가" 강조

### 9.4 시간 차단 개편 (PR #3, #4, #5)
- ActionMenu에 수업 있는 셀에서도 "시간 차단 (수업 캔슬됨)" 표시
- `BulkBlockModal` 에 3-way 충돌 처리 (모두 캔슬+차단 / 건너뛰고 차단 / 취소)
- **PR #4**: :30 세션 충돌 감지 버그 fix (시 단위 정규화)
- **PR #5**: 세션 있는 셀에서 시작하면 `directCancel` 모드로 바로 캔슬+차단 다이얼로그 (시간 선택 없이)

### 9.5 개별 뷰 개선 (PR #5)
- 헤더에 `(🎁 N)` 추가 — 그 주의 무료 수업 카운트

### 9.6 오늘 머지된 PR 순서
1. **#1** — Add free lesson tracking with salary exclusion
2. **#2** — Optimize free-lesson flow for unregistered trial visitors
3. **#3** — Allow blocking time slots that already have sessions
4. **#4** — Detect :30 sessions in block conflict check
5. **#5** — Direct cancel+block flow from session cell + free count on 개별 view

---

## 9-B. 2026-08-04 세션 진행 요약
전체 코드베이스 정독 + KST 날짜 버그 수정.

### 9-B.1 KST 날짜 하루 밀림 버그 수정 (`af5278e`)
- `toISOString().slice(0,10)` 은 UTC로 변환하므로 KST(UTC+9)에서 캘린더 날짜가 하루 전날로 밀림
- **핵심 버그**: `MembersPage.uniqueDatesForMember` 가 고정수업 날짜를 하루 일찍 생성 → `getSessionsForDate` 요일 불일치 → 회원 카드의 이번달/누적 출석·마지막 방문에서 **고정수업 출석 누락**
- 부수: 오전 9시 이전 "오늘" 이 어제로 잡히던 문제 (오늘 하이라이트, 월간통계 컷오프, 백업 날짜 키 등)
- 조치: 날짜 추출 용도를 전부 로컬 날짜 헬퍼 `fmtDateToISO()` 로 교체 (7개 파일). `StatsPage` 백업 파일명만 표시용이라 유지.

### 9-B.2 고정수업 종료일 수정 (FixedEndDateModal)
- 종료일 **기본값을 오늘**로 정상화 (기존엔 과거 금요일로 계산돼 신뢰 안 감)
- **종료일 지정 시**, 그 회원의 같은 요일·시간(:00/:30) 미래 개별 real 세션도 함께 삭제 → "이번만 수정"으로 개별화된 주가 있어도 종료일 이후 확실히 사라짐. att 도 같이 정리.

### 9-B.3 급여: 서버비 (최서윤/t2)
- `SalaryConfig.serverFee` 추가, t2 = 14,000원
- **총급여에 가산** (세금계산과 무관 — 사업소득/원천세 계산엔 미포함). t2는 원래 세금계산서 발행이라 원천세 없음
- 급여 카드에 "서버비 (세금 제외 · 가산)" 라인 + 엑셀 복사에 `서버비(가산·세금제외)` 항목

### 9-B.4 회원 세션 회차 카운트 (opt-in)
- 회원 수정 화면에서 **"🔢 세션 회차 카운트"** 체크 + **"시작 회차"**(앱 도입 전 누적) 입력
- 카운트 규칙: **유료 진행분만** — 사캔·당캔·결석·🎁무료 전부 제외, 시간순 누적. 회차 = `sessionStart + 진행 순번`
- 헬퍼: `memberSessionOrdinals(db, member, maxDate)` / `computeSessionCounts(db, maxDate)` (`lib/types.ts`)
- 전달: `lib/sessionCount.tsx` 컨텍스트 (`SessionCountProvider`/`useSessionCounts`). SchedulePage가 현재 주 마지막 날까지 계산해 provide
- 표시: 스케줄 카드에 검정 **`N회차`** 배지 + 회원 "예약 보기" 목록 각 행. countSessions 회원만.
- 주의: 카드 배지는 컨텍스트 키 `${date}_${sess.id}` 로 조회 — 세션 id 규칙(실제 `s...`, 고정 `fx_{fid}_{date}`) 유지 필수

## 9-C. 회차 앵커 · 회원권 · VIP (2026-08-04 후속)
회차 UX 개선 + 10/20회권 + VIP. **화면 복잡도 최소** 원칙: 카드엔 배지 1개, 상세는 넓은 곳.

### 9-C.1 회차 = 앵커 방식
- 회원수정의 추상적 "시작 회차" 대신, **수업 모달에서 "이 수업 = N회차"** 지정 → `member.sessionAnchor {date,time,number}`. 그 세션 순번을 찾아 오프셋 계산(`baseOffsetOf`), 앞뒤 자동. 앵커 없으면 `sessionStart` 폴백.
- `lib/types.ts`: `countedSessionsOf` / `baseOffsetOf` / `memberSessionOrdinals`(앵커 반영) / `computeScheduleMeta(db,maxDate,today)` → `{ordinals, members:{mid:{total,vip}}}` / `packageProgress(member,ordinal)`
- 컨텍스트 `lib/sessionCount.tsx` 값이 `ScheduleMeta` 로 확장(`useScheduleMeta`).

### 9-C.2 회원권 (10/20회권) — 누적과 독립
- `member.packageAnchor {date,time,index,size}` = "이 수업 = size회권 중 index번째". **누적 회차를 몰라도** 이것만으로 진행 추적 (VIP 등 누적 미추적 회원 대응).
- `memberPackagePositions(db,member,maxDate)` 가 counted-list 상대 위치로 각 세션의 `{index,size,isLast,isOver}` 계산. index<1(지난 권) 은 숨김. 마지막/초과 = 재등록 신호.
- 회차(`sessionAnchor`)와 회원권(`packageAnchor`)은 **완전히 독립** — 둘 중 하나만 넣어도 됨.

### 9-C.3 VIP (자동 + 수동)
- 자동: 회차 추적 회원의 누적(오늘까지) ≥ `VIP_THRESHOLD`(100).
- 수동: `member.vip` (누적 안 세는 VIP용). 회원 수정/수업 모달에 ⭐VIP 체크박스.
- effective vip = 수동 `||` 자동. `members[mid].vip`.

### 9-C.4 표시 (복잡도 최소)
- **스케줄 카드**: 배지 1개. 평소 `N회`(검정) · VIP `⭐N회`(골드 `#e8b800`) · 권 마지막/초과 `P/size`(빨강 `#ff4d4d`=재등록). (`SessionCard`)
- **액션메뉴/예약보기/회원카드**: 풀표기 `N회차 · 20회권 4/20 · ⭐VIP`.
- **회원 탭**: `⭐VIP만` 필터.

## 10. 배포 & 개발 워크플로우
### 10.1 명령어
```bash
cd /home/user/sequs
pnpm install          # 최초 1회
pnpm dev              # localhost:3000
pnpm typecheck        # tsc --noEmit
pnpm build            # 프로덕션 빌드
pnpm start            # 프로덕션 로컬 실행
```

### 10.2 Git 정책
- **main 브랜치 direct push 금지** (서버가 403 반환)
- 개발 브랜치명은 **세션마다 지정됨** (task 프롬프트에서 확인). 예전: `claude/rebuild-pt-center-app-s1w3S`, 2026-08 세션: `claude/project-status-review-kiszef`
- 지정된 feature 브랜치에 커밋 → `git push -u origin <branch>` → GitHub MCP 로 PR 생성 → squash merge
- 머지 후 `git fetch && git reset --hard origin/main` 으로 로컬 동기화
- 이미 머지된 PR 은 재사용 금지 — 후속 작업은 main 기준으로 브랜치 다시 만들어 새 PR

### 10.3 Vercel
- main push 감지 → 자동 배포 (5~10분)
- Preview 배포는 feature 브랜치 push 시 별도 URL 제공 (PR 댓글로 알림)

### 10.4 Firebase Console
- 프로젝트: https://console.firebase.google.com → `movement-4a23f`
- Realtime Database → 데이터 탭에서 `/ptcenter` (실제) + `/ptcenter_backups` (백업) 확인
- 규칙 탭: `{".read": true, ".write": true}` (내부 팀 전용이라 문제 없음)

---

## 11. 알려진 제한 / 향후 검토 사항
- **동시 편집 극단 케이스**: 두 명이 정확히 같은 세션(같은 id)을 동시에 편집하면 여전히 last-write-wins. 실무에서 거의 없는 케이스라 미대응.
- **:30 시작 수업 UI**: 셀은 시 단위 행이라 :30 세션도 :00 슬롯 안에 표시됨. 시각적 구분은 카드 이름 뒤 `·30` 표기.
- **고정 차단 (fixedBlock) 시 세션 충돌**: 현재 fixed 모드로 차단 등록해도 충돌 감지 안 함. one-off 차단만 감지. 향후 필요 시 확장.
- **볼란스 판매 자동 계산 X**: 트레이너가 매월 수동으로 카운트 입력. 자동화 요청 시 별도 구조 필요.
- **PWA 오프라인 사용**: 서비스 워커는 정적 자원만 캐시. Firebase Realtime DB 는 오프라인 시 SDK 내장 캐시 사용 (재연결 시 자동 sync).

---

## 12. 다음 세션 픽업 체크리스트
1. `git pull origin main`
2. `pnpm install && pnpm dev` 로 로컬 확인
3. 이 파일 (`PROJECT_STATUS.md`) 8·9·11번 훑어보고 최근 이슈/제한사항 파악
4. 새 요청 받으면:
   - 데이터 구조 변경 시 `lib/types.ts` + `normalizeDB` + `emptyDB` 모두 업데이트
   - `writeDBDelta` 는 자동으로 diff 감지하므로 새 필드도 자동 반영됨
   - Firebase 쓰기 관련 신중히 — 실패 케이스 (`writeFailedRef`, 배너, 재시도) 도 확인
5. 커밋 후 반드시 feature 브랜치로 push → PR → squash merge → 로컬 sync
6. 다음 세션에서도 이 문서 최신화 (11번 알려진 제한 갱신, 9번 세션 진행 요약 추가)

---

_레거시 단일 HTML 요약: `pt-center-project-summary.md` (참고용, 현재 코드베이스와 관련 없음)._
