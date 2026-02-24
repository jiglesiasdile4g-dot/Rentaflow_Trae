"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Menu, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/sidebar"

interface SidebarLayoutProps {
  user: {
    email?: string
    id: string
    name?: string
  }
  children: React.ReactNode
}

export default function SidebarLayout({ user, children }: SidebarLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      let next = window.innerWidth < 1024
      const saved = localStorage.getItem("rf_sidebar_collapsed")
      if (saved === "1") next = true
      if (saved === "0") next = false
      return next
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("rf_sidebar_collapsed", isCollapsed ? "1" : "0")
    } catch {}
  }, [isCollapsed])

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-shrink-0 h-full">
        <Sidebar user={user} collapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      </div>

      <main className="flex-1 overflow-y-auto relative">
        <div className="w-full h-full">{children}</div>
      </main>
    </div>
  )
}
