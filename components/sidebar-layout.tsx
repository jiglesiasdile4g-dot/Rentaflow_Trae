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
  }
  children: React.ReactNode
}

export default function SidebarLayout({ user, children }: SidebarLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    const saved = localStorage.getItem("rf_sidebar_collapsed")
    if (saved !== null) {
      return saved === "1"
    }
    // Default to collapsed on mobile/tablet (< 1024px)
    return window.innerWidth < 1024
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rf_sidebar_collapsed", isCollapsed ? "1" : "0")
    }
  }, [isCollapsed])

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-shrink-0 h-full">
        <Sidebar user={user} collapsed={isCollapsed} />
      </div>

      <main className="flex-1 overflow-y-auto relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 z-10"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expandir panel lateral" : "Contraer panel lateral"}
          title={isCollapsed ? "Expandir panel lateral" : "Contraer panel lateral"}
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
        <div className="pl-16">{children}</div>
      </main>
    </div>
  )
}
