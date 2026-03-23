"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload, Image as ImageIcon, Trash2 } from "lucide-react"
import Image from "next/image"
import { uploadLogoAction, deleteLogoAction } from "./actions"
import { useRouter } from "next/navigation"

// Component for uploading and managing company logos

interface LogoUploadProps {
  inmobiliariaId: number
  currentLogoUrl?: string | null
}

export function LogoUpload({ inmobiliariaId, currentLogoUrl }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    setPreview(currentLogoUrl || null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [currentLogoUrl, inmobiliariaId])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato no válido",
        description: "Por favor sube una imagen JPG, PNG, BMP o WebP.",
        variant: "destructive",
      })
      return
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        description: "El logo no debe superar los 2MB.",
        variant: "destructive",
      })
      return
    }

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    // Upload
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("idi", inmobiliariaId.toString())

    try {
      const result = await uploadLogoAction(formData)
      if (result.error) {
        throw new Error(result.error)
      }
      
      toast({
        title: "Logo actualizado",
        description: "El logo se ha subido correctamente.",
      })
      
      // Force refresh to update sidebar
      router.refresh()
      // Also dispatch a custom event if sidebar listens to it (optional)
      window.dispatchEvent(new Event('logo-updated'))
      
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Error al subir",
        description: error.message || "No se pudo subir el logo.",
        variant: "destructive",
      })
      setPreview(currentLogoUrl || null) // Revert
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar el logo?")) return
    
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("idi", inmobiliariaId.toString())
      
      const result = await deleteLogoAction(formData)
      if (result.error) throw new Error(result.error)
        
      setPreview(null)
      toast({ title: "Logo eliminado" })
      router.refresh()
      window.dispatchEvent(new Event('logo-updated'))
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 border rounded-md overflow-hidden bg-muted flex items-center justify-center">
          {preview ? (
            <Image 
              src={preview} 
              alt="Logo Preview" 
              fill 
              className="object-contain"
              unoptimized // Important for blob URLs or immediate updates
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
          )}
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
            >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Subir Logo
            </Button>
            {preview && (
                <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleDelete}
                    disabled={uploading}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Recomendado: 400x100px o cuadrado. Max 2MB. (JPG, PNG, BMP)
          </p>
        </div>
      </div>
      <Input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/jpeg,image/png,image/bmp,image/webp"
        onChange={handleFileChange}
      />
    </div>
  )
}
