# PT센터 스케줄 관리 앱 — 프로젝트 요약

## 프로젝트 개요
4명 트레이너가 근무하는 피지컬 트레이닝 센터의 수업 스케줄 관리 웹앱.
단일 HTML 파일 (vanilla JS + Firebase Realtime Database).
모바일(iOS Safari) + PC 브라우저 모두 지원.

---

## 트레이너 정보
- 이성훈 / 최서윤 / 박빛나 / 최상민

## 운영 시간
- 월~토, 08:00~21:00 (1시간 단위)
- 30분 시작 수업 별도 체크박스로 처리 (09:30 등)

---

## 기술 스택
- **프론트**: Vanilla JS, HTML/CSS (단일 파일)
- **DB**: Firebase Realtime Database (compat SDK v9, 동적 로드)
- **저장**: localStorage(`ptc9`) + Firebase 실시간 동기화
- **배포**: Netlify Drop (정적 HTML)

## Firebase 설정
```js
apiKey: "AIzaSyChNw0VDTrTau5AJfEEgS323-xk7mAJKvs"
authDomain: "movement-4a23f.firebaseapp.com"
databaseURL: "https://movement-4a23f-default-rtdb.asia-southeast1.firebasedatabase.app"
projectId: "movement-4a23f"
storageBucket: "movement-4a23f.firebasestorage.app"
messagingSenderId: "553989031192"
appId: "1:553989031192:web:a5c6397fc33bb24e75ca6d"
```

---

## DB 구조
```js
db = {
  members: [{ id, name, phone, tid(트레이너id) }],
  sessions: [{ id, date, time, tid, mid, customName, isFixed, fixedId }],
  fixedSchedules: [{ id, tid, mid, customName, dayOfWeek(1=월~6=토), time, startDate, endDate }],
  att: { "date_sessId": "present"|"absent"|"precancel"|"daycancel" },
  blocks: { "date_tid_time": true },
  cancelHistory: [{ id, date, time, tid, mid, memName, type, cancelledAt }]
}
```

---

## 핵심 기능 목록

### 1. 스케줄 탭
- 연도/월 셀렉터 + 이전/다음 주 이동
- **트레이너 탭**: 전체 / 이성훈 / 최서윤 / 박빛나 / 최상민
- **개인별 뷰**: 선택 트레이너의 주간 그리드 (시간×요일)
- **전체 보기**: 요일 탭(월~토) + 시간×트레이너4열 테이블 — 빈 시간 초록색 강조
- 셀 클릭/우클릭 → 팝업(PC) or 바텀시트(모바일)

### 2. 수업 예약 모달
- 트레이너 선택 → 해당 트레이너 회원 자동 필터
- "전체 회원 보기" 체크 → 전체 회원 표시 (타 트레이너 회원 대리 예약)
- "직접 입력 (미등록)" 체크 → 이름 텍스트 입력 (초도 회원 등)
- "30분 시작" 체크 → time을 `:30`으로 저장, 카드에 `·30` 표시
- "고정 수업으로 등록" 토글 → 시작일/종료일 선택 → fixedSchedules에 저장

### 3. 수업 액션 (팝업/바텀시트)
- 수업 예약 / 시간 차단
- 이번만 수정 (고정수업의 특정 날만 override)
- 사전 캔슬 / 당일 캔슬 → cancelHistory에 기록 + 셀 하단에 칩 표시
- 캔슬 취소 / 재예약 / 삭제

### 4. 캔슬 히스토리
- 사캔/당캔 처리 시 cancelHistory에 저장
- 스케줄 셀 하단에 `홍길동 사캔` / `홍길동 당캔` 칩으로 표시
- 칩의 ✕ 버튼으로 개별 삭제

### 5. 고정일정 탭
- 등록된 고정 스케줄 트레이너별로 목록 표시
- 수정/삭제 가능
- 추가는 수업 예약 모달에서만 가능 (별도 추가 버튼 없음)
- getSessions()에서 날짜 범위(startDate~endDate) 필터링하여 자동 생성

### 6. 출석체크 탭
- 날짜 이동 + 트레이너 필터 탭
- 출석 / 결석 / 사전캔슬 / 당일캔슬 버튼
- 고정수업 포함하여 그날 세션 모두 표시
- 마킹 시 cancelHistory에도 자동 기록

### 7. 회원관리 탭
- 트레이너별 탭 필터
- 이름 검색
- 이번달 출석 / 누적 출석 / 마지막 방문일 표시
- 추가/수정/삭제

### 8. 통계 탭
- 연/월/트레이너 필터
- KPI: 출석, 결석, 사전캔슬, 당일캔슬 수
- 트레이너별 회원 출석 횟수 테이블
- "📋 복사" 버튼 → 탭 구분 텍스트 복사 (엑셀 붙여넣기용)

---

## 모바일 대응
- 바텀시트: 수업 액션 메뉴 (iOS 친화적)
- 핀치 줌: 두 손가락으로 그리드 셀 크기 조절 (cellH 변수로 영구 유지)
- 더블탭: 줌 초기화
- 가로 스크롤: grid-wrap / av-wrap 모두 overflow-x:auto
- 마지막 열 border-right 제거로 잘림 방지
- 전체보기 테이블: `width:max-content` + sticky 시간열/헤더행

---

## 주요 함수 목록
```
getSessions(ds)          — 날짜별 실제+고정 세션 병합
buildCell(ds,h,tid,...)  — 개인뷰 슬롯 셀 생성
buildCard(ds,sess,t)     — 세션 카드 엘리먼트 생성
buildCancelChips(ds,h,tid) — 캔슬 히스토리 칩 생성
renderSingleView(days,tid) — 개인 트레이너 주간 그리드
renderAllView(days)      — 전체 트레이너 하루 테이블
openAction(e,date,time,tid,sess) — PC팝업/모바일바텀시트 분기
act(action)              — 예약/캔슬/수정/삭제 처리
saveSess()               — 수업 저장 (30분/직접입력/고정 처리)
addCancelHistory(...)    — 캔슬 히스토리 추가
markAtt(sid,status)      — 출석 마킹 + 히스토리 연동
applyZoom()              — 핀치줌 후 셀 크기 적용
initFirebase()           — Firebase compat SDK 동적 로드 및 연결
```

---

## 알려진 이슈 / 추후 개선 필요 사항
- Firebase 미설정 시 로컬 저장으로 폴백 (정상 동작)
- 고정수업 종료일 없음 선택 시 1년치로 처리 (추후 무한 반복 로직 필요)
- 통계에서 고정수업 출석 카운트 로직 단순화 필요
- 회원 수업료 계산 기능 제거됨 (별도 엑셀로 관리)
- Netlify 재배포 시 수동으로 HTML 파일 다시 드래그앤드롭 필요
