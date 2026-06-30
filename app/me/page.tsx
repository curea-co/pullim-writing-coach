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
  clearAllLocalStorage,
  clearAllResults,
  clearAllRevisions,
  clearDraft,
  clearMetaUsage,
  clearProfile,
  loadProfile,
  saveProfile,
  type Profile,
} from "../lib/storage";
import { clearConsent } from "../lib/consent-store";
import { useAuth } from "../lib/use-auth";

// PR #115 결함 2: "프로필 없음"(missing)과 "읽기 실패"(error)를 분리.
type LoadState = "loading" | "missing" | "loaded" | "error";

export default function MePage() {
  const router = useRouter();
  const { status } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // PR #115 결함 3: DELETE 실패 시 이동하지 않고 에러 안내(삭제 오인 방지).
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 데이터 전량 삭제 — account/guest 분기(중복·idempotency·consent 일괄 해소, Task 6).
  const handleDelete = async () => {
    setDeleteError(null);
    if (status === "authed") {
      // ── account mode ──
      // 서버 계정 데이터(동의 포함 6키)는 전체 1회 DELETE로 삭제(개별 /api/data/[key] PUT(null) 금지 —
      //   전체 DELETE 후 null row를 재생성해 idempotency를 깬다).
      // ★ PR #115 결함 3: DELETE 응답을 확인한다. 성공(200/204)일 때만 로컬 정리 + 이동.
      //   실패(네트워크/401/5xx)면 이동하지 말고 에러 안내 — 안 지워졌는데 "지웠다"고 오인시키지 않는다.
      let res: Response;
      try {
        res = await fetch("/api/data", { method: "DELETE", credentials: "include" });
      } catch {
        setDeleteError("삭제에 실패했어요. 다시 시도해 주세요.");
        return;
      }
      if (res.status !== 200 && res.status !== 204) {
        setDeleteError("삭제에 실패했어요. 다시 시도해 주세요.");
        return;
      }
      // 같은 기기에 남은 게스트-시절 로컬 흔적 정리(서버 PUT(null) 미발생 — 순수 localStorage).
      clearAllLocalStorage();
    } else {
      // ── guest/local ── clear*는 이 모드에서 localStorage로 라우팅.
      await clearProfile();
      await clearDraft();
      await clearAllRevisions();
      await clearAllResults();
      await clearMetaUsage();
      await clearConsent(); // 동의 기록도 삭제(카피 "프로필·동의 기록" 약속 충족)
    }
    router.push("/");
  };

  // PR #115 결함 1: status resolved 전 보류 + guest→authed 전환 시 재로드.
  //   결함 2: loadProfile throw(읽기 실패) → 에러 상태(빈 "프로필 없음"과 구분).
  useEffect(() => {
    if (status === "loading") return;
    let alive = true;
    void (async () => {
      try {
        const p = await loadProfile();
        if (!alive) return;
        if (p) {
          setProfile(p);
          setState("loaded");
        } else {
          setState("missing");
        }
      } catch {
        if (!alive) return;
        setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [status]);

  // 저장 토스트 — 4초 후 자동 해제
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 4000);
    return () => clearTimeout(t);
  }, [savedAt]);

  if (state === "loading") return null;

  if (state === "error") {
    return (
      <main className="w-full max-w-md px-5 py-8">
        <h1 className="text-foreground text-2xl font-bold">내 정보</h1>
        <section
          role="alert"
          className="border-band-warn-surface bg-band-warn-surface/30 mt-6 rounded-xl border p-5 text-left"
        >
          <p className="text-foreground text-base font-semibold">정보를 불러오지 못했어요</p>
          <p className="text-muted-foreground break-keep mt-2 text-sm leading-relaxed">
            일시적인 연결 문제일 수 있어요. 잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={() => {
              setState("loading");
              void (async () => {
                try {
                  const p = await loadProfile();
                  if (p) {
                    setProfile(p);
                    setState("loaded");
                  } else {
                    setState("missing");
                  }
                } catch {
                  setState("error");
                }
              })();
            }}
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            다시 시도
          </button>
        </section>
      </main>
    );
  }

  if (state === "missing") {
    // Codex PR #56: 공용 기기 보호 — missing 분기는 "내 프로필 없음" = 새 사용자 또는 공용 기기.
    //   이전 사용자의 LRU 최빈값을 자동 노출하면 1회 노출은 막지 못함. MetaUsageCard 숨김.
    //   대신 데이터 삭제 동선을 노출 → 이전 사용자 흔적을 "보지 않고도" 지울 수 있음.
    //   (학습 이력 자체는 prefill 우선순위 profile > LRU에서 여전히 활용 — UI 노출만 차단.)
    return (
      <main className="w-full max-w-md px-5 py-8">
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
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            온보딩 시작하기
          </Link>
        </div>
        <DataDeleteSection
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          onDelete={handleDelete}
          deleteError={deleteError}
        />
      </main>
    );
  }

  // state === "loaded"
  const handleSubmit = async (draft: ProfileDraft, _consent: boolean) => {
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
    const result = await saveProfile(next);
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

  return (
    <main className="w-full max-w-md px-5 py-8">
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

      <DataDeleteSection
        confirmDelete={confirmDelete}
        setConfirmDelete={setConfirmDelete}
        onDelete={handleDelete}
      />
    </main>
  );
}

// 데이터 삭제 영역 — 시각적으로 분리(band-warn 톤). 2-step confirm 사고 방지.
// Codex PR #56: missing 분기에서도 동일하게 노출 — MetaUsageCard로 보이는 학습 이력을
// 공용 기기에서 지울 수 있는 동선 보장.
function DataDeleteSection({
  confirmDelete,
  setConfirmDelete,
  onDelete,
  deleteError,
}: {
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  onDelete: () => void | Promise<void>;
  // PR #115 결함 3: DELETE 실패 안내(있으면 표시, 이동 안 함).
  deleteError?: string | null;
}) {
  return (
    <section className="border-band-warn-surface bg-band-warn-surface/30 mt-10 rounded-xl border p-5">
      <h2 className="text-band-warn-foreground text-sm font-semibold">데이터 삭제</h2>
      <p className="text-muted-foreground break-keep mt-2 text-justify text-xs leading-relaxed">
        이 브라우저에 저장된 <strong className="text-foreground">모든 데이터</strong>를 지웁니다:
        프로필·동의 기록, 본문 임시 저장본, 수정 이력, 채점 결과(최대 20건), 자주 쓰는 메타.
        이 작업은 되돌릴 수 없습니다.
      </p>

      {deleteError && (
        <p role="alert" className="text-band-warn-foreground mt-3 text-xs font-medium">
          {deleteError}
        </p>
      )}

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
              onClick={() => void onDelete()}
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
  );
}
