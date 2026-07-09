import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

interface TypedProgressProps {
  prompt: string
  typed: string
  revealRemaining: boolean
  blinkCaret?: boolean
  className?: string
  // When set, the prompt scrolls so at most this many wrapped lines are ever
  // visible, with the line the caret is on pinned as the SECOND visible line
  // (feedback: long ~2000-char passages must not run off-screen). Omit for the
  // short monster line, which just grows in place.
  maxVisibleLines?: number
}

// Shared char-by-char renderer for "a target string + how much of it has been
// typed correctly so far" — used for both the monster's own live typing and the
// player's progress against their prompt (visual-spec's "target prompt" role).
//
// `revealRemaining` distinguishes the two uses: the player already sees the
// whole passage to type (remaining text dims in, ahead of the caret), but the
// monster's future text is deliberately NOT previewed — only what it's actually
// typed shows, per game-design.html#monster-ai.
//
// At each reached position a correct keystroke shows the target character in the
// normal colour; a WRONG one shows the character the player actually typed, in
// red (feedback #10) — a wrong space, which would be invisible, renders as a red
// underscore. Over-typed characters past the end trail after the line in red.
//
// LINE BREAKING IS OWNED HERE, not left to the browser (feedback: the old
// mixed per-char-spans + one remaining blob let the wrap point shift as you
// typed, so typed letters "ate" the letters after a wrap until the word
// finished). We measure the monospace column width once and wrap the *prompt*
// into fixed lines — a purely prompt-derived split that never moves as `typed`
// changes, so glyphs only recolour in place.
const wrongGlyph = (typedChar: string): string => (typedChar === ' ' ? '_' : typedChar)

// Line box height as a multiple of the font size — matches text-lg's ~1.55
// leading, rounded up so the caret (h-[1em]) and descenders never clip.
const LINE_HEIGHT_EM = 1.6

export interface WrappedLine {
  text: string
  start: number
}

// Greedy word-wrap that preserves EVERY character (spaces included) so global
// indices map 1:1 onto rendered glyphs. A word longer than a full line is
// hard-broken. cols <= 0 (unmeasured, e.g. under jsdom) → one line.
// Exported for unit testing — its only job is that the split never depends on
// what's been typed, which is exactly what killed the old reflow bug.
export const wrapPrompt = (prompt: string, cols: number): WrappedLine[] => {
  if (cols <= 0 || prompt.length <= cols) return [{ text: prompt, start: 0 }]
  const lines: WrappedLine[] = []
  let cur = ''
  let start = 0
  const flush = (): void => {
    lines.push({ text: cur, start })
    start += cur.length
    cur = ''
  }
  const hardBreak = (token: string): string => {
    let rest = token
    while (rest.length > cols) {
      lines.push({ text: rest.slice(0, cols), start })
      start += cols
      rest = rest.slice(cols)
    }
    return rest
  }
  // Split into alternating word / whitespace tokens; both are kept verbatim
  // (empty tokens from the split are ignored).
  for (const token of prompt.split(/(\s+)/)) {
    if (token === '') {
      // nothing to place
    } else if (cur.length + token.length <= cols) {
      cur += token
    } else {
      if (cur.length > 0) flush()
      cur = token.length > cols ? hardBreak(token) : token
    }
  }
  if (cur.length > 0 || lines.length === 0) lines.push({ text: cur, start })
  return lines
}

const TypedProgress = ({
  prompt,
  typed,
  revealRemaining,
  blinkCaret = false,
  className = '',
  maxVisibleLines,
}: TypedProgressProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [cols, setCols] = useState(0)

  // Measure the column width from the real rendered font, and keep it current
  // across resizes. Under jsdom (tests) widths read 0, so cols stays 0 and the
  // whole prompt renders on one line — every existing assertion still holds.
  useLayoutEffect(() => {
    const measure = (): void => {
      const charWidth = measureRef.current?.getBoundingClientRect().width ?? 0
      const width = containerRef.current?.clientWidth ?? 0
      setCols(charWidth > 0 && width > 0 ? Math.max(1, Math.floor(width / charWidth)) : 0)
    }
    measure()
    const el = containerRef.current
    if (typeof ResizeObserver === 'undefined' || !el) return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const overlayLen = Math.min(typed.length, prompt.length)
  const caretPos = overlayLen
  const overtyped = typed.slice(prompt.length)

  const lines = wrapPrompt(prompt, cols)
  // The line the caret sits on. At a wrap boundary the caret belongs to the
  // LATER line (so finishing a line advances you onto the next), and past the
  // last character it stays on the final line.
  const caretLine = lines.findIndex(
    (line) => caretPos >= line.start && caretPos < line.start + line.text.length,
  )
  const activeLine = caretLine < 0 ? lines.length - 1 : caretLine

  const caret = (
    <span
      key="caret"
      className={`inline-block w-px h-[1em] align-middle bg-accent-gold-bright ${
        blinkCaret ? 'caret-blink' : ''
      }`}
    />
  )

  const renderLine = (line: WrappedLine, lineIndex: number): ReactNode => {
    const nodes: ReactNode[] = []
    for (let k = 0; k < line.text.length; k += 1) {
      const i = line.start + k
      if (i === caretPos) nodes.push(caret)
      if (i < overlayLen) {
        const isCorrect = typed[i] === prompt[i]
        nodes.push(
          <span key={`g${i}`} className={isCorrect ? 'text-text-primary' : 'text-danger-bright'}>
            {isCorrect ? prompt[i] : wrongGlyph(typed[i])}
          </span>,
        )
      } else if (revealRemaining) {
        nodes.push(
          <span key={`g${i}`} className="text-text-dim">
            {prompt[i]}
          </span>,
        )
      }
      // else: monster's un-typed future is not previewed — render nothing.
    }
    const isLast = lineIndex === lines.length - 1
    if (isLast && caretPos === line.start + line.text.length) {
      nodes.push(caret)
      if (overtyped) {
        nodes.push(
          <span key="overtyped" className="text-danger-bright">
            {overtyped.split('').map(wrongGlyph).join('')}
          </span>,
        )
      }
    }
    return (
      <div
        key={`line${lineIndex}`}
        style={{ height: `${LINE_HEIGHT_EM}em`, lineHeight: `${LINE_HEIGHT_EM}`, whiteSpace: 'pre' }}
      >
        {nodes}
      </div>
    )
  }

  // The monster (no reveal) shows only lines up through where it's typed, so its
  // future length never leaks; the player sees the whole passage.
  const visibleLines = revealRemaining ? lines : lines.slice(0, activeLine + 1)
  const body = visibleLines.map((line, index) => renderLine(line, index))

  // With a viewport cap, translate so the active line is the 2nd row shown,
  // clamped so we never scroll past the end into blank space.
  if (maxVisibleLines && lines.length > maxVisibleLines) {
    const maxTop = lines.length - maxVisibleLines
    const topLine = Math.min(Math.max(0, activeLine - 1), maxTop)
    return (
      <div ref={containerRef} className={`font-mono overflow-hidden ${className}`}>
        <span ref={measureRef} aria-hidden="true" className="invisible absolute whitespace-pre">
          0
        </span>
        <div style={{ height: `${maxVisibleLines * LINE_HEIGHT_EM}em`, overflow: 'hidden' }}>
          <div
            style={{
              transform: `translateY(-${topLine * LINE_HEIGHT_EM}em)`,
              transition: 'transform 90ms linear',
            }}
          >
            {body}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`font-mono ${className}`}>
      <span ref={measureRef} aria-hidden="true" className="invisible absolute whitespace-pre">
        0
      </span>
      {body}
    </div>
  )
}

export default TypedProgress
