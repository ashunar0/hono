/** @jsxImportSource ../ */
import { JSDOM } from 'jsdom'
import { useEffect, useState } from '.'
import DefaultExport, { createRoot, hydrateRoot } from './client'

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
        <input name="title" />
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
    const App = () => <input name="title" value="First" />
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
      <select value="a">
        <option value="a">A</option>
        <option value="b">B</option>
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
    const App = () => <textarea value="server" />
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
          <Item name="a" />
          <Item name="b" />
        </>
        <Item name="c" />
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
