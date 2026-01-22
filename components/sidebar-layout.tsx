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
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    // Check local storage and screen size only on client side after mount
    const checkCollapsed = () => {
      if (window.innerWidth < 1024) return true
      const saved = localStorage.getItem("rf_sidebar_collapsed")
      return saved === "1"
    }
    setIsCollapsed(checkCollapsed())
  }, [])

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
