"use client";
// /try wrapper — 프로필 상태에 따라 (a) 환영 배너 + defaults 주입 또는
// (b) 부드러운 "프로필 만들기" 권유 + 인라인 폼(선택). 강제 리다이렉트 없음(CEO 리뷰).
//
// 인라인 폼 = ProfileForm 그대로 재사용(onboarding 모드, 동의 포함).
// 저장 성공 시 폼 접기 + 페이지 자체를 새로 마운트해 TokenGate에 defaults 전달.

import Link from "next/link";
import { useEffect, useState } from "react";
import { consentNow, loadProfile, saveProfile, type Profile } from "../lib/storage";
import { useAuth } from "../lib/use-auth";
import ProfileForm, { type ProfileDraft } from "./ProfileForm";
import TokenGate from "./TokenGate";

type State = "loading" | "with-profile" | "no-profile";

export default function TryClient() {
  const { status } = useAuth();
  const [state, setState] = useState<State>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inlineOpen, setInlineOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // PR #115 결함 1: accountMode가 status에서 파생되므로 status가 resolved(≠loading)될 때까지
  //   로드를 보류하고, guest→authed 전환 시 재로드한다(첫 로드가 guest로 서버 데이터를 놓치는 회귀 차단).
  // PR #115 결함 2: 프리필용 loadProfile 실패는 에러 UI 없이 catch → 프리필 생략(수동 입력 폴백).
  useEffect(() => {
    if (status === "loading") return;
    let alive = true;
    void (async () => {
      let p: Profile | null = null;
      try {
        p = await loadProfile();
      } catch {
        // 프리필은 비중요 — 읽기 실패 시 프리필 생략(에러 UI 불필요, ScoreForm 수동 입력 폴백).
        p = null;
      }
      if (!alive) return;
      if (p) {
        setProfile(p);
        setState("with-profile");
      } else {
        setState("no-profile");
      }
    })();
    return () => {
      alive = false;
    };
  }, [status]);

  const handleInlineSubmit = async (draft: ProfileDraft, _consent: boolean) => {
    if (!draft.school_level || !draft.primary_subject || !draft.nickname?.trim()) return;
    if (draft.primary_subject === "기타" && !draft.primary_subject_other?.trim()) return;
    setSaveError(null);
    const next: Profile = {
      nickname: draft.nickname.trim(),
      school_level: draft.school_level,
      primary_subject: draft.primary_subject,
      primary_subject_other:
        draft.primary_subject === "기타" ? draft.primary_subject_other?.trim() : undefined,
      school_name: draft.school_name?.trim() || undefined,
      frequent_genre: draft.frequent_genre || undefined,
      consent_at: consentNow(),
    };
    const result = await saveProfile(next);
    if (result.ok) {
      setProfile(next);
      setState("with-profile");
      setInlineOpen(false);
    } else {
      setSaveError(
        result.reason === "quota"
          ? "브라우저 저장 공간이 가득 찼어요. 다른 사이트의 데이터를 정리한 뒤 다시 시도해 주세요."
          : "브라우저가 저장을 막고 있어요. 시크릿(비공개) 모드라면 일반 창에서 시도해 주세요.",
      );
    }
  };

  // ★ PR #115 결함 4(상호작용): TokenGate(→ ScoreWizard·에디터)를 모든 state에서 동일 트리 위치에
  //   둔다. 기존엔 loading 분기가 bare <TokenGate/>, 그 외 분기가 <>…<TokenGate/></>로 위치가 달라
  //   loading→no-profile 전환 때 React가 TokenGate를 언마운트·재마운트해 useScoreForm 상태(파일
  //   업로드로 채운 body 포함)를 날렸다. status가 늦게 resolve되며 이 전환이 사용자 입력과 겹쳐
  //   E2E flaky(업로드한 본문이 사라져 '다음 단계' 비활성)를 유발. 위치를 고정하고 위쪽 배너만
  //   조건부로 바꾼다(고정 key로 재마운트 차단).
  //
  //   defaults는 useScoreForm 마운트 1회 seed에만 쓰인다. loading 동안 TokenGate는 status=loading이라
  //   ScoreWizard를 아직 마운트하지 않으므로(allowed=false), profile resolve 후 첫 마운트 시점엔
  //   defaults가 이미 확정돼 prefill이 유실되지 않는다.
  const defaults =
    state === "with-profile" && profile
      ? {
          school_level: profile.school_level,
          // ScoreForm subject는 SUBJECTS enum만 받음 — 자유 입력값을 그대로 넘기면
          // saveDraft가 invalid 반환해 autosave 실패(Codex PR #22). 항상 enum 값 유지.
          // 자유 입력값(primary_subject_other)은 PDF 헤더·결과 표시용 — 폼 prefill엔 미반영.
          subject: profile.primary_subject,
          genre: profile.frequent_genre,
        }
      : undefined;

  return (
    <>
      {state === "with-profile" && profile && <WelcomeStrip profile={profile} />}

      {/* no-profile — 인라인 권유 + 폼(접힘 기본). 사용자가 무시하고 ScoreForm 직접 채워도 됨. */}
      {state === "no-profile" && (
        <section className="border-border bg-surface mb-6 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-foreground break-keep text-sm font-semibold">
                프로필을 만들면 다음에 빠르게 시작할 수 있어요
              </h2>
              <p className="text-muted-foreground break-keep mt-1 text-xs leading-relaxed">
                닉네임·학년·과목만 한 번 알려주시면 매번 입력할 필요가 없어요. 지금은
                그냥 아래 폼에 직접 채워도 채점받을 수 있어요.
              </p>
            </div>
            {!inlineOpen && (
              <button
                type="button"
                onClick={() => setInlineOpen(true)}
                className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                프로필 만들기
              </button>
            )}
          </div>

          {inlineOpen && (
            <div className="border-border mt-4 border-t pt-4">
              {saveError && (
                <div
                  role="alert"
                  className="border-band-warn-surface bg-band-warn-surface text-band-warn-foreground break-keep mb-4 rounded-xl border p-3 text-xs leading-relaxed"
                >
                  {saveError}
                </div>
              )}
              <ProfileForm
                mode="onboarding"
                submitLabel="저장하고 채점 시작"
                onSubmit={handleInlineSubmit}
              />
              <button
                type="button"
                onClick={() => setInlineOpen(false)}
                className="text-muted-foreground hover:text-foreground mt-3 text-xs"
              >
                나중에 할게요
              </button>
              <p className="text-subtle-foreground mt-3 text-[11px]">
                더 자세한 안내는 <Link href="/onboarding" className="underline">온보딩</Link>에서.
              </p>
            </div>
          )}
        </section>
      )}

      {/* 고정 key — state 전환에도 동일 인스턴스 유지(에디터·작성 중 본문 보존). */}
      <TokenGate key="try-gate" defaults={defaults} />
    </>
  );
}

// 작은 환영 스트립 — 프로필 있을 때 /try 상단.
function WelcomeStrip({ profile }: { profile: Profile }) {
  const subjectLabel =
    profile.primary_subject === "기타"
      ? profile.primary_subject_other || "기타"
      : profile.primary_subject;
  return (
    <div className="text-muted-foreground mb-6 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="break-keep">
        <span className="text-foreground font-semibold">{profile.nickname}님</span>
        ,{" "}
        {profile.school_level} · {subjectLabel}
        {profile.frequent_genre ? ` · ${profile.frequent_genre}` : ""} 기준으로
        준비해 뒀어요.
      </span>
      <Link
        href="/me"
        className="text-foreground hover:text-primary underline-offset-2 hover:underline"
      >
        [내 정보]
      </Link>
    </div>
  );
}
