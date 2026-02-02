import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-lg border text-card-foreground overflow-hidden transition-all duration-150",
  {
    variants: {
      variant: {
        default: "border-border bg-card shadow-sm hover:border-primary/30",
        floating: [
          "rounded-2xl border-border/40",
          "bg-gradient-to-br from-card/85 to-card/65",
          "backdrop-blur-xl",
          "shadow-[0_4px_24px_-8px_hsl(0_0%_0%/0.35),inset_0_1px_0_hsl(0_0%_100%/0.04)]",
          "hover:border-primary/25",
          "hover:shadow-[0_8px_32px_-8px_hsl(0_0%_0%/0.45),inset_0_1px_0_hsl(0_0%_100%/0.06)]",
        ],
        instrument: [
          "rounded-2xl border-border/40",
          "bg-gradient-to-br from-card/85 to-card/65",
          "backdrop-blur-xl",
          "shadow-[0_4px_24px_-8px_hsl(0_0%_0%/0.35),inset_0_1px_0_hsl(0_0%_100%/0.04)]",
          "hover:border-primary/25",
          "active:scale-[0.98]",
        ],
        ghost: "border-transparent bg-transparent shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-xl font-bold leading-tight tracking-tight break-words", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground leading-relaxed", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
