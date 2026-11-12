import * as React from "react"

import { cn } from "../../lib/cn"
import { GhostZone } from '../headerCtx'

// No overflow on the wrapper: the page scroller owns scrolling, so the sticky header keeps working.
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b-0", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <GhostZone.Provider value>
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  </GhostZone.Provider>
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      /* Connect rows: #E5E5E5 rule, hover #FAFAFA at 70% */ "border-b border-[#E5E5E5] transition-colors hover:bg-[#FAFAFA]/70 data-[state=selected]:bg-[#EFF6FF] data-[state=selected]:shadow-[inset_2px_0_0_#2563EB]",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      /* Amber Connect table head: 42px #FAFAFA row, Geist Mono 13/20 medium uppercase at 0.02em, #737373 */ "h-[42px] bg-[#FAFAFA] shadow-[inset_0_-1px_0_#E5E5E5] px-2 text-left align-middle text-[#737373] font-mono uppercase text-[13px] leading-5 tracking-[0.02em] font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const MON = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
const DAY = `\\d{1,2} ${MON}(?: \\d{4})?`
/* Amounts, counts, IDs and dates: Connect sets these in Geist Mono (invoice numbers, dates, totals). */
const MONO_RE = new RegExp(`^(?:[\\d£$€%.,:+\\-–/×x ()]+(?: ?(?:wk|weeks?|units?|beds?|rooms?|days?))?|${DAY}(?: [–-] ${DAY})?|${MON} \\d{4}|\\d{1,2} ${MON} \\d{1,2}:\\d{2})$`)
const isMono = (x: unknown) => (typeof x === 'string' || typeof x === 'number') && /\d/.test(String(x)) && MONO_RE.test(String(x).trim())
/** Cell content that is just a number, an amount or a date, bare or in a plain span (a grey date), gets the mono face. */
export function monoize(v: React.ReactNode): React.ReactNode {
  if (isMono(v)) return <span className="font-mono tabular-nums">{v}</span>
  if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(v) && v.type === 'span' && isMono(v.props.children))
    return React.cloneElement(v, { className: cn(v.props.className, 'font-mono tabular-nums') })
  return v
}

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      /* Connect rows: 56px, 8px between cells (24px at the table's edges, set by the wrapper), 14px regular ink */ "h-14 px-2 py-2 align-middle text-[#0A0A0A] [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  >{monoize(children)}</td>
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
