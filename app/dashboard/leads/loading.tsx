export default function Loading() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando leads...</p>
        </div>
      </div>
    </div>
  )
}
