"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "../../lib/cn"

const Tabs = TabsPrimitive.Root

/* The raised white "selected" pill. With `slide` (the default) it is one element under the tabs that moves to the
   active tab, so switching tabs slides it across instead of jumping. Underline-style lists pass slide={false}. */
/* 3755:15922: white, 1px #DFE2E7, two soft drops. */
const PILL = "bg-background border border-[#DFE2E7] shadow-[0_2px_5px_rgba(3,7,18,0.04),0_1px_2px_rgba(3,7,18,0.06)]"
const SlideCtx = React.createContext(false)

type Pill = { x: number; y: number; w: number; h: number; animate: boolean }

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { slide?: boolean }
>(({ className, children, slide = true, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const setRefs = (el: HTMLDivElement | null) => {
    listRef.current = el
    if (typeof ref === "function") ref(el)
    else if (ref) ref.current = el
  }
  const [pill, setPill] = React.useState<Pill | null>(null)

  React.useLayoutEffect(() => {
    const list = listRef.current
    if (!slide || !list) return
    let first = true
    const measure = () => {
      const a = list.querySelector<HTMLElement>('[role=tab][data-state=active]')
      if (!a) return setPill(null)
      /* No slide on first paint: the pill just sits under the selected tab. */
      setPill({ x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight, animate: !first })
      first = false
    }
    measure()
    const mo = new MutationObserver(measure)
    mo.observe(list, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-state"] })
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    return () => { mo.disconnect(); ro.disconnect() }
  }, [slide])

  return (
    <TabsPrimitive.List
      ref={setRefs}
      className={cn(
        /* 2820:111 segmented track: 32px #F3F4F6, 3px inset, 10px radius */ "relative inline-flex items-center gap-0.5 p-[3px] rounded-[10px] bg-secondary text-muted-foreground shadow-[0_1px_0_#FFFFFF,inset_0_0_0_1px_rgba(3,7,18,0.04),inset_0_1px_2px_rgba(3,7,18,0.07)]",
        className
      )}
      {...props}
    >
      {slide && pill && (
        <span
          aria-hidden
          className={cn("pointer-events-none absolute left-0 top-0 rounded-[7px]", PILL)}
          style={{
            width: pill.w,
            height: pill.h,
            transform: `translate(${pill.x}px, ${pill.y}px)`,
            /* Strong ease-out, 200ms: starts moving straight away, settles softly. */
            transition: pill.animate ? "transform 200ms cubic-bezier(0.23, 1, 0.32, 1), width 200ms cubic-bezier(0.23, 1, 0.32, 1)" : "none",
          }}
        />
      )}
      <SlideCtx.Provider value={slide}>{children}</SlideCtx.Provider>
    </TabsPrimitive.List>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const slide = React.useContext(SlideCtx)
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        /* 26px tabs, 7px radius, 14px medium; the selected one is raised white (the sliding pill, or its own fill) */ "relative group inline-flex h-[26px] items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 text-sm leading-5 font-medium transition-colors duration-150 hover:text-[#111827] outline-none [html[data-kbd]_&:focus-visible]:ring-2 [html[data-kbd]_&:focus-visible]:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-[#111827]",
        !slide && "data-[state=active]:bg-background data-[state=active]:shadow-[inset_0_0_0_1px_#DFE2E7,0_2px_5px_rgba(3,7,18,0.04),0_1px_2px_rgba(3,7,18,0.06)]",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
