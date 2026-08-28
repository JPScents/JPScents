"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-jp-overlay-modal data-[state=closed]:animate-out data-[state=open]:animate-in" />
      <DialogPrimitive.Content
        className={cn("fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2.5rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 border border-jp-modal-border bg-jp-surface p-6 shadow-lg outline-none sm:p-8", className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("font-display text-3xl text-jp-text-primary", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("mt-2 text-sm leading-6 text-jp-text-secondary", className)} {...props} />;
}

function DialogCloseButton({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close className={cn("absolute right-4 top-4 inline-flex size-11 items-center justify-center text-jp-text-secondary transition-colors hover:bg-jp-stone hover:text-jp-text-primary focus-visible:outline-2 focus-visible:outline-offset-2", className)} aria-label="Close dialog" {...props}>
      <X className="size-5" aria-hidden="true" />
    </DialogPrimitive.Close>
  );
}

export { Dialog, DialogClose, DialogCloseButton, DialogContent, DialogDescription, DialogTitle, DialogTrigger };
