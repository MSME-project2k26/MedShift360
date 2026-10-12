import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "Lakshmi Devi" -> "LD" */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")
}

/** "+91 44 2530 5000;+91 44 ..." -> "tel:+914425305000" (first number, digits only) */
export function telHref(phone: string) {
  return `tel:${phone.split(/[;,/]/)[0].replace(/[^\d+]/g, "")}`
}
