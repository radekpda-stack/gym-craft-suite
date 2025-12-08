import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-accent transition-all",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-10 font-medium text-[0.8rem] text-center",
        row: "flex w-full mt-1",
        cell: cn(
          "relative h-10 w-10 text-center text-sm p-0",
          "focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-primary/10 [&:has([aria-selected])]:rounded-lg",
          "first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal",
          "aria-selected:opacity-100",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:bg-accent focus:text-accent-foreground",
          "transition-all duration-150",
          // Improve click target
          "cursor-pointer select-none",
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-primary text-primary-foreground",
          "hover:bg-primary hover:text-primary-foreground",
          "focus:bg-primary focus:text-primary-foreground",
          // Strong visual feedback
          "ring-2 ring-primary ring-offset-2 ring-offset-background",
          "font-semibold",
          "scale-105",
          "shadow-lg shadow-primary/30",
        ),
        day_today: cn(
          "bg-accent/50 text-accent-foreground font-semibold",
          "border-2 border-primary/30",
        ),
        day_outside: cn(
          "day-outside text-muted-foreground/40",
          "aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          "hover:text-muted-foreground/70",
        ),
        day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
