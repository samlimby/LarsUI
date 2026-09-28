import { Tooltip } from './components/Tooltip'
import { TermLink, TermTooltipProvider } from './components/TermTooltip'
import type { TermRegistry } from './components/TermTooltip'
import './TooltipDemo.css'

export const tooltipDemoTerms: TermRegistry = {
  provenance: {
    title: 'Provenance',
    body: <p>The record of where an item came from and how it changed. A documented <TermLink term="custody">chain of custody</TermLink> makes that history easier to trust.</p>,
    learnMore: { href: 'https://en.wikipedia.org/wiki/Provenance', label: 'Learn more about provenance' },
  },
  custody: {
    title: 'Chain of custody',
    body: <p>A sequence of people or systems that handled an item. Each handoff calls for <TermLink term="verification">verification</TermLink>.</p>,
  },
  verification: {
    title: 'Verification',
    body: <p>A check that the evidence still matches its recorded history. It can use a <TermLink term="signature">digital signature</TermLink>.</p>,
    learnMore: { href: 'https://en.wikipedia.org/wiki/Verification_and_validation', label: 'Learn more about verification' },
  },
  signature: {
    title: 'Digital signature',
    body: <p>A cryptographic proof that data has not changed. Return to <TermLink term="provenance">provenance</TermLink> to see the cycle behavior.</p>,
  },
  archive: {
    title: 'Archive',
    body: <p>A collection kept for long-term use. Its <TermLink term="provenance">provenance</TermLink> helps readers understand the source.</p>,
  },
}

export function TooltipDemo() {
  return (
    <div className="lars-tooltip-demo">
      <section className="lars-tooltip-demo__basic" aria-labelledby="basic-tooltip-heading">
        <div>
          <span className="lars-tooltip-demo__eyebrow">01 / BASIC</span>
          <h2 id="basic-tooltip-heading">A small answer, in place.</h2>
          <p>Short, noninteractive help on hover or focus.</p>
        </div>
        <div className="lars-tooltip-demo__basic-stage">
          <span>Export quality</span>
          <Tooltip content="Higher quality creates a larger file." side="bottom" align="start">
            <button className="lars-tooltip-demo__info" type="button" aria-label="About export quality">i</button>
          </Tooltip>
        </div>
      </section>

      <section className="lars-tooltip-demo__adaptive" aria-labelledby="adaptive-tooltip-heading">
        <div>
          <span className="lars-tooltip-demo__eyebrow">02 / ADAPTIVE</span>
          <h2 id="adaptive-tooltip-heading">A trail you can follow.</h2>
          <p>Hover an underlined term, enter its panel, and explore deeper.</p>
        </div>
        <TermTooltipProvider terms={tooltipDemoTerms}>
          <div className="lars-tooltip-demo__examples">
            <div className="lars-tooltip-demo__example">
              <span className="lars-tooltip-demo__eyebrow">A SINGLE TERM / THREE LEVELS</span>
              <p>A good archive preserves its <TermLink term="provenance">provenance</TermLink> and makes the chain easy to inspect.</p>
            </div>
            <div className="lars-tooltip-demo__example">
              <span className="lars-tooltip-demo__eyebrow">DENSE TERMS / SAFE CROSSING</span>
              <p>Compare the <TermLink term="archive">archive</TermLink>, <TermLink term="custody">chain of custody</TermLink>, and <TermLink term="verification">verification</TermLink> without losing an open trail.</p>
            </div>
            <div className="lars-tooltip-demo__example lars-tooltip-demo__example--wrap">
              <span className="lars-tooltip-demo__eyebrow">WRAPPED LINK / INLINE ANCHOR</span>
              <p>Even narrow copy can carry a <TermLink term="custody">documented chain of custody</TermLink> across lines.</p>
            </div>
            <div className="lars-tooltip-demo__example lars-tooltip-demo__example--edge">
              <span className="lars-tooltip-demo__eyebrow">VIEWPORT EDGE</span>
              <p>An edge case for <TermLink term="verification">verification</TermLink>.</p>
            </div>
          </div>
          <p className="lars-tooltip-demo__instruction">
            Keyboard: focus a term, press Enter or Space to lock, Tab into the panel, and Escape to step back.
            On touch, tap a term to open the sheet. The digital signature term links back to provenance to demonstrate cycle handling.
          </p>
        </TermTooltipProvider>
      </section>
    </div>
  )
}
