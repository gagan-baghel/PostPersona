import Image from "next/image"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  className?: string
  size?: number
}

export function BrandLogo({ className, size = 32 }: BrandLogoProps) {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-lg bg-black border border-white/10", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/personapost-logo.png"
        alt="PersonaPost logo"
        fill
        sizes={`${size}px`}
        className="object-contain"
      />
    </div>
  )
}
