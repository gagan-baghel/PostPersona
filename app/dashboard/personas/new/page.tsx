"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PersonaForm } from "@/components/persona-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function NewPersonaPage() {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(true)

    const handleClose = () => {
        setIsOpen(false)
        setTimeout(() => {
            router.push("/dashboard/personas")
        }, 200)
    }

    const handleSuccess = () => {
        handleClose()
        router.refresh()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Create AI Persona</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Define your AI persona's personality and writing style to generate authentic content
                    </p>
                </DialogHeader>
                <PersonaForm onSuccess={handleSuccess} />
            </DialogContent>
        </Dialog>
    )
}
