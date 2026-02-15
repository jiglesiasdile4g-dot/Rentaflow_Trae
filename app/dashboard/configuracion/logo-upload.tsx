"use client"

interface LogoUploadProps {
  inmobiliariaId: number
  currentLogoUrl: string | null
}

export function LogoUpload({ inmobiliariaId, currentLogoUrl }: LogoUploadProps) {
  return <div>Logo Upload Component (ID: {inmobiliariaId})</div>
}
