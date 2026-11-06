/**
 * @module
 * This module provides APIs for `hono/jsx/dom/client`, which is compatible with `react-dom/client`.
 */

import type { Child } from '../base'
import { useState } from '../hooks'
import { buildNode, renderNode } from './render'
import type { NodeObject } from './render'

export interface Root {
  render(children: Child): void
  unmount(): void
}
export type RootOptions = Record<string, unknown>

const createRootObject = (
  element: HTMLElement | DocumentFragment,
  options: RootOptions,
  hydrate: boolean
): Root => {
  let setJsxNode:
    | undefined // initial state
    | ((jsxNode: unknown) => void) // rendered
    | null = // unmounted
    undefined

  if (Object.keys(options).length > 0) {
    console.warn('createRoot options are not supported yet')
  }

  return {
    render(jsxNode: unknown) {
      if (setJsxNode === null) {
        // unmounted
        throw new Error('Cannot update an unmounted root')
      }
      if (setJsxNode) {
        // rendered
        setJsxNode(jsxNode)
      } else {
        renderNode(
          buildNode({
            tag: () => {
              const [_jsxNode, _setJsxNode] = useState(jsxNode)
              setJsxNode = _setJsxNode
              return _jsxNode
            },
            props: {},
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any) as NodeObject,
          element,
          hydrate
        )
      }
    },
    unmount() {
      setJsxNode?.(null)
      setJsxNode = null
    },
  }
}

/**
 * Create a root object for rendering
 * @param element Render target
 * @param options Options for createRoot (not supported yet)
 * @returns Root object has `render` and `unmount` methods
 */
export const createRoot = (
  element: HTMLElement | DocumentFragment,
  options: RootOptions = {}
): Root => createRootObject(element, options, false)

/**
 * Create a root object and hydrate app to the target element.
 * The existing DOM is reused. What differs from `reactNode` is created or removed,
 * but the attributes of a reused element are left as they are.
 * @param element Render target
 * @param reactNode A JSXNode to render
 * @param options Options for createRoot (not supported yet)
 * @returns Root object has `render` and `unmount` methods
 */
export const hydrateRoot = (
  element: HTMLElement | DocumentFragment,
  reactNode: Child,
  options: RootOptions = {}
): Root => {
  const root = createRootObject(element, options, true)
  root.render(reactNode)
  return root
}

export default {
  createRoot,
  hydrateRoot,
}
