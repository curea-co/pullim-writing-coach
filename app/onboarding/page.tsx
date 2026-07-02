"use client";
// /onboarding — 3 step linear flow. localStorage["pwc_profile_v1"] 있으면 / 로 리다이렉트.
//   ?force=1 로 재진입 가능(/me에서 "다시 둘러보기" 시).
//   step state는 URL이 아니라 컴포넌트 내부 — 뒤로가기는 step--, 닫기 없음(강제 흐름).
//
// EPIC 6 배선(유닛 B): 동의 흐름을 age-policy·consent에 연결.
//   · Step2 제출 시 서비스 동의 + (만14 미만 트랙) 보호자 동의를 'pwc-consent-v1'에 영속.
//   · 타임스탬프는 여기서 consentNow()로 주입(consent/consent-store는 시각 직접 생성 금지).
//   · Step3는 needsGuardianConsent로 분기 — 보호자 트랙이면 보호자 동의 게이트 + 안내,
//     AI 학습 별도 옵트인(기본 OFF) 제공. canUseService 통과 전엔 시작 CTA 비활성.

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import ConsentNotice from "../components/ConsentNotice";
import ProfileForm, { type ProfileDraft } from "../components/ProfileForm";
import ProgressDots from "../components/ProgressDots";
import { needsGuardianConsent } from "../lib/age-policy";
import {
  canUseService,
  describeRequired,
  emptyConsent,
  type ConsentState,
} from "../lib/consent";
import {
  loadConsent,
  saveConsent,
  setAiTrainingOptIn,
  setGuardianConsent,
  setServiceConsent,
} from "../lib/consent-store";
import { consentNow, loadProfile, saveProfile, type Profile } from "../lib/storage";
import { useAuth } from "../lib/use-auth";

type Step = 1 | 2 | 3;
const TOTAL_STEPS = 3;

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useAuth();
  const force = params.get("force") === "1";

  // 초기 step 결정 + 이미 프로필 있으면 redirect (force=1 이면 무시).
  // SSR-safe: useEffect 안에서만 LS 접근.
  const [step, setStep] = useState<Step>(1);
  const [checkedProfile, setCheckedProfile] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState<Profile | null>(null);

  // PR #115 결함 1: status resolved 전 보류 + 전환 시 재확인(authed인데 guest로 읽어 redirect를
  //   놓치는 회귀 차단). 결함 2: loadProfile throw(읽기 실패) — redirect 게이트는 보수적으로
  //   "프로필 없음"으로 보고 온보딩을 노출(에러 UI 불필요, 사용자가 다시 진행 가능).
  useEffect(() => {
    if (force) {
      setCheckedProfile(true);
      return;
    }
    if (status === "loading") return;
    let alive = true;
    void (async () => {
      let profile: Profile | null = null;
      try {
        profile = await loadProfile();
      } catch {
        profile = null;
      }
      if (!alive) return;
      if (profile) {
        router.replace("/");
        return;
      }
      setCheckedProfile(true);
    })();
    return () => {
      alive = false;
    };
  }, [force, router, status]);

  // 프로필 체크 전엔 빈 화면(깜박임 방지) — 짧은 시간이라 스피너 생략.
  if (!checkedProfile) return null;

  const next = () => setStep((s) => (s < TOTAL_STEPS ? ((s + 1) as Step) : s));
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  // Step2 onSubmit — 검증은 ProfileForm 안에서, 여기는 저장+다음 단계 진행.
  //   consentAccepted=true(ProfileForm이 서비스 동의 체크 강제) → 서비스 동의 타임스탬프 기록.
  const handleProfileSubmit = async (draft: ProfileDraft, consentAccepted: boolean) => {
    // ProfileForm 검증 통과 = 필수 필드 있음. 그래도 type narrowing 위해 가드.
    if (!draft.school_level || !draft.primary_subject || !draft.nickname?.trim()) return;
    if (draft.primary_subject === "기타" && !draft.primary_subject_other?.trim()) return;
    setSaveError(null);
    const now = consentNow();
    const profile: Profile = {
      nickname: draft.nickname.trim(),
      school_level: draft.school_level,
      primary_subject: draft.primary_subject,
      primary_subject_other:
        draft.primary_subject === "기타" ? draft.primary_subject_other?.trim() : undefined,
      school_name: draft.school_name?.trim() || undefined,
      frequent_genre: draft.frequent_genre || undefined,
      consent_at: now,
    };
    const result = await saveProfile(profile);
    if (result.ok) {
      // 서비스 동의 영속(타임스탬프 주입). 보호자 동의·AI 학습 옵트인은 Step3에서 분기 처리.
      //   기존 consent 로드 후 서비스 동의만 갱신(가산적) — AI 옵트인 등 다른 필드 보존.
      const base = await loadConsent();
      await saveConsent(setServiceConsent(base, consentAccepted, now));
      setSavedProfile(profile);
      next();
    } else {
      setSaveError(
        result.reason === "quota"
          ? "브라우저 저장 공간이 가득 찼어요. 다른 사이트의 데이터를 정리한 뒤 다시 시도해 주세요."
          : "브라우저가 저장을 막고 있어요. 시크릿(비공개) 모드라면 일반 창에서 시도해 주세요.",
      );
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col px-5 py-8">
      <div className="mb-8 flex items-center justify-between">
        <ProgressDots total={TOTAL_STEPS} current={step} />
        {step > 1 && (
          <button
            type="button"
            onClick={back}
            aria-label="이전 단계로"
            className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M12.5 5 7.5 10l5 5" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1">
        {step === 1 && <Step1 onNext={next} />}
        {step === 2 && (
          <Step2
            onSubmit={handleProfileSubmit}
            saveError={saveError}
            initial={
              savedProfile
                ? {
                    nickname: savedProfile.nickname,
                    school_name: savedProfile.school_name,
                    school_level: savedProfile.school_level,
                    primary_subject: savedProfile.primary_subject,
                    primary_subject_other: savedProfile.primary_subject_other,
                    frequent_genre: savedProfile.frequent_genre,
                  }
                : undefined
            }
          />
        )}
        {step === 3 && <Step3 profile={savedProfile} />}
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  // useSearchParams는 Suspense 경계가 필요(Next 16+).
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}

// ── Step 1: 환영 + 가치 제안 + 데모 결과 미리보기 ────────────────────
function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-foreground break-keep text-2xl font-bold leading-tight md:text-3xl">
          당신이 쓴 글을 교사 관점으로 채점해드려요
        </h1>
        <p className="text-muted-foreground mt-2 break-keep text-justify text-sm leading-relaxed">
          AI가 과제 이해·내용 충실도·구조·표현·성장 가능성, 5가지 영역으로
          읽고 문장 단위로 첨삭해 줍니다.
        </p>
      </header>

      <DemoPreview />

      <button
        type="button"
        onClick={onNext}
        className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        시작하기
      </button>
      <p className="text-subtle-foreground break-keep text-left text-[11px]">
        잠깐의 정보 입력 후 바로 채점받을 수 있어요.
      </p>
    </div>
  );
}

// 데모 결과 thumbnail — 실제 ResultView의 축약본. 토큰 일관성으로 "진짜 결과" 느낌.
//   TODO(M3): /samples/e 정적 스크린샷 PNG(WebP ≤30KB)로 교체해 더 강한 시각 anchor.
function DemoPreview() {
  return (
    <div
      role="img"
      aria-label="5영역 채점 결과 예시: 총점 67, 학생 글에 형광펜으로 첨삭한 부분이 표시됨"
      className="border-border bg-surface space-y-3 rounded-xl border p-4"
    >
      {/* 점수 */}
      <div className="flex items-baseline gap-2">
        <span className="text-foreground text-3xl font-bold tracking-tight">67</span>
        <span className="text-subtle-foreground text-xs">/ 100</span>
        {/* 67점의 실제 밴드(getTotalScoreBand 55~74) 라벨과 정합 — "상위 구간"은 과장 카피였음(UX 점검 ⑩). */}
        <span className="bg-band-normal-surface text-band-normal-foreground ml-1 rounded px-2 py-0.5 text-[10px] font-semibold">
          기본 토대는 있음
        </span>
      </div>
      {/* 5영역 미니 바 */}
      <ul className="space-y-1.5">
        {[
          { label: "과제 이해", score: 14 },
          { label: "내용 충실도", score: 13 },
          { label: "구조·논리", score: 13 },
          { label: "표현·문장", score: 14 },
          { label: "성장 가능성", score: 13 },
        ].map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground w-20 shrink-0">{row.label}</span>
            <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
              <div className="h-full bg-[#77D1B6]" style={{ width: `${(row.score / 20) * 100}%` }} />
            </div>
            <span className="text-foreground w-8 shrink-0 text-right tabular-nums">{row.score}</span>
          </li>
        ))}
      </ul>
      {/* 인라인 첨삭 한 줄 */}
      <p className="text-foreground border-border border-t pt-3 text-xs leading-relaxed">
        "
        <mark className="bg-band-normal-surface text-band-normal-foreground decoration-band-normal/60 rounded-[3px] px-0.5 underline underline-offset-2">
          가난한 노래의 씨
        </mark>
        " — 시 한 편이 마음에 오래 남는 이유를 조금은 알게 된 것 같다…
      </p>
    </div>
  );
}

// ── Step 2: 프로필 입력 ────────────────────────────────────────
function Step2({
  onSubmit,
  saveError,
  initial,
}: {
  onSubmit: (draft: ProfileDraft, consent: boolean) => void;
  saveError: string | null;
  initial?: ProfileDraft;
}) {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h2 className="text-foreground break-keep text-xl font-bold leading-tight md:text-2xl">
          잠깐만요, 어떤 글을 쓰세요?
        </h2>
        <p className="text-muted-foreground mt-2 break-keep text-justify text-sm leading-relaxed">
          더 정확한 채점·결과를 위해 닉네임·학년·과목만 알려주세요. 나머지는 선택이에요.
        </p>
      </header>

      {saveError && (
        <div
          role="alert"
          className="border-band-warn-surface bg-band-warn-surface text-band-warn-foreground break-keep rounded-xl border p-3 text-xs leading-relaxed"
        >
          {saveError}
        </div>
      )}

      <ProfileForm
        mode="onboarding"
        submitLabel="다음"
        initial={initial}
        onSubmit={onSubmit}
      />
    </div>
  );
}

// ── Step 3: 동의 게이트(연령 분기) + 시작 CTA 2개 ─────────────────────
function Step3({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const greet = profile?.nickname ? `${profile.nickname}님, ` : "";
  const schoolLevel = profile?.school_level;

  // 동의 상태 — LS에서 로드(Step2가 서비스 동의를 이미 기록). 보호자 동의·AI 옵트인은 여기서 토글.
  const [consent, setConsent] = useState<ConsentState>(emptyConsent());

  useEffect(() => {
    let alive = true;
    void (async () => {
      const c = await loadConsent();
      if (alive) setConsent(c);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 만약 어떤 이유로 step3에 왔는데 profile이 없으면 안전상 step1로 돌아감.
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      // PR #115 결함 2: 읽기 실패 시 step1 강제 복귀(redirect) 회귀를 피하려 안전하게 "있음"으로 가정.
      //   직전 Step2에서 막 저장한 흐름이라 보수적으로 hasProfile=true(불필요한 step1 복귀 방지).
      let has = true;
      try {
        has = !!(await loadProfile());
      } catch {
        has = true;
      }
      if (alive) setHasProfile(has);
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!profile && hasProfile === false) {
      router.replace("/onboarding");
    }
  }, [profile, hasProfile, router]);

  const guardianTrack = needsGuardianConsent(schoolLevel);
  const stillRequired = useMemo(
    () => describeRequired(consent, schoolLevel),
    [consent, schoolLevel],
  );
  const ready = canUseService(consent, schoolLevel);

  // 보호자 동의 토글 — 타임스탬프 주입 + 영속(가산적). 낙관적 set 후 저장.
  const handleGuardianChange = (accepted: boolean) => {
    const nextState = setGuardianConsent(consent, accepted, consentNow());
    setConsent(nextState);
    void saveConsent(nextState);
  };

  // AI 학습 별도 옵트인 토글 — 기본 OFF, 철회 시 null로 되돌림(불변식).
  const handleAiTrainingChange = (accepted: boolean) => {
    const nextState = setAiTrainingOptIn(consent, accepted, consentNow());
    setConsent(nextState);
    void saveConsent(nextState);
  };

  const go = (path: string) => {
    if (!ready) return; // 가드: 필수 동의 미완료 시 이동 차단.
    router.push(path);
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-foreground break-keep text-2xl font-bold leading-tight md:text-3xl">
          {greet}준비됐어요!
        </h2>
        <p className="text-muted-foreground mt-2 break-keep text-justify text-sm leading-relaxed">
          어떤 걸 먼저 해볼까요? 샘플 결과를 빠르게 둘러보거나, 바로 내 글을 채점받을 수 있어요.
        </p>
      </header>

      {/* ── 보호자 동의(만 14세 미만 트랙) ───────────────────────── */}
      {guardianTrack && (
        <label className="border-border bg-surface flex cursor-pointer items-start gap-3 rounded-xl border p-4">
          <input
            type="checkbox"
            checked={!!consent.guardianConsentAt}
            onChange={(e) => handleGuardianChange(e.target.checked)}
            aria-required="true"
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <div className="break-keep text-xs leading-relaxed">
            <span className="text-foreground block text-sm font-semibold">
              보호자(법정대리인) 동의를 확인했어요
            </span>
            <p className="text-muted-foreground mt-2 text-justify">
              만 14세 미만은 보호자의 동의가 있어야 이용할 수 있어요. 보호자에게 위 안내를 보여
              드리고, 동의를 받았다면 체크해 주세요.
            </p>
          </div>
        </label>
      )}

      {/* ── AI 학습 별도 옵트인(기본 OFF) + 아직 필요한 동의 안내 ──────── */}
      <ConsentNotice
        checked={!!consent.serviceConsentAt}
        onChange={() => {
          /* 서비스 동의는 Step2에서 이미 확정 — Step3에서는 표시·재확인용으로만 두고 토글 비활성 */
        }}
        aiTrainingChecked={!!consent.aiTrainingOptInAt}
        onAiTrainingChange={handleAiTrainingChange}
        stillRequired={stillRequired}
      />

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => go("/samples/e")}
          disabled={!ready}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          샘플 e부터 볼래요
        </button>
        <button
          type="button"
          onClick={() => go("/try")}
          disabled={!ready}
          className="border-border bg-surface text-foreground hover:bg-muted inline-flex h-12 w-full items-center justify-center rounded-xl border text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          내 글 바로 채점받을래요
        </button>
        <button
          type="button"
          onClick={() => go("/coach")}
          disabled={!ready}
          className="border-border bg-surface text-foreground hover:bg-muted inline-flex h-12 w-full items-center justify-center rounded-xl border text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          과정 코치로 직접 고쳐 써볼래요
        </button>
      </div>

      <p className="text-subtle-foreground break-keep text-left text-[11px]">
        언제든 [내 정보]에서 프로필을 바꾸거나 데이터를 지울 수 있어요.
      </p>
    </div>
  );
}
