---
name: React 18 useRef typing
description: useRef<T>(null) returns RefObject<T | null> in React 18+, not RefObject<T>
---

**Rule:** When passing a ref created with `useRef<T>(null)` as a prop, the prop type must be `React.RefObject<T | null>`, not `React.RefObject<T>`.

```ts
// ✅ Correct prop type
interface Props { videoRef: React.RefObject<HTMLVideoElement | null>; }

// ❌ Wrong — TS2322 error in React 18+
interface Props { videoRef: React.RefObject<HTMLVideoElement>; }
```

**Why:** React 18 changed the return type of `useRef<T>(null)` from `MutableRefObject<T | null>` to `RefObject<T | null>`. The `| null` is now explicit in the type.

**How to apply:** Any component that receives a ref as a prop from a parent using `useRef<T>(null)`.
