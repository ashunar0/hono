import type { Child, FC, PropsWithChildren } from '../'
import type { ErrorHandler, FallbackRender } from '../components'
import { DOM_ERROR_HANDLER } from '../constants'
import { Fragment, jsx } from './jsx-runtime'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const ErrorBoundary: FC<
  PropsWithChildren<{
    fallback?: Child
    fallbackRender?: FallbackRender
    onError?: ErrorHandler
  }>
> = (({ children, fallback, fallbackRender, onError }: any) => {
  const res = Fragment({ children })
  ;(res as any)[DOM_ERROR_HANDLER] = (err: any) => {
    if (err instanceof Promise) {
      throw err
    }
    onError?.(err)
    return fallbackRender?.(err) || fallback
  }
  return res
}) as any

export const Suspense: FC<PropsWithChildren<{ fallback: any }>> = (({
  children,
  fallback,
}: any) => {
  const res = Fragment({ children })
  ;(res as any)[DOM_ERROR_HANDLER] = (err: any, retry: () => void) => {
    if (!(err instanceof Promise)) {
      throw err
    }
    err.finally(retry)
    // The renderer treats a falsy return as "not handled", so wrap a falsy fallback
    // (`null`, `false`, `0`, ...) to keep it, as in React. Wrap it as `<>{fallback}</>`:
    // a bare `Fragment()` node would be diffed against the suspended children and replace them.
    return fallback || jsx(Fragment, { children: fallback })
  }
  return res
}) as any
/* eslint-enable @typescript-eslint/no-explicit-any */
