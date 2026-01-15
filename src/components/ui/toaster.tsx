"use client"

import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      expand={false}
      richColors
      theme="dark"
      toastOptions={{
        className: "bg-slate-900 border-white/10 text-white",
        style: {
          background: "rgb(15 23 42)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "white",
        },
      }}
    />
  )
}
