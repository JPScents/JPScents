"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

type DialogAnimation = "modal" | "from-bottom" | "from-left" | "from-right";

const DialogOpenContext = React.createContext(false);

function Dialog({
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const open = controlledOpen ?? uncontrolledOpen;

  function handleOpenChange(nextOpen: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  return (
    <DialogOpenContext.Provider value={open}>
      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange} {...props} />
    </DialogOpenContext.Provider>
  );
}
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({
  className,
  children,
  animation = "modal",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { animation?: DialogAnimation }) {
  const open = React.useContext(DialogOpenContext);
  const shouldReduceMotion = useReducedMotion();
  const axis = animation === "from-left" || animation === "from-right" ? "x" : "y";
  const offset = animation === "from-left" ? "-100%" : "100%";
  const panelInitial = shouldReduceMotion
    ? { opacity: 0 }
    : animation === "modal"
      ? { opacity: 0, scale: 0.98 }
      : { opacity: 1, [axis]: offset };
  const panelAnimate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0, y: 0 };
  const panelExit = shouldReduceMotion
    ? { opacity: 0 }
    : animation === "modal"
      ? { opacity: 0, scale: 0.98 }
      : { opacity: 1, [axis]: offset };
  const panelTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: "easeOut" as const };
  const overlayTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: "easeOut" as const };

  return (
    <DialogPrimitive.Portal forceMount>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Overlay forceMount asChild>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={overlayTransition}
              className="fixed inset-0 z-50 bg-jp-overlay-modal"
            />
          </DialogPrimitive.Overlay>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Content forceMount asChild {...props}>
            <motion.div
              initial={panelInitial}
              animate={panelAnimate}
              exit={panelExit}
              transition={panelTransition}
              className={cn(
                "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2.5rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 border border-jp-modal-border bg-jp-surface p-6 shadow-lg outline-none sm:p-8",
                className,
              )}
            >
              {children}
            </motion.div>
          </DialogPrimitive.Content>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-display text-3xl text-jp-text-primary", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-2 text-sm leading-6 text-jp-text-secondary", className)}
      {...props}
    />
  );
}

function DialogCloseButton({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      className={cn(
        "absolute right-4 top-4 inline-flex size-11 items-center justify-center text-jp-text-secondary transition-colors hover:bg-jp-stone hover:text-jp-text-primary focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
      aria-label="Close dialog"
      {...props}
    >
      <X className="size-5" aria-hidden="true" />
    </DialogPrimitive.Close>
  );
}

export {
  Dialog,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
};
