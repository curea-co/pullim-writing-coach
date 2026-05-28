"use client";
// /onboarding — 3 step linear flow. localStorage["pwc_profile_v1"] 있으면 / 로 리다이렉트.
//   ?force=1 로 재진입 가능(/me에서 "다시 둘러보기" 시).
//   step state는 URL이 아니라 컴포넌트 내부 — 뒤로가기는 step--, 닫기 없음(강제 흐름).
//
// 구현 상태: Step1(환영) 완성. Step2/3은 다음 배치에서.

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ProfileForm, { type ProfileDraft } from "../components/ProfileForm";
import ProgressDots from "../components/ProgressDots";
import { consentNow, loadProfile, saveProfile, type Profile } from "../lib/storage";

type Step = 1 | 2 | 3;
const TOTAL_STEPS = 3;

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const force = params.get("force") === "1";

  // 초기 step 결정 + 이미 프로필 있으면 redirect (force=1 이면 무시).
  // SSR-safe: useEffect 안에서만 LS 접근.
  const [step, setStep] = useState<Step>(1);
  const [checkedProfile, setCheckedProfile] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (force) {
      setCheckedProfile(true);
      return;
    }
    const profile = loadProfile();
    if (profile) {
      router.replace("/");
      return;
    }
    setCheckedProfile(true);
  }, [force, router]);

  // 프로필 체크 전엔 빈 화면(깜박임 방지) — 짧은 시간이라 스피너 생략.
  if (!checkedProfile) return null;

  const next = () => setStep((s) => (s < TOTAL_STEPS ? ((s + 1) as Step) : s));
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  // Step2 onSubmit — 검증은 ProfileForm 안에서, 여기는 저장+다음 단계 진행.
  const handleProfileSubmit = (draft: ProfileDraft, _consent: boolean) => {
    // ProfileForm 검증 통과 = 필수 필드 있음. 그래도 type narrowing 위해 가드.
    if (!draft.school_level || !draft.primary_subject || !draft.nickname?.trim()) return;
    if (draft.primary_subject === "기타" && !draft.primary_subject_other?.trim()) return;
    setSaveError(null);
    const profile: Profile = {
      nickname: draft.nickname.trim(),
      school_level: draft.school_level,
      primary_subject: draft.primary_subject,
      primary_subject_other:
        draft.primary_subject === "기타" ? draft.primary_subject_other?.trim() : undefined,
      school_name: draft.school_name?.trim() || undefined,
      frequent_genre: draft.frequent_genre || undefined,
      consent_at: consentNow(),
    };
    const result = saveProfile(profile);
    if (result.ok) {
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
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col px-5 py-8">
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
        className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#24D39E] text-sm font-semibold text-white hover:bg-[#1FBE8C]"
      >
        시작하기
      </button>
      <p className="text-subtle-foreground break-keep text-center text-[11px]">
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
        <span className="bg-band-good-surface text-band-good-foreground ml-1 rounded px-2 py-0.5 text-[10px] font-semibold">
          상위 구간
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

// ── Step 3: 시작 CTA 2개 ───────────────────────────────────────
function Step3({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const greet = profile?.nickname ? `${profile.nickname}님, ` : "";

  // 만약 어떤 이유로 step3에 왔는데 profile이 없으면 안전상 step1로 돌아감.
  useEffect(() => {
    if (!profile && !loadProfile()) {
      router.replace("/onboarding");
    }
  }, [profile, router]);

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

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => router.push("/samples/e")}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#24D39E] text-sm font-semibold text-white hover:bg-[#1FBE8C]"
        >
          샘플 e부터 볼래요
        </button>
        <button
          type="button"
          onClick={() => router.push("/try")}
          className="border-border bg-surface text-foreground hover:bg-muted inline-flex h-12 w-full items-center justify-center rounded-xl border text-sm font-semibold"
        >
          내 글 바로 채점받을래요
        </button>
      </div>

      <p className="text-subtle-foreground break-keep text-center text-[11px]">
        언제든 [내 정보]에서 프로필을 바꾸거나 데이터를 지울 수 있어요.
      </p>
    </div>
  );
}
