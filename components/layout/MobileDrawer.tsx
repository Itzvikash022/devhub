"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

interface MobileDrawerProps {
  userName?: string;
  userEmail?: string;
}

export function MobileDrawer({ userName, userEmail }: MobileDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="hover:bg-muted inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium transition-all md:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[200px] p-0" showCloseButton={false}>
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <Sidebar userName={userName} userEmail={userEmail} />
      </SheetContent>
    </Sheet>
  );
}
