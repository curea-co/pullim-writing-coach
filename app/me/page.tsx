"use client";
// /me — 프로필 수정 + 데이터 삭제 (A2).
//   localStorage 단일 디바이스. 프로필 없으면 /onboarding 권유 카드.
//   삭제는 2-step confirm(inline expand)로 사고 방지.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MetaUsageCard from "../components/MetaUsageCard";
import ProfileForm, { type ProfileDraft } from "../components/ProfileForm";
import {
  clearAllResults,
  clearAllRevisions,
  clearDraft,
  clearMetaUsage,
  clearProfile,
  loadProfile,
  saveProfile,
  type Profile,
} from "../lib/storage";

type LoadState = "loading" | "missing" | "loaded";

export default function MePage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    if (p) {
      setProfile(p);
      setState("loaded");
    } else {
      setState("missing");
    }
  }, []);

  // 저장 토스트 — 4초 후 자동 해제
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 4000);
    return () => clearTimeout(t);
  }, [savedAt]);

  if (state === "loading") return null;

  if (state === "missing") {
    // Codex PR #56: 프로필이 없어도 메타 사용 이력은 별도 LRU(recordMetaUsage = profile 의존 X).
    //   여기서도 MetaUsageCard 렌더 — 학습된 패턴이 있으면 "내 패턴" 인지 + 온보딩 유인 강화.
    return (
      <main className="mx-auto w-full max-w-md px-5 py-8">
        <h1 className="text-foreground text-2xl font-bold">내 정보</h1>
        <div className="border-border bg-surface mt-6 rounded-xl border p-5">
          <h2 className="text-foreground break-keep text-base font-semibold">
            아직 프로필이 없어요
          </h2>
          <p className="text-muted-foreground mt-2 break-keep text-justify text-sm leading-relaxed">
            온보딩에서 닉네임·학년·과목을 한 번만 알려주시면 매번 입력할
            필요 없이 바로 채점받을 수 있어요.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#24D39E] px-4 text-sm font-semibold text-white hover:bg-[#1FBE8C]"
          >
            온보딩 시작하기
          </Link>
        </div>
        <MetaUsageCard />
      </main>
    );
  }

  // state === "loaded"
  const handleSubmit = (draft: ProfileDraft, _consent: boolean) => {
    if (!draft.school_level || !draft.primary_subject || !draft.nickname?.trim()) return;
    if (draft.primary_subject === "기타" && !draft.primary_subject_other?.trim()) return;
    setSaveError(null);
    // 기존 consent_at 보존 — 동의 모먼트는 한 번. 정책 변경 시 별도 마이그레이션.
    const next: Profile = {
      nickname: draft.nickname.trim(),
      school_level: draft.school_level,
      primary_subject: draft.primary_subject,
      primary_subject_other:
        draft.primary_subject === "기타" ? draft.primary_subject_other?.trim() : undefined,
      school_name: draft.school_name?.trim() || undefined,
      frequent_genre: draft.frequent_genre || undefined,
      consent_at: profile?.consent_at ?? new Date().toISOString(),
    };
    const result = saveProfile(next);
    if (result.ok) {
      setProfile(next);
      setSavedAt(Date.now());
    } else {
      setSaveError(
        result.reason === "quota"
          ? "브라우저 저장 공간이 가득 찼어요. 다른 사이트의 데이터를 정리한 뒤 다시 시도해 주세요."
          : "브라우저가 저장을 막고 있어요. 시크릿(비공개) 모드라면 일반 창에서 시도해 주세요.",
      );
    }
  };

  const handleDelete = () => {
    // Codex PR #25/#29: 삭제 범위가 profile만이라 "프로필·이력 삭제" 카피와 실제 동작 불일치였음.
    // 5개 LS 키 모두 clear — 학생/공용 기기에서 "모두 지웠다"는 약속을 실제 보장.
    clearProfile();
    clearDraft();
    clearAllRevisions();
    clearAllResults();
    clearMetaUsage();
    router.push("/");
  };

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8">
      <header className="mb-6">
        <h1 className="text-foreground text-2xl font-bold">내 정보</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          프로필은 이 브라우저에만 저장돼요.
        </p>
      </header>

      {savedAt && (
        <div
          role="status"
          aria-live="polite"
          className="border-band-good-surface bg-band-good-surface text-band-good-foreground mb-5 rounded-xl border px-4 py-2 text-xs font-medium"
        >
          저장됐어요
        </div>
      )}
      {saveError && (
        <div
          role="alert"
          className="border-band-warn-surface bg-band-warn-surface text-band-warn-foreground break-keep mb-5 rounded-xl border p-3 text-xs leading-relaxed"
        >
          {saveError}
        </div>
      )}

      <ProfileForm
        mode="edit"
        submitLabel="저장"
        initial={{
          nickname: profile?.nickname,
          school_name: profile?.school_name,
          school_level: profile?.school_level,
          primary_subject: profile?.primary_subject,
          primary_subject_other: profile?.primary_subject_other,
          frequent_genre: profile?.frequent_genre,
        }}
        onSubmit={handleSubmit}
      />

      {/* #9 LRU 시각화 — 자주 쓰는 학년·과목·장르·목표 분량 학습 이력 (#41 데이터 기반) */}
      <MetaUsageCard />

      {/* 데이터 삭제 영역 — 시각적으로 분리(band-warn 톤). 2-step confirm 사고 방지. */}
      <section className="border-band-warn-surface bg-band-warn-surface/30 mt-10 rounded-xl border p-5">
        <h2 className="text-band-warn-foreground text-sm font-semibold">데이터 삭제</h2>
        <p className="text-muted-foreground break-keep mt-2 text-justify text-xs leading-relaxed">
          이 브라우저에 저장된 <strong className="text-foreground">모든 데이터</strong>를 지웁니다:
          프로필·동의 기록, 본문 임시 저장본, 수정 이력, 채점 결과(최대 20건), 자주 쓰는 메타.
          이 작업은 되돌릴 수 없습니다.
        </p>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="border-band-warn text-band-warn-foreground hover:bg-band-warn-surface mt-4 inline-flex h-10 items-center rounded-lg border px-4 text-xs font-semibold"
          >
            데이터 삭제하기
          </button>
        ) : (
          <div className="border-band-warn bg-surface mt-4 rounded-lg border p-3">
            <p className="text-foreground text-xs font-semibold">
              정말 모든 데이터를 지울까요?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="bg-band-warn hover:bg-band-warn/90 inline-flex h-9 items-center rounded-lg px-4 text-xs font-semibold text-white"
              >
                네, 삭제할게요
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="border-border bg-surface text-foreground hover:bg-muted inline-flex h-9 items-center rounded-lg border px-4 text-xs font-medium"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
