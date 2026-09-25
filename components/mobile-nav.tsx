"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { NavBody, NavBrand } from "@/components/dashboard-nav"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[86vw] max-w-72 flex-col gap-0 p-0">
        <SheetHeader className="ui-glass border-b p-4">
          <SheetTitle asChild>
            <div>
              <NavBrand />
            </div>
          </SheetTitle>
        </SheetHeader>
        <NavBody onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
