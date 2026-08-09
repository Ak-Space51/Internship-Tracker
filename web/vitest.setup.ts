// `export {}` makes this a module, which `declare global` below requires.
export {};

// jsdom in this setup does not provide localStorage; the collapse store needs it.
class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

Object.defineProperty(globalThis, "localStorage", {
  value: new MemoryStorage(),
  writable: true,
});

// jsdom does not implement matchMedia either; the theme store reads it for the
// OS preference. Tests drive it through setPrefersDark.
declare global {
  var setPrefersDark: (value: boolean) => void;
}

let prefersDark = false;
const mediaListeners = new Set<() => void>();

Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    media: query,
    matches: query.includes("dark") && prefersDark,
    addEventListener: (_event: string, fn: () => void) => void mediaListeners.add(fn),
    removeEventListener: (_event: string, fn: () => void) =>
      void mediaListeners.delete(fn),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  }),
});

globalThis.setPrefersDark = (value: boolean) => {
  prefersDark = value;
  mediaListeners.forEach((fn) => fn());
};
