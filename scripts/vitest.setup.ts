// Vitest 글로벌 setup — 컴포넌트 테스트 공통.
//   @testing-library/jest-dom matchers(toBeInTheDocument 등) 등록.
//   jsdom에 없는 브라우저 API(matchMedia 등) stub — reduced-motion 등 컴포넌트가 안전하게 동작.

import "@testing-library/jest-dom/vitest";

// localStorage/sessionStorage 폴리필 — jsdom 27+(여기선 29) + Node 26 조합의 환경 버그 보정.
//   증상: window.localStorage 게터가 undefined를 돌려주고(opaque about:blank origin),
//   bare sessionStorage만 Node 26 실험적 전역으로 새어 들어와 둘이 불일치 →
//   ScoreForm.test 등이 afterEach의 localStorage.clear()에서 TypeError로 죽음.
//   해결: jsdom 스토리지가 비었으면 표준 동작의 in-memory Storage를 window·전역에 설치.
//   (실제 브라우저/Node와 동일한 Storage 시맨틱이라 테스트 의미를 왜곡하지 않음.)
function installStorage(): void {
  if (typeof window === "undefined") return;

  class MemoryStorage implements Storage {
    #map = new Map<string, string>();
    get length(): number {
      return this.#map.size;
    }
    clear(): void {
      this.#map.clear();
    }
    getItem(key: string): string | null {
      return this.#map.has(key) ? (this.#map.get(key) as string) : null;
    }
    key(index: number): string | null {
      return Array.from(this.#map.keys())[index] ?? null;
    }
    removeItem(key: string): void {
      this.#map.delete(key);
    }
    setItem(key: string, value: string): void {
      this.#map.set(key, String(value));
    }
  }

  for (const name of ["localStorage", "sessionStorage"] as const) {
    let works = false;
    try {
      const s = (window as unknown as Record<string, Storage | undefined>)[name];
      // jsdom이 제대로 주면 .clear가 함수 — 그러면 그대로 둔다.
      works = !!s && typeof s.clear === "function";
    } catch {
      works = false;
    }
    if (!works) {
      const store = new MemoryStorage();
      // window·globalThis 양쪽에 같은 인스턴스를 박아 bare 전역과 window.* 를 일치시킴.
      Object.defineProperty(window, name, {
        configurable: true,
        value: store,
      });
      Object.defineProperty(globalThis, name, {
        configurable: true,
        value: store,
      });
    }
  }
}

installStorage();

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

// jsdom은 ResizeObserver 미구현 — BottomSheet가 콘텐츠 높이 측정에 사용(BottomSheet.tsx:40).
//   stub 없으면 마운트 시 ReferenceError로 컴포넌트 테스트가 죽는다.
//   no-op observer: observe/unobserve/disconnect만 갖춘 표준 형태(측정값은 테스트에서 불필요).
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: ResizeObserverStub,
  });
}
