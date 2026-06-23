// Vitest 글로벌 setup — 컴포넌트 테스트 공통.
//   @testing-library/jest-dom matchers(toBeInTheDocument 등) 등록.
//   jsdom에 없는 브라우저 API(matchMedia 등) stub — reduced-motion 등 컴포넌트가 안전하게 동작.

import "@testing-library/jest-dom/vitest";

// Node 22+/26는 네이티브 web storage를 --localstorage-file 없이는 비활성(global localStorage=undefined)으로
// 두고, 이 native 전역이 jsdom의 localStorage를 가린다(sessionStorage는 영향 덜함). 컴포넌트(storage.ts)·
// 테스트가 둘 다 window.localStorage/bare localStorage를 쓰므로, 항상 동작하는 in-memory Storage를 직접 심는다.
function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(String(k), String(v)),
  } as Storage;
}

if (typeof window !== "undefined") {
  for (const name of ["localStorage", "sessionStorage"] as const) {
    const store = createMemoryStorage();
    Object.defineProperty(window, name, { configurable: true, value: store });
    Object.defineProperty(globalThis, name, { configurable: true, value: store });
  }
}

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
