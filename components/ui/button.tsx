import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("site-button", {
  variants: {
    variant: { default: "site-button-primary", outline: "site-button-outline", ghost: "site-button-ghost" },
    size: { default: "", icon: "site-button-icon" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export function Button({
  className, variant, size, asChild, ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
