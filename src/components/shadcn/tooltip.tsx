import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "../../lib/cn"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        /* dark tooltip (Linear/Understory pattern): near-black chip, white 12px medium text */ "z-50 overflow-hidden whitespace-nowrap rounded-md bg-[#111827] px-2 py-1 text-xs leading-4 font-medium text-white shadow-[0_4px_12px_-2px_rgba(17,24,39,0.25)] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 origin-[--radix-tooltip-content-transform-origin]",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

/** A keycap for a shortcut inside a dark tooltip, e.g. <TooltipKbd>⌘K</TooltipKbd>. */
const TooltipKbd = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <kbd className={cn("ml-1.5 inline-flex h-4 items-center rounded bg-white/15 px-1 font-sans text-[11px] font-medium text-white/80", className)} {...props} />
)

export { TooltipKbd, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
