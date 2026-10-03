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
    assert.ok(html.includes('Saved draft'))
    assert.ok(html.includes('height:auto'))
    assert.ok(!html.includes('height:0'))
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
  assert.equal(input().disabled,true)
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

test('accept waits for the final audio chunk, displays Transcribing, then appends once', async () => {
  const audio=mockAudio(),request=deferred(),completed=[]
  let captured
  await render({defaultValue:'Existing',rotatePlaceholder:true,transcribeAudio:async(blob,options)=>{captured={text:await blob.text(),options};return request.promise},onDictationComplete:text=>completed.push(text)})
  await click('Start voice dictation')
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
