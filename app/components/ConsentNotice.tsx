"use client";
// 미성년자 대상 데모 동의 — 잠금된 PM 초안(CEO 리뷰 2026-05-28).
//   ✅ EPO 최종 승인 완료 (2026-05-31). ★ 서비스 동의 라벨/본문은 변경 금지(EPO 재승인 필요).
//
// EPIC 6 배선(유닛 B, 가산적): 기존 서비스 동의 체크박스·EPO 승인 본문은 그대로 두고,
//   ① AI 학습 데이터 사용 **별도 옵트인** 체크박스(기본 해제, 서비스 동의와 분리),
//   ② describeRequired 결과(아직 필요한 동의)를 안내로 추가한다.
//   aiTraining 관련 props는 모두 선택 — 미전달 시 기존 동작(서비스 동의 단일 체크박스) 보존.

export default function ConsentNotice({
  checked,
  onChange,
  aiTrainingChecked,
  onAiTrainingChange,
  stillRequired,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  // AI 학습 별도 옵트인(기본 OFF). 미전달 시 옵트인 UI 자체를 렌더하지 않음(하위 호환).
  aiTrainingChecked?: boolean;
  onAiTrainingChange?: (checked: boolean) => void;
  // describeRequired(state, schoolLevel) 결과 — 아직 받지 못한 필수 동의 한국어 목록.
  stillRequired?: string[];
}) {
  const showAiOptIn = typeof onAiTrainingChange === "function";

  return (
    <div className="space-y-3">
      {/* ── 서비스 동의(EPO 승인 본문 — 변경 금지) ───────────────────── */}
      <label className="border-border bg-surface flex cursor-pointer items-start gap-3 rounded-xl border p-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-required="true"
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#24D39E]"
        />
        <div className="break-keep text-xs leading-relaxed">
          <span className="text-foreground block text-sm font-semibold">
            안내를 확인하고 동의해요
          </span>
          <p className="text-muted-foreground mt-2 text-justify">
            이 데모는 채점 시연 목적입니다. 입력하신 학년·과목·과제 정보는{" "}
            <strong className="text-foreground">이 브라우저에만</strong> 저장돼요
            (서버 X). 닉네임·학교명은{" "}
            <strong className="text-foreground">선택 입력</strong>이고, 결과 화면·PDF에만 표시됩니다.
            만 14세 미만이라면 보호자에게 알리고 사용해 주세요. 데이터는{" "}
            <strong className="text-foreground">[내 정보] {">"} [데이터 삭제]</strong>에서 언제든
            지울 수 있어요.
          </p>
          <p className="text-subtle-foreground mt-2 italic">
            ※ AI 자동 채점입니다. 교사 채점과 다를 수 있어요.
          </p>
        </div>
      </label>

      {/* ── ② AI 학습 별도 옵트인(기본 해제 · 선택 · 서비스 동의와 분리) ──── */}
      {showAiOptIn && (
        <label className="border-border bg-muted/40 flex cursor-pointer items-start gap-3 rounded-xl border p-4">
          <input
            type="checkbox"
            checked={!!aiTrainingChecked}
            onChange={(e) => onAiTrainingChange?.(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#24D39E]"
          />
          <div className="break-keep text-xs leading-relaxed">
            <span className="text-foreground block text-sm font-semibold">
              내 글을 AI 학습에 사용하는 데 동의해요{" "}
              <span className="text-subtle-foreground text-xs font-normal">선택</span>
            </span>
            <p className="text-muted-foreground mt-2 text-justify">
              동의하면 내가 쓴 글이 채점 품질 향상을 위한 AI 학습에 쓰일 수 있어요. 이 동의는{" "}
              <strong className="text-foreground">서비스 이용 동의와 별개</strong>이고{" "}
              <strong className="text-foreground">기본은 꺼져 있어요</strong>. 동의하지 않아도 채점은
              그대로 받을 수 있고, [내 정보]에서 언제든 다시 끌 수 있어요.
            </p>
          </div>
        </label>
      )}

      {/* ── describeRequired: 아직 필요한 동의 안내 ───────────────────── */}
      {stillRequired && stillRequired.length > 0 && (
        <div
          role="status"
          className="border-band-warn-surface bg-band-warn-surface text-band-warn-foreground break-keep rounded-xl border p-3 text-xs leading-relaxed"
        >
          <span className="block font-semibold">아직 필요한 동의가 있어요</span>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
            {stillRequired.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
