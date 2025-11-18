"use client"

import type React from "react"

import { useState } from "react"
import { Menu, X } from "lucide-react"
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background">
      <div className={`transition-all duration-300 ${isSidebarOpen ? "w-64" : "w-0"} overflow-hidden`}>
        <Sidebar user={user} />
      </div>

      <main className="flex-1 overflow-y-auto relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 z-10"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className={`${isSidebarOpen ? "pl-16" : "pl-16"}`}>{children}</div>
      </main>
    </div>
  )
}
