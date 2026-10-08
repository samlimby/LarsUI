import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLTextAreaElement', 'HTMLInputElement', 'HTMLButtonElement', 'HTMLFormElement', 'SVGElement', 'Element', 'Node', 'Document', 'DocumentFragment', 'MutationObserver', 'MouseEvent', 'KeyboardEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window)
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window)
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
window.ResizeObserver = globalThis.ResizeObserver
window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = await import('react')
const { createElement: h, act } = React
const { createRoot } = await import('react-dom/client')
const { renderToString } = await import('react-dom/server')
// Exercise the same JavaScript and public API consumers get from the build.
const { AiComposer, IconProvider } = await import('../dist/index.js')
let host, root
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host) })
afterEach(async () => { await act(() => root.unmount()); host.remove() })
const render = async (props = {}) => act(() => root.render(h(AiComposer, { rotatePlaceholder: false, ...props })))
const submit = async () => act(() => { host.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })) })
const click = async (label) => act(() => { const button = host.querySelector(`button[aria-label="${label}"]`); assert.ok(button, label); button.click() })
const input = () => host.querySelector('textarea')
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }

test('server-rendered small composers have natural height and retain their draft', () => {
  for (const variant of ['structured', 'unstructured']) {
    const html = renderToString(h(AiComposer, { size:'small', variant, defaultValue:'Saved draft' }))
    const markup = document.createElement('div')
    markup.innerHTML = html
    assert.equal(markup.querySelector('textarea').textContent, 'Saved draft')
    assert.equal(markup.querySelector('.lars-ai-composer__content-clip').style.height, 'auto')
    assert.equal(markup.querySelector('.lars-ai-composer__attachments-reveal').style.height, '0px')
  }
})

test('native textarea options and accessible label reach the input', async () => {
  await render({ inputLabel:'Ask the team', inputProps:{ name:'prompt', maxLength:250, required:true, 'aria-describedby':'hint' } })
  assert.equal(host.querySelector('label').textContent, 'Ask the team')
  assert.equal(input().name, 'prompt')
  assert.equal(input().maxLength, 250)
  assert.equal(input().required, true)
  assert.equal(input().getAttribute('aria-describedby'), 'hint')
  assert.equal(host.querySelector('[aria-label="Send message"]').disabled, true)
})

test('model and mode stay in submissions when their controls are hidden or compact', async () => {
  for (const size of ['default','small']) {
    let result
    await render({ key:size, size, defaultValue:'Hello', modelOptions:[{value:'custom',label:'Custom'}], model:'custom', mode:'chat', showModelDropdown:false, showModelSelector:false, onSubmit:submission=>{result=submission} })
    await submit()
    assert.equal(result.model, 'custom')
    assert.equal(result.mode, 'chat')
    assert.equal(result.message, 'Hello')
    assert.equal(input().value, '')
  }
})

test('async failures retain the draft and files, prevent duplicate sends, and support retry', async () => {
  const requests=[], payloads=[]
  await render({defaultValue:'Keep this draft',onSubmit:payload=>{const request=deferred();requests.push(request);payloads.push(payload);return request.promise}})
  const file = new File(['contents'], 'notes.txt', {type:'text/plain'})
  const upload=host.querySelector('input[type="file"]')
  Object.defineProperty(upload,'files',{configurable:true,value:[file]})
  await act(()=>upload.dispatchEvent(new window.Event('change',{bubbles:true})))
  await submit()
  await submit()
  assert.equal(requests.length,1)
  assert.equal(input().disabled,false)
  assert.equal(input().readOnly,true)
  await act(()=>requests[0].reject(new Error('Please retry')))
  assert.equal(input().value,'Keep this draft')
  assert.equal(input().disabled,false)
  assert.equal(host.querySelector('[role="alert"]').textContent,'Please retry')
  assert.ok(host.querySelector('[aria-label="Remove notes.txt"]'))
  await submit()
  assert.equal(payloads[1].files[0],file)
  await act(()=>requests[1].resolve())
  assert.equal(input().value,'')
  assert.equal(host.querySelector('[role="alert"]'),null)
})

const dispatchDrag = async (type, files = [], types = ['Files'], target = host.querySelector('form')) => {
  const event = new window.Event(type, { bubbles: true, cancelable: true })
  const dataTransfer = { files, types, dropEffect: 'none' }
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
  await act(() => target.dispatchEvent(event))
  return { event, dataTransfer }
}

test('attachment reveal stays mounted through removal, interrupted re-add, and attachment-only submission', async () => {
  for (const variant of ['structured', 'unstructured']) for (const size of ['default', 'small']) {
    let submission
    await render({ key: variant + size, variant, size, onSubmit: payload => { submission = payload } })
    const reveal = host.querySelector('.lars-ai-composer__attachments-reveal')
    const send = () => host.querySelector('[aria-label="Send message"]')
    const file = new File(['contents'], 'notes.txt', { type: 'text/plain' })
    const settle = () => act(() => new Promise(resolve => setTimeout(resolve, 180)))
    assert.equal(reveal.getAttribute('aria-hidden'), 'true')
    assert.equal(reveal.hasAttribute('inert'), true)

    await dispatchDrag('drop', [file])
    await settle()
    assert.equal(reveal.hasAttribute('aria-hidden'), false)
    assert.equal(reveal.hasAttribute('inert'), false)
    assert.equal(send().disabled, false)
    await click('Remove notes.txt')
    assert.equal(reveal.getAttribute('aria-hidden'), 'true')
    assert.equal(reveal.hasAttribute('inert'), true)
    assert.equal(send().disabled, true)

    // Re-adding during the fade must prevent stale completion from hiding it.
    await dispatchDrag('drop', [file])
    await settle()
    assert.equal(host.querySelector('.lars-ai-composer__attachments-reveal'), reveal)
    assert.equal(reveal.hasAttribute('inert'), false)
    assert.equal(host.querySelector('form').classList.contains('lars-ai-composer--attachment-exiting'), false)
    assert.equal(send().disabled, false)

    await submit()
    assert.deepEqual(submission.files, [file])
    assert.equal(submission.message, '')
    assert.equal(send().disabled, true)
    assert.equal(reveal.hasAttribute('inert'), true)
    await settle()
    assert.equal(host.querySelector('.lars-ai-composer__attachments-reveal'), reveal)
    assert.equal(host.querySelector('form').classList.contains('lars-ai-composer--has-attachments'), false)
    assert.equal(reveal.style.height, '0px')
  }
})


test('removing a focused attachment hands focus to the next, previous, or message input', async () => {
  for (const variant of ['structured', 'unstructured']) {
    for (const size of ['default', 'small']) {
      await render({ key: variant + size, variant, size })
      const upload = host.querySelector('input[type="file"]')
      const files = ['first.txt', 'middle.txt', 'last.txt'].map(name => new File(['contents'], name))
      Object.defineProperty(upload, 'files', { configurable: true, value: files })
      await act(() => upload.dispatchEvent(new window.Event('change', { bubbles: true })))
      const remove = name => host.querySelector(`[aria-label="Remove ${name}"]`)
      remove('middle.txt').focus()
      await act(() => remove('middle.txt').click())
      assert.equal(document.activeElement, remove('last.txt'))
      await act(() => remove('last.txt').click())
      assert.equal(document.activeElement, remove('first.txt'))
      await act(() => remove('first.txt').click())
      assert.equal(document.activeElement, input())
      assert.equal(input().disabled, false)
    }
  }
})

test('removing an unfocused attachment leaves the current input focus alone', async () => {
  await render()
  const upload = host.querySelector('input[type="file"]')
  Object.defineProperty(upload, 'files', { configurable: true, value: [new File(['contents'], 'notes.txt')] })
  await act(() => upload.dispatchEvent(new window.Event('change', { bubbles: true })))
  input().focus()
  await act(() => host.querySelector('[aria-label="Remove notes.txt"]').click())
  assert.equal(document.activeElement, input())
})

test('native file drops append attachments and preserve the draft across all composer variants', async () => {
  for (const variant of ['structured', 'unstructured']) {
    for (const size of ['default', 'small']) {
      let submission
      await render({ key: variant + size, variant, size, defaultValue: 'Keep the draft', onSubmit: value => { submission = value } })
      const existing = new File(['existing'], 'existing.txt', { type: 'text/plain' })
      const upload = host.querySelector('input[type="file"]')
      Object.defineProperty(upload, 'files', { configurable: true, value: [existing] })
      await act(() => upload.dispatchEvent(new window.Event('change', { bubbles: true })))
      // During dragover the browser protects the files list, while exposing its type.
      const over = await dispatchDrag('dragover', [], ['Files'], input())
      assert.equal(over.event.defaultPrevented, true)
      assert.equal(over.dataTransfer.dropEffect, 'copy')
      const dropped = [new File(['one'], 'one.txt'), new File(['two'], 'two.txt')]
      const drop = await dispatchDrag('drop', dropped, ['Files'], input())
      assert.equal(drop.event.defaultPrevented, true)
      for (const file of [existing, ...dropped]) assert.ok(host.querySelector(`[aria-label="Remove ${file.name}"]`))
      assert.equal(input().value, 'Keep the draft')
      assert.equal(submission, undefined)
      await submit()
      assert.deepEqual(submission.files, [existing, ...dropped])
      assert.equal(submission.message, 'Keep the draft')
    }
  }
})

test('disabled, read-only, and submitting composers reject file drops without browser navigation', async () => {
  const file = new File(['contents'], 'blocked.txt')
  for (const state of ['disabled', 'readOnly']) {
    await render({ key: state, [state]: true })
    const over = await dispatchDrag('dragover')
    assert.equal(over.dataTransfer.dropEffect, 'none')
    const drop = await dispatchDrag('drop', [file])
    assert.equal(drop.event.defaultPrevented, true)
    assert.equal(host.querySelector('[aria-label="Remove blocked.txt"]'), null)
  }
  const request = deferred()
  await render({ key: 'busy', defaultValue: 'Working', onSubmit: () => request.promise })
  await submit()
  const over = await dispatchDrag('dragover')
  assert.equal(over.dataTransfer.dropEffect, 'none')
  await dispatchDrag('drop', [file])
  assert.equal(host.querySelector('[aria-label="Remove blocked.txt"]'), null)
  await act(() => request.resolve())
})

test('native drag handlers compose with consumer callbacks and leave text dragging alone', async () => {
  let overCalls = 0, dropCalls = 0
  await render({ defaultValue: 'Draft', onDragOver: () => { overCalls++ }, onDrop: event => { dropCalls++; event.preventDefault() } })
  await dispatchDrag('dragover')
  await dispatchDrag('drop', [new File(['contents'], 'custom.txt')])
  assert.equal(overCalls, 1)
  assert.equal(dropCalls, 1)
  assert.equal(host.querySelector('[aria-label="Remove custom.txt"]'), null)

  await render({ inputProps: { onDrop: event => event.preventDefault() } })
  await dispatchDrag('drop', [new File(['contents'], 'input-custom.txt')], ['Files'], input())
  assert.equal(host.querySelector('[aria-label="Remove input-custom.txt"]'), null)

  await render({})
  assert.equal((await dispatchDrag('dragover', [], ['text/plain'], input())).event.defaultPrevented, false)
  assert.equal((await dispatchDrag('drop', [], ['text/plain'], input())).event.defaultPrevented, false)
  assert.equal(input().value, 'Draft')
})

test('a controlled draft remains authoritative when its parent declines an edit', async () => {
  const changes = []
  let submission
  await render({ value: 'Accepted draft', onValueChange: value => changes.push(value), onSubmit: value => { submission = value } })
  await act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input(), 'Declined edit')
    input().dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  assert.equal(input().value, 'Accepted draft')
  assert.equal(changes[0], 'Declined edit')
  await submit()
  assert.equal(submission.message, 'Accepted draft')
})

test('a pending send clears through the latest controlled change callback', async () => {
  const request = deferred(), previousChanges = [], currentChanges = []
  const props = { value: 'Draft', onSubmit: () => request.promise }
  await render({ ...props, onValueChange: value => previousChanges.push(value) })
  await submit()
  await render({ ...props, onValueChange: value => currentChanges.push(value) })
  await act(() => request.resolve())
  assert.deepEqual(previousChanges, [])
  assert.deepEqual(currentChanges, [''])
})

test('successful async submission preserves a newer controlled draft', async () => {
  const request=deferred(), changes=[]
  const props={value:'Original',onSubmit:()=>request.promise,onValueChange:value=>changes.push(value)}
  await render(props)
  await submit()
  await render({...props,value:'New draft from parent'})
  await act(()=>request.resolve())
  assert.equal(input().value,'New draft from parent')
  assert.deepEqual(changes,[])
})

test('host-controlled generation swaps Send for Stop without losing the draft, button, or focus', async () => {
  for (const variant of ['structured', 'unstructured']) {
    for (const size of ['default', 'small']) {
      let sends = 0, stops = 0
      const props = { key: variant + size, variant, size, defaultValue: 'Next draft', onSubmit: () => { sends++ }, onStop: () => { stops++ } }
      await render(props)
      const button = host.querySelector('[aria-label="Send message"]')
      button.focus()
      await render({ ...props, generating: true })
      assert.equal(host.querySelector('[aria-label="Stop generating"]'), button)
      assert.equal(document.activeElement, button)
      assert.equal(button.type, 'button')
      assert.equal(button.disabled, false)
      await submit()
      await act(() => input().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })))
      await click('Stop generating')
      assert.equal(sends, 0)
      assert.equal(stops, 1)
      assert.equal(input().value, 'Next draft')
      // Only the host ends generation; resolving onStop does not reset it.
      assert.equal(button.getAttribute('aria-label'), 'Stop generating')
      await render(props)
      assert.equal(host.querySelector('[aria-label="Send message"]'), button)
      assert.equal(button.type, 'submit')
    }
  }
})


test('Stop transfers focus before disabling, and retains it when an empty draft ends generation', async () => {
  for (const variant of ['structured', 'unstructured']) {
    for (const size of ['default', 'small']) {
      const request = deferred()
      function Chat() {
        const [generating, setGenerating] = React.useState(true)
        return h(AiComposer, {
          variant, size, generating, rotatePlaceholder: false, onSubmit: () => {},
          onStop: async () => {
            assert.equal(document.activeElement, input())
            await request.promise
            setGenerating(false)
          },
        })
      }
      await act(() => root.render(h(Chat)))
      const stop = host.querySelector('[aria-label="Stop generating"]')
      stop.focus()
      await click('Stop generating')
      assert.equal(stop.disabled, true)
      assert.equal(document.activeElement, input())
      await act(() => request.resolve())
      assert.equal(host.querySelector('[aria-label="Send message"]').disabled, true)
      assert.equal(document.activeElement, input())
    }
  }
})

test('Stop can cancel a pending async submission and works with an empty draft', async () => {
  const controller = new AbortController()
  const request = new Promise((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true }))
  let sends = 0, stops = 0
  function Chat() {
    const [generating, setGenerating] = React.useState(false)
    return h(AiComposer, {
      rotatePlaceholder: false, defaultValue: 'Question', generating,
      onSubmit: () => { sends++; setGenerating(true); return request },
      onStop: () => { assert.equal(document.activeElement, input()); stops++; setGenerating(false); controller.abort() },
    })
  }
  await act(() => root.render(h(Chat)))
  await submit()
  assert.equal(input().disabled, false)
  assert.equal(input().readOnly, true)
  assert.equal(host.querySelector('[aria-label="Stop generating"]').disabled, false)
  await submit()
  await click('Stop generating')
  assert.equal(sends, 1)
  assert.equal(stops, 1)
  assert.equal(input().value, 'Question')
  assert.equal(controller.signal.aborted, true)
  assert.equal(host.querySelector('[role="alert"]'), null)
  assert.ok(host.querySelector('[aria-label="Send message"]'))

  await render({ generating: true, onStop: () => { stops++ } })
  assert.equal(input().value, '')
  assert.equal(host.querySelector('[aria-label="Stop generating"]').disabled, false)
  await click('Stop generating')
  assert.equal(stops, 2)
})

test('async Stop prevents duplicates, retains attachments and the draft, and allows error retry', async () => {
  const requests = []
  await render({ generating: true, defaultValue: 'Keep this draft', onStop: () => {
    const request = deferred(); requests.push(request); return request.promise
  } })
  const file = new File(['contents'], 'next-message.txt', { type: 'text/plain' })
  const upload = host.querySelector('input[type="file"]')
  Object.defineProperty(upload, 'files', { configurable: true, value: [file] })
  await act(() => upload.dispatchEvent(new window.Event('change', { bubbles: true })))
  await click('Stop generating')
  await click('Stop generating')
  assert.equal(requests.length, 1)
  assert.equal(host.querySelector('[aria-label="Stop generating"]').disabled, true)
  await act(() => requests[0].reject(new Error('Please retry stopping')))
  assert.equal(host.querySelector('[role="alert"]').textContent, 'Please retry stopping')
  assert.equal(input().value, 'Keep this draft')
  assert.ok(host.querySelector('[aria-label="Remove next-message.txt"]'))
  assert.equal(host.querySelector('[aria-label="Stop generating"]').disabled, false)
  await click('Stop generating')
  assert.equal(requests.length, 2)
  assert.equal(host.querySelector('[role="alert"]'), null)
  await act(() => requests[1].resolve())
  assert.equal(input().value, 'Keep this draft')
})

test('a previous generation stop cannot report a late failure after completion or unmount', async () => {
  const request = deferred()
  const props = { generating: true, defaultValue: 'New draft', onStop: () => request.promise }
  await render(props)
  await click('Stop generating')
  await render({ ...props, generating: false })
  await render(props)
  await act(() => request.reject(new Error('Old failure')))
  assert.equal(host.querySelector('[role="alert"]'), null)
  assert.equal(host.querySelector('[aria-label="Stop generating"]').disabled, false)

  const lateRequest = deferred()
  await render({ ...props, onStop: () => lateRequest.promise })
  await click('Stop generating')
  await act(() => root.render(null))
  await act(() => lateRequest.reject(new Error('Unmounted failure')))
  assert.equal(host.textContent, '')
})

test('Stop respects disabled, readOnly, and missing callbacks, and supports a custom icon', async () => {
  let stops = 0
  for (const state of ['disabled', 'readOnly']) {
    await render({ key: state, generating: true, [state]: true, onStop: () => { stops++ } })
    assert.equal(host.querySelector('[aria-label="Stop generating"]').disabled, true)
    await click('Stop generating')
  }
  await render({ generating: true })
  assert.equal(host.querySelector('[aria-label="Stop generating"]').disabled, true)
  assert.equal(stops, 0)
  await act(() => root.render(h(IconProvider, { icons: { stop: h('svg', { 'data-test-icon': 'custom-stop' }) } },
    h(AiComposer, { generating: true, onStop: () => {}, rotatePlaceholder: false }))))
  assert.ok(host.querySelector('[aria-label="Stop generating"] [data-test-icon="custom-stop"]'))
})

test('disabled/read-only composers cannot submit or start dictation', async () => {
  for (const state of ['disabled','readOnly']) {
    let count=0
    await render({key:state,[state]:true,defaultValue:'Draft',onSubmit:()=>{count++}})
    await submit()
    assert.equal(count,0)
    assert.equal(host.querySelector('[aria-label="Start voice dictation"]').disabled,true)
    assert.equal(host.querySelector('[aria-label="Send message"]').disabled,true)
    assert.equal(input()[state],true)
  }
})

test('action visibility flags apply to both sizes', async () => {
  for (const size of ['default','small']) {
    await render({size,showAddButton:false,showDictation:false,showModelDropdown:false})
    assert.equal(host.querySelectorAll('button').length,1)
    assert.equal(host.querySelector('button').getAttribute('aria-label'),'Send message')
  }
})

test('IME confirmation and consumer-prevented Enter do not submit', async () => {
  let count=0
  await render({defaultValue:'Draft',onSubmit:()=>{count++}})
  await act(()=>input().dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',keyCode:229,bubbles:true,cancelable:true})))
  await act(()=>input().dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true})))
  assert.equal(count,0)
  await render({defaultValue:'Draft',onSubmit:()=>{count++},inputProps:{onKeyDown:event=>event.preventDefault()}})
  await act(()=>input().dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})))
  assert.equal(count,0)
})

test('provider icons inherit, nest, and allow per-component overrides', async () => {
  const mark=name=>h('span',{'data-test-icon':name})
  await act(()=>root.render(h(IconProvider,{icons:{microphone:mark('parent'),add:mark('add')}},
    h(IconProvider,{icons:{close:mark('nested')}},
      h(AiComposer,{size:'small',icons:{microphone:mark('local')},rotatePlaceholder:false})))))
  assert.ok(host.querySelector('[data-test-icon="add"]'))
  assert.ok(host.querySelector('[data-test-icon="nested"]'))
  assert.ok(host.querySelector('[data-test-icon="local"]'))
  assert.equal(host.querySelector('[data-test-icon="parent"]'),null)
  await render({ generating: true, onStop: () => {} })
  assert.equal(host.querySelector('[aria-label="Start voice dictation"] svg').getAttribute('fill'), 'none')
  assert.equal(host.querySelector('[aria-label="Stop generating"] .lars-ai-composer__send-stop svg').getAttribute('fill'), 'currentColor')
})

function mockAudio() {
  let stopped=0
  const stream={getTracks:()=>[{stop(){stopped++}}]}
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>stream}})
  class Recorder extends EventTarget {
    static isTypeSupported(){return true}
    state='inactive';mimeType='audio/webm'
    data(text){const event=new Event('dataavailable');Object.defineProperty(event,'data',{value:new Blob([text],{type:this.mimeType})});this.dispatchEvent(event)}
    start(){this.state='recording';this.data('first ')}
    stop(){this.state='inactive';queueMicrotask(()=>{this.data('last');this.dispatchEvent(new Event('stop'))})}
  }
  globalThis.MediaRecorder=Recorder
  return {stream,stopped:()=>stopped}
}


test('dictation acceptance focuses the busy textarea before the tick disables in every layout', async () => {
  for (const variant of ['structured', 'unstructured']) {
    for (const size of ['default', 'small']) {
      mockAudio()
      const request = deferred()
      await render({ key: variant + size, variant, size, defaultValue: 'Existing', transcribeAudio: () => request.promise })
      await click('Start voice dictation')
      await act(() => new Promise(resolve => requestAnimationFrame(resolve)))
      const accept = host.querySelector('[aria-label="Use dictated text"]')
      accept.focus()
      await click('Use dictated text')
      assert.equal(accept.disabled, true)
      assert.equal(input().placeholder, 'Transcribing')
      assert.equal(input().readOnly, true)
      assert.equal(input().disabled, false)
      assert.equal(document.activeElement, input())
      // A queued dictation-entry frame must not steal focus back to Cancel.
      await act(() => new Promise(resolve => requestAnimationFrame(resolve)))
      assert.equal(document.activeElement, input())
      await act(() => request.resolve('Spoken words'))
      assert.equal(input().value, 'Existing Spoken words')
      assert.equal(input().readOnly, false)
      assert.equal(document.activeElement, input())
    }
  }
})

test('declined controlled dictation does not replace the next submitted draft', async () => {
  mockAudio()
  let submission
  const changes = []
  await render({ value: 'Accepted draft', onValueChange: next => changes.push(next), transcribeAudio: async () => 'Spoken words', onSubmit: next => { submission = next } })
  await click('Start voice dictation')
  await click('Use dictated text')
  assert.equal(input().value, 'Accepted draft')
  assert.equal(changes[0], 'Accepted draft Spoken words')
  await submit()
  assert.equal(submission.message, 'Accepted draft')
})

test('browser recognition startup failures return keyboard focus to the message', { timeout: 5000 }, async (context) => {
  const previousRecognition = window.SpeechRecognition
  context.after(() => { window.SpeechRecognition = previousRecognition })
  for (const size of ['default', 'small']) for (const failure of ['construct', 'start']) {
    const permission = deferred()
    let released = 0
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => permission.promise } })
    window.SpeechRecognition = class {
      constructor() { if (failure === 'construct') throw new Error('Unavailable') }
      start() { throw new Error('Unavailable') }
      abort() {}
    }
    await render({ key: size + failure, size })
    await click('Start voice dictation')
    await act(() => new Promise(resolve => requestAnimationFrame(resolve)))
    assert.equal(document.activeElement.getAttribute('aria-label'), 'Cancel voice dictation')
    await act(() => permission.resolve({ getTracks: () => [{ stop() { released++ } }], getAudioTracks: () => [] }))
    assert.ok(host.querySelector('[role="alert"]'))
    assert.equal(released, 1)
    assert.ok(document.activeElement === input(), 'focus should return to the message after recognition startup fails')
  }
})

test('accept waits for the final audio chunk, displays Transcribing, then appends once', async () => {
  const audio=mockAudio(),request=deferred(),completed=[]
  let captured
  await render({defaultValue:'Existing',rotatePlaceholder:true,transcribeAudio:async(blob,options)=>{captured={text:await blob.text(),options};return request.promise},onDictationComplete:text=>completed.push(text)})
  await click('Start voice dictation')
  await act(() => new Promise(resolve => requestAnimationFrame(resolve)))
  assert.equal(document.activeElement.getAttribute('aria-label'),'Cancel voice dictation')
  await click('Use dictated text')
  assert.equal(captured.text,'first last')
  assert.equal(audio.stopped(),1)
  assert.equal(input().placeholder,'Transcribing')
  assert.equal(host.querySelector('.lars-ai-composer__placeholder'),null)
  await act(()=>request.resolve('Spoken words'))
  assert.equal(input().value,'Existing Spoken words')
  assert.deepEqual(completed,['Spoken words'])
})

test('cancelling transcription aborts the provider and ignores late results', async () => {
  mockAudio();const request=deferred();let signal;const completed=[]
  await render({defaultValue:'Keep',transcribeAudio:(_blob,options)=>{signal=options.signal;return request.promise},onDictationComplete:text=>completed.push(text)})
  await click('Start voice dictation');await click('Use dictated text');await click('Cancel voice dictation')
  assert.equal(signal.aborted,true)
  await act(()=>request.resolve('Too late'))
  assert.equal(input().value,'Keep');assert.deepEqual(completed,[])
})

test('unmount aborts pending transcription and ignores late results', async () => {
  mockAudio();const request=deferred();let signal;const changes=[]
  await render({transcribeAudio:(_blob,options)=>{signal=options.signal;return request.promise},onValueChange:value=>changes.push(value)})
  await click('Start voice dictation');await click('Use dictated text')
  await act(()=>root.render(null))
  assert.equal(signal.aborted,true)
  await act(()=>request.resolve('Too late'))
  assert.deepEqual(changes,[])
})

test('cancelling while microphone permission is pending releases a later stream', async () => {
  const audio=mockAudio(),permission=deferred();let calls=0
  navigator.mediaDevices.getUserMedia=()=>permission.promise
  await render({transcribeAudio:async()=>{calls++;return 'Unused'}})
  await click('Start voice dictation');await click('Cancel voice dictation')
  await act(()=>permission.resolve(audio.stream))
  assert.equal(audio.stopped(),1);assert.equal(calls,0)
})
