// Vitest 글로벌 setup — 컴포넌트 테스트 공통.
//   @testing-library/jest-dom matchers(toBeInTheDocument 등) 등록.
//   jsdom에 없는 브라우저 API(matchMedia 등) stub — reduced-motion 등 컴포넌트가 안전하게 동작.

import "@testing-library/jest-dom/vitest";

// scrollBehavior() 헬퍼는 window.matchMedia 호출 — jsdom은 미구현이라 stub.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom은 Element.scrollIntoView 미구현 — ScoreForm useEffect에서 호출, stub 없으면 TypeError.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
