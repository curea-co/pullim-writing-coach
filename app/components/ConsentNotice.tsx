"use client";
// 미성년자 대상 데모 동의 — 잠금된 PM 초안(CEO 리뷰 2026-05-28).
//   ✅ EPO 최종 승인 완료 (2026-05-31). 본문 변경 시 EPO 재승인 필요.

export default function ConsentNotice({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
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
  );
}
