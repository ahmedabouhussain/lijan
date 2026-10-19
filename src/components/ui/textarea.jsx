import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[84px] w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-base leading-relaxed shadow-elevation-1 placeholder:text-muted-foreground/80 transition-[border-color,box-shadow] duration-150 ease-sovereign focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }