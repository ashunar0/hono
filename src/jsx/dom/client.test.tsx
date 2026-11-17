/** @jsxImportSource ../ */
import { JSDOM } from 'jsdom'
import { Suspense, use, useEffect, useState } from '.'
import DefaultExport, { createRoot, hydrateRoot } from './client'
import { clearCache } from './intrinsic-element/components'

describe('createRoot', () => {
  beforeAll(() => {
    global.requestAnimationFrame = (cb) => setTimeout(cb)
  })

  let dom: JSDOM
  let rootElement: HTMLElement
  beforeEach(() => {
    dom = new JSDOM('<html><body><div id="root"></div></body></html>', {
      runScripts: 'dangerously',
    })
    global.document = dom.window.document
    global.HTMLElement = dom.window.HTMLElement
    global.SVGElement = dom.window.SVGElement
    global.Text = dom.window.Text
    rootElement = document.getElementById('root') as HTMLElement
  })

  it('render / unmount', async () => {
    const cleanup = vi.fn()
    const App = () => {
      useEffect(() => cleanup, [])
      return <h1>Hello</h1>
    }
    const root = createRoot(rootElement)
    root.render(<App />)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')
    await new Promise((resolve) => setTimeout(resolve))
    root.unmount()
    await Promise.resolve()
    expect(rootElement.innerHTML).toBe('')
    expect(cleanup).toHaveBeenCalled()
  })

  it('call render twice', async () => {
    const App = <h1>Hello</h1>
    const App2 = <h1>World</h1>
    const root = createRoot(rootElement)
    root.render(App)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')

    const createElementSpy = vi.spyOn(dom.window.document, 'createElement')

    root.render(App2)
    await Promise.resolve()
    expect(rootElement.innerHTML).toBe('<h1>World</h1>')

    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it('call render after unmount', async () => {
    const App = <h1>Hello</h1>
    const App2 = <h1>World</h1>
    const root = createRoot(rootElement)
    root.render(App)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')
    root.unmount()
    expect(() => root.render(App2)).toThrow('Cannot update an unmounted root')
  })
})

describe('hydrateRoot', () => {
  let dom: JSDOM
  let rootElement: HTMLElement
  beforeEach(() => {
    dom = new JSDOM('<html><body><div id="root"></div></body></html>', {
      runScripts: 'dangerously',
    })
    global.document = dom.window.document
    global.HTMLElement = dom.window.HTMLElement
    global.SVGElement = dom.window.SVGElement
    global.Text = dom.window.Text
    rootElement = document.getElementById('root') as HTMLElement
  })

  it('should return root object', async () => {
    const cleanup = vi.fn()
    const App = () => {
      useEffect(() => cleanup, [])
      return <h1>Hello</h1>
    }
    const root = hydrateRoot(rootElement, <App />)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')
    await new Promise((resolve) => setTimeout(resolve))
    root.unmount()
    await Promise.resolve()
    expect(rootElement.innerHTML).toBe('')
    expect(cleanup).toHaveBeenCalled()
  })

  it('call render', async () => {
    const App = <h1>Hello</h1>
    const App2 = <h1>World</h1>
    const root = hydrateRoot(rootElement, App)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')

    const createElementSpy = vi.spyOn(dom.window.document, 'createElement')

    root.render(App2)
    await Promise.resolve()
    expect(rootElement.innerHTML).toBe('<h1>World</h1>')

    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it('call render after unmount', async () => {
    const App = <h1>Hello</h1>
    const App2 = <h1>World</h1>
    const root = hydrateRoot(rootElement, App)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')
    root.unmount()
    expect(() => root.render(App2)).toThrow('Cannot update an unmounted root')
  })
})

describe('default export', () => {
  ;['createRoot', 'hydrateRoot'].forEach((key) => {
    it(key, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((DefaultExport as any)[key]).toBeDefined()
    })
  })
})

describe('hydrateRoot with server-rendered DOM', () => {
  let dom: JSDOM
  let rootElement: HTMLElement
  beforeEach(() => {
    dom = new JSDOM('<html><body><div id="root"></div></body></html>', {
      runScripts: 'dangerously',
    })
    global.document = dom.window.document
    global.HTMLElement = dom.window.HTMLElement
    global.SVGElement = dom.window.SVGElement
    global.Text = dom.window.Text
    rootElement = document.getElementById('root') as HTMLElement
  })

  const serverRender = (element: unknown) => {
    rootElement.innerHTML = String(element)
  }

  it('should reuse the existing elements', () => {
    const App = () => (
      <div>
        <h1>Hello</h1>
        <input name='title' />
      </div>
    )
    serverRender(<App />)
    const div = rootElement.querySelector('div')
    const h1 = rootElement.querySelector('h1')
    const input = rootElement.querySelector('input')

    hydrateRoot(rootElement, <App />)

    expect(rootElement.querySelector('div')).toBe(div)
    expect(rootElement.querySelector('h1')).toBe(h1)
    expect(rootElement.querySelector('input')).toBe(input)
    expect(rootElement.innerHTML).toBe('<div><h1>Hello</h1><input name="title"></div>')
  })

  it('should keep the value and focus of an input the user typed into', () => {
    const App = () => <input name='title' value='First' />
    serverRender(<App />)
    const input = rootElement.querySelector('input') as HTMLInputElement
    input.focus()
    input.value = 'FirstTyped'

    hydrateRoot(rootElement, <App />)

    expect(rootElement.querySelector('input')).toBe(input)
    expect(input.value).toBe('FirstTyped')
    expect(document.activeElement).toBe(input)
  })

  it('should attach event handlers and update the reused elements', async () => {
    const App = () => {
      const [count, setCount] = useState(0)
      return <button onClick={() => setCount(count + 1)}>count: {count}</button>
    }
    serverRender(<App />)
    const button = rootElement.querySelector('button') as HTMLButtonElement

    hydrateRoot(rootElement, <App />)
    button.click()
    await Promise.resolve()

    expect(rootElement.querySelector('button')).toBe(button)
    expect(button.textContent).toBe('count: 1')
  })

  it('should split adjacent text merged by the server', async () => {
    const App = () => {
      const [name, setName] = useState('a')
      return (
        <p onClick={() => setName('b')}>
          {'hello '}
          {name}
        </p>
      )
    }
    serverRender(<App />)
    const p = rootElement.querySelector('p') as HTMLParagraphElement
    expect(p.childNodes.length).toBe(1)

    hydrateRoot(rootElement, <App />)
    expect(p.childNodes.length).toBe(2)
    p.click()
    await Promise.resolve()

    expect(rootElement.querySelector('p')).toBe(p)
    expect(p.textContent).toBe('hello b')
  })

  it('should keep the selected option of a select', () => {
    const App = () => (
      <select value='a'>
        <option value='a'>A</option>
        <option value='b'>B</option>
      </select>
    )
    serverRender(<App />)
    const select = rootElement.querySelector('select') as HTMLSelectElement
    select.value = 'b'

    hydrateRoot(rootElement, <App />)

    expect(rootElement.querySelector('select')).toBe(select)
    expect(select.value).toBe('b')
  })

  it('should keep the value of a textarea', () => {
    const App = () => <textarea value='server' />
    rootElement.innerHTML = '<textarea>server</textarea>'
    const textarea = rootElement.querySelector('textarea') as HTMLTextAreaElement
    textarea.value = 'typed'

    hydrateRoot(rootElement, <App />)

    expect(rootElement.querySelector('textarea')).toBe(textarea)
    expect(textarea.value).toBe('typed')
  })

  it('should keep dangerouslySetInnerHTML content', () => {
    const App = () => <div dangerouslySetInnerHTML={{ __html: '<b>raw</b>' }} />
    serverRender(<App />)
    const b = rootElement.querySelector('b')

    hydrateRoot(rootElement, <App />)

    expect(rootElement.querySelector('b')).toBe(b)
  })

  it('should set refs and run effects', async () => {
    const effect = vi.fn()
    const ref = { current: null as HTMLElement | null }
    const App = () => {
      useEffect(effect, [])
      return <p ref={ref}>text</p>
    }
    rootElement.innerHTML = '<p>text</p>'
    const p = rootElement.querySelector('p')

    hydrateRoot(rootElement, <App />)
    await new Promise((resolve) => setTimeout(resolve))

    expect(ref.current).toBe(p)
    expect(effect).toHaveBeenCalledTimes(1)
  })

  it('should keep the order of nested components and fragments', () => {
    const Item = ({ name }: { name: string }) => <li>{name}</li>
    const App = () => (
      <ul>
        <>
          <Item name='a' />
          <Item name='b' />
        </>
        <Item name='c' />
      </ul>
    )
    serverRender(<App />)
    const items = Array.from(rootElement.querySelectorAll('li'))

    hydrateRoot(rootElement, <App />)

    expect(Array.from(rootElement.querySelectorAll('li'))).toEqual(items)
    expect(rootElement.querySelector('ul')?.textContent).toBe('abc')
  })

  it('should fix a mismatch between the server and the client', () => {
    rootElement.innerHTML = '<div><span>server</span><em>extra</em></div>'
    const div = rootElement.querySelector('div')

    hydrateRoot(
      rootElement,
      <div>
        <p>client</p>
      </div>
    )

    expect(rootElement.querySelector('div')).toBe(div)
    expect(rootElement.innerHTML).toBe('<div><p>client</p></div>')
  })
})

describe('hydrateRoot with server-rendered head and Suspense', () => {
  beforeAll(() => {
    global.requestAnimationFrame = (cb) => setTimeout(cb)
  })

  let dom: JSDOM
  let rootElement: HTMLElement
  const setup = (head: string, root: string) => {
    clearCache()
    dom = new JSDOM(`<html><head>${head}</head><body><div id="root">${root}</div></body></html>`, {
      runScripts: 'dangerously',
    })
    global.document = dom.window.document
    global.HTMLElement = dom.window.HTMLElement
    global.SVGElement = dom.window.SVGElement
    global.Text = dom.window.Text
    rootElement = document.getElementById('root') as HTMLElement
  }

  it('should reuse the title the server put in the head', async () => {
    setup('<title>Hello</title>', '<h1>Hello</h1>')
    const title = document.head.querySelector('title')
    const h1 = rootElement.querySelector('h1')

    hydrateRoot(
      rootElement,
      <>
        <title>Hello</title>
        <h1>Hello</h1>
      </>
    )
    await new Promise((resolve) => setTimeout(resolve))

    expect(document.head.querySelectorAll('title').length).toBe(1)
    expect(document.head.querySelector('title')).toBe(title)
    expect(document.head.innerHTML).toBe('<title>Hello</title>')
    expect(rootElement.querySelector('h1')).toBe(h1)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')
  })

  it('should keep the content the server resolved until the client resolves it', async () => {
    // the server streamed the content, and its script removed the markers
    setup('', '<div><p>content</p></div>')
    const p = rootElement.querySelector('p')
    let resolve: (value: string) => void = () => {}
    const promise = new Promise<string>((r) => (resolve = r))
    const onClick = vi.fn()
    const Content = () => <p onClick={onClick}>{use(promise)}</p>

    hydrateRoot(
      rootElement,
      <div>
        <Suspense fallback={<span>loading</span>}>
          <Content />
        </Suspense>
      </div>
    )
    await new Promise((r) => setTimeout(r))

    expect(rootElement.querySelector('p')).toBe(p)
    expect(rootElement.innerHTML).toBe('<div><p>content</p></div>')

    resolve('content')
    await new Promise((r) => setTimeout(r))
    await new Promise((r) => setTimeout(r))
    expect(rootElement.querySelector('p')).toBe(p)
    expect(rootElement.innerHTML).toBe('<div><p>content</p></div>')
    p?.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('should reuse the fallback the server sent before the content', async () => {
    setup('', '<div><template id="H:0"></template><span>loading</span><!--/$--></div>')
    const span = rootElement.querySelector('span')
    const promise = new Promise<string>(() => {})
    const Content = () => <p>{use(promise)}</p>

    hydrateRoot(
      rootElement,
      <div>
        <Suspense fallback={<span>loading</span>}>
          <Content />
        </Suspense>
      </div>
    )
    await new Promise((r) => setTimeout(r))

    expect(rootElement.querySelector('span')).toBe(span)
    // The markers are removed, so the server's script does nothing when the content arrives
    expect(rootElement.innerHTML).toBe('<div><span>loading</span></div>')
  })

  it('should not break the DOM when the server content arrives after hydration', async () => {
    setup('', '<div><template id="H:0"></template><span>loading</span><!--/$--></div>')
    let resolve: (value: string) => void = () => {}
    const promise = new Promise<string>((r) => (resolve = r))
    const Content = () => <p>{use(promise)}</p>

    hydrateRoot(
      rootElement,
      <div>
        <Suspense fallback={<span>loading</span>}>
          <Content />
        </Suspense>
      </div>
    )
    await new Promise((r) => setTimeout(r))

    // the same chunk that streaming.ts sends when the content is ready
    const chunk = document.createElement('div')
    chunk.innerHTML = '<template data-hono-target="H:0"><p>content</p></template>'
    const script = document.createElement('script')
    script.textContent = `((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:0')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)`
    document.body.appendChild(chunk.firstChild as Node)
    document.body.appendChild(script)

    resolve('content')
    await new Promise((r) => setTimeout(r))
    await new Promise((r) => setTimeout(r))

    expect(rootElement.innerHTML).toBe('<div><p>content</p></div>')
    expect(rootElement.querySelectorAll('p').length).toBe(1)
  })
})
