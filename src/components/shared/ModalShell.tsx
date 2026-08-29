"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ModalShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  trigger?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function ModalShell({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  footer,
}: ModalShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
        <DialogCloseButton />
        <div className="mt-6 max-h-[60vh] overflow-y-auto">{children}</div>
        {footer ? <div className="mt-6 border-t pt-4">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}
