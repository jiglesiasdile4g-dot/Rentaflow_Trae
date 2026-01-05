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
    // Always default to collapsed on mobile/tablet (< 1024px) to ensure it doesn't take up space
    if (window.innerWidth < 1024) return true
    
    const saved = localStorage.getItem("rf_sidebar_collapsed")
    if (saved !== null) {
      return saved === "1"
    }
    return false
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rf_sidebar_collapsed", isCollapsed ? "1" : "0")
    }
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
