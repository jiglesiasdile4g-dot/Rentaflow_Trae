"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Mail, Plus, RefreshCw, Save } from "lucide-react"
import { createComunicacion, listComunicaciones, updateComunicacion } from "@/app/actions/comunicaciones"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ColumnDef = {
  name: string
  dataType: string
}

const defaultColumns: ColumnDef[] = [
  { name: "inmobiliaria", dataType: "text" },
  { name: "titulo_comunicacion", dataType: "text" },
  { name: "tipo", dataType: "text" },
  { name: "subject", dataType: "text" },
  { name: "texto_html", dataType: "text" },
]

const modalFieldNames = ["titulo_comunicacion", "subject"]
const draftFieldNames = ["titulo_comunicacion", "subject", "texto_html"]
const fallbackModalColumns = defaultColumns.filter((c) => modalFieldNames.includes(c.name))
const fallbackDraftColumns = defaultColumns.filter((c) => draftFieldNames.includes(c.name))

const nonEditableColumns = new Set(["id", "created_at", "updated_at"])

const getKeyField = (row: Record<string, any>, columns: ColumnDef[]) => {
  if ("id" in row) return "id"
  const columnNames = columns.map((c) => c.name)
  const candidate = columnNames.find((name) => name.toLowerCase() === "uuid") || columnNames[0]
  return candidate || "id"
}

const buildDraft = (columns: ColumnDef[], row?: Record<string, any>) => {
  const draft: Record<string, any> = {}
  columns.forEach((col) => {
    if (nonEditableColumns.has(col.name)) return
    const value = row ? row[col.name] : undefined
    if (value !== undefined && value !== null) {
      draft[col.name] = value
      return
    }
    draft[col.name] = ""
  })
  return draft
}

export default function ComunicacionesPage() {
  const { toast } = useToast()
  const [columns, setColumns] = useState<ColumnDef[]>([])
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | number | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, any>>({})
  const [newDraft, setNewDraft] = useState<Record<string, any>>({})
  const [error, setError] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState("")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const wysiwygRef = useRef<HTMLDivElement | null>(null)
  const htmlEditorRef = useRef<HTMLTextAreaElement | null>(null)
  const editPreviewRef = useRef<HTMLDivElement | null>(null)
  const createPreviewRef = useRef<HTMLDivElement | null>(null)
  const [activePanel, setActivePanel] = useState<"html" | "preview" | null>(null)
  const [activeLine, setActiveLine] = useState<number | null>(null)
  const [activeRange, setActiveRange] = useState<{ start: number; end: number } | null>(null)
  const [htmlLineHeight, setHtmlLineHeight] = useState(20)
  const [htmlPaddingTop, setHtmlPaddingTop] = useState(12)
  const [htmlScrollTop, setHtmlScrollTop] = useState(0)
  const [previewLineHeight, setPreviewLineHeight] = useState(20)
  const [previewPaddingTop, setPreviewPaddingTop] = useState(12)
  const [previewScrollTop, setPreviewScrollTop] = useState(0)
  const lastSyncedRef = useRef<{ panel: "html" | "preview" | null; line: number | null }>({
    panel: null,
    line: null,
  })
  const isSyncingSelectionRef = useRef(false)

  const modalFieldColumns = useMemo(
    () => columns.filter((c) => !nonEditableColumns.has(c.name) && modalFieldNames.includes(c.name)),
    [columns]
  )
  const draftFieldColumns = useMemo(
    () => columns.filter((c) => !nonEditableColumns.has(c.name) && draftFieldNames.includes(c.name)),
    [columns]
  )
  const listKeyField = useMemo(() => (rows.length > 0 ? getKeyField(rows[0], columns) : "id"), [rows, columns])
  const filteredRows = useMemo(() => {
    const query = filterQuery.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => {
      const title = String(row.titulo_comunicacion || "").toLowerCase()
      const subject = String(row.subject || "").toLowerCase()
      return title.includes(query) || subject.includes(query)
    })
  }, [filterQuery, rows])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listComunicaciones()
      if (result.error) {
        throw new Error(result.error)
      }
      const cols = result.columns || []
      const nextColumns = cols.length > 0 ? cols : defaultColumns
      setColumns(nextColumns)
      setRows(result.data || [])
      const nextDraftColumns = nextColumns.filter((c) => draftFieldNames.includes(c.name))
      setNewDraft(buildDraft(nextDraftColumns.length > 0 ? nextDraftColumns : fallbackDraftColumns))
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar comunicaciones")
      console.error("[comunicaciones] fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const el = wysiwygRef.current
    if (!el) return
    const html = String(selectedId ? editDraft.texto_html || "" : newDraft.texto_html || "")
    if (document.activeElement === el) return
    if (el.innerHTML !== html) {
      el.innerHTML = html
    }
  }, [selectedId, editDraft.texto_html, newDraft.texto_html])

  useEffect(() => {
    const el = htmlEditorRef.current
    if (!el) return
    const html = String(selectedId ? editDraft.texto_html || "" : newDraft.texto_html || "")
    if (document.activeElement === el) return
    if (el.value !== html) {
      el.value = html
    }
  }, [selectedId, editDraft.texto_html, newDraft.texto_html])

  useEffect(() => {
    const el = htmlEditorRef.current
    if (!el) return
    const styles = window.getComputedStyle(el)
    const lh = parseFloat(styles.lineHeight)
    const pt = parseFloat(styles.paddingTop)
    if (!Number.isNaN(lh)) setHtmlLineHeight(lh)
    if (!Number.isNaN(pt)) setHtmlPaddingTop(pt)
  }, [])

  useEffect(() => {
    const el = editPreviewRef.current
    if (!el) return
    const html = String(editDraft.texto_html || "")
    if (document.activeElement === el) return
    if (el.innerHTML !== html) {
      el.innerHTML = html
    }
  }, [editDraft.texto_html])

  useEffect(() => {
    const el = createPreviewRef.current
    if (!el) return
    const html = String(newDraft.texto_html || "")
    if (document.activeElement === el) return
    if (el.innerHTML !== html) {
      el.innerHTML = html
    }
  }, [newDraft.texto_html])

  useEffect(() => {
    const el = wysiwygRef.current
    if (!el) return
    const styles = window.getComputedStyle(el)
    const lh = parseFloat(styles.lineHeight)
    const pt = parseFloat(styles.paddingTop)
    if (!Number.isNaN(lh)) setPreviewLineHeight(lh)
    if (!Number.isNaN(pt)) setPreviewPaddingTop(pt)
  }, [])


  const getLineFromPosition = (value: string, position: number) => {
    if (position <= 0) return 1
    return value.slice(0, Math.min(position, value.length)).split("\n").length
  }

  const getCaretOffsetInHtml = useCallback((el: HTMLDivElement) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    if (!el.contains(range.endContainer)) return null
    const preRange = range.cloneRange()
    preRange.selectNodeContents(el)
    preRange.setEnd(range.endContainer, range.endOffset)
    const container = document.createElement("div")
    container.appendChild(preRange.cloneContents())
    return container.innerHTML.length
  }, [])

  const getSelectionOffsetsInHtml = useCallback((el: HTMLDivElement) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    if (!el.contains(range.commonAncestorContainer)) return null
    const startRange = range.cloneRange()
    startRange.selectNodeContents(el)
    startRange.setEnd(range.startContainer, range.startOffset)
    const endRange = range.cloneRange()
    endRange.selectNodeContents(el)
    endRange.setEnd(range.endContainer, range.endOffset)
    const startContainer = document.createElement("div")
    startContainer.appendChild(startRange.cloneContents())
    const endContainer = document.createElement("div")
    endContainer.appendChild(endRange.cloneContents())
    return {
      start: startContainer.innerHTML.length,
      end: endContainer.innerHTML.length,
    }
  }, [])

  const getCaretOffsetInText = useCallback((el: HTMLDivElement) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    if (!el.contains(range.endContainer)) return null
    const preRange = range.cloneRange()
    preRange.selectNodeContents(el)
    preRange.setEnd(range.endContainer, range.endOffset)
    const container = document.createElement("div")
    container.appendChild(preRange.cloneContents())
    return (container.textContent || "").length
  }, [])

  const getSelectionOffsetsInText = useCallback((el: HTMLDivElement) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    if (!el.contains(range.commonAncestorContainer)) return null
    const startRange = range.cloneRange()
    startRange.selectNodeContents(el)
    startRange.setEnd(range.startContainer, range.startOffset)
    const endRange = range.cloneRange()
    endRange.selectNodeContents(el)
    endRange.setEnd(range.endContainer, range.endOffset)
    const startContainer = document.createElement("div")
    startContainer.appendChild(startRange.cloneContents())
    const endContainer = document.createElement("div")
    endContainer.appendChild(endRange.cloneContents())
    return {
      start: (startContainer.textContent || "").length,
      end: (endContainer.textContent || "").length,
    }
  }, [])

  const setSelectionInContentEditable = useCallback((el: HTMLDivElement, start: number, end: number) => {
    const selection = window.getSelection()
    if (!selection) return
    const range = document.createRange()
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let current = 0
    let node = walker.nextNode() as Text | null
    let startNode: Text | null = null
    let endNode: Text | null = null
    let startOffset = 0
    let endOffset = 0
    while (node) {
      const len = node.textContent?.length ?? 0
      if (!startNode && current + len >= start) {
        startNode = node
        startOffset = Math.max(0, start - current)
      }
      if (!endNode && current + len >= end) {
        endNode = node
        endOffset = Math.max(0, end - current)
        break
      }
      current += len
      node = walker.nextNode() as Text | null
    }
    if (!startNode) {
      selection.removeAllRanges()
      return
    }
    if (!endNode) {
      endNode = startNode
      endOffset = startOffset
    }
    range.setStart(startNode, Math.min(startOffset, startNode.textContent?.length ?? 0))
    range.setEnd(endNode, Math.min(endOffset, endNode.textContent?.length ?? 0))
    selection.removeAllRanges()
    selection.addRange(range)
  }, [])

  const scrollOtherPanelToLine = useCallback(
    (panel: "html" | "preview", line: number) => {
      if (line <= 0) return
      if (lastSyncedRef.current.panel === panel && lastSyncedRef.current.line === line) return
      lastSyncedRef.current = { panel, line }
      if (panel === "html") {
        const target = wysiwygRef.current
        if (!target) return
        const lineTop = previewPaddingTop + (line - 1) * previewLineHeight
        const nextTop = Math.max(0, lineTop - (target.clientHeight / 2 - previewLineHeight / 2))
        target.scrollTop = nextTop
        setPreviewScrollTop(nextTop)
        return
      }
      const target = htmlEditorRef.current
      if (!target) return
      const lineTop = htmlPaddingTop + (line - 1) * htmlLineHeight
      const nextTop = Math.max(0, lineTop - (target.clientHeight / 2 - htmlLineHeight / 2))
      target.scrollTop = nextTop
      setHtmlScrollTop(nextTop)
    },
    [htmlLineHeight, htmlPaddingTop, previewLineHeight, previewPaddingTop]
  )

  const syncHtmlByText = useCallback(
    (text: string, fallbackRatio: number | null) => {
      const htmlEl = htmlEditorRef.current
      if (!htmlEl) return
      const value = htmlEl.value
      const index = text ? value.indexOf(text) : -1
      if (index >= 0) {
        isSyncingSelectionRef.current = true
        htmlEl.setSelectionRange(index, index + text.length)
        htmlEl.focus()
        const lineStart = getLineFromPosition(value, index)
        const lineEnd = getLineFromPosition(value, index + text.length)
        setActiveLine(lineStart)
        setActiveRange({ start: Math.min(lineStart, lineEnd), end: Math.max(lineStart, lineEnd) })
        scrollOtherPanelToLine("preview", lineStart)
        requestAnimationFrame(() => {
          isSyncingSelectionRef.current = false
        })
        return
      }
      if (fallbackRatio !== null) {
        const approxPos = Math.round(fallbackRatio * value.length)
        isSyncingSelectionRef.current = true
        htmlEl.setSelectionRange(approxPos, approxPos)
        htmlEl.focus()
        const lineStart = getLineFromPosition(value, approxPos)
        setActiveLine(lineStart)
        setActiveRange({ start: lineStart, end: lineStart })
        scrollOtherPanelToLine("preview", lineStart)
        requestAnimationFrame(() => {
          isSyncingSelectionRef.current = false
        })
      }
    },
    [scrollOtherPanelToLine]
  )

  const syncPreviewByText = useCallback(
    (text: string, fallbackRatio: number | null) => {
      const previewEl = wysiwygRef.current
      if (!previewEl) return
      const content = previewEl.textContent || ""
      const index = text ? content.indexOf(text) : -1
      if (index >= 0) {
        isSyncingSelectionRef.current = true
        setSelectionInContentEditable(previewEl, index, index + text.length)
        previewEl.focus()
        const lineStart = getLineFromPosition(content, index)
        const lineEnd = getLineFromPosition(content, index + text.length)
        setActiveLine(lineStart)
        setActiveRange({ start: Math.min(lineStart, lineEnd), end: Math.max(lineStart, lineEnd) })
        scrollOtherPanelToLine("html", lineStart)
        requestAnimationFrame(() => {
          isSyncingSelectionRef.current = false
        })
        return
      }
      if (fallbackRatio !== null) {
        const approxPos = Math.round(fallbackRatio * content.length)
        isSyncingSelectionRef.current = true
        setSelectionInContentEditable(previewEl, approxPos, approxPos)
        previewEl.focus()
        const lineStart = getLineFromPosition(content, approxPos)
        setActiveLine(lineStart)
        setActiveRange({ start: lineStart, end: lineStart })
        scrollOtherPanelToLine("html", lineStart)
        requestAnimationFrame(() => {
          isSyncingSelectionRef.current = false
        })
      }
    },
    [scrollOtherPanelToLine, setSelectionInContentEditable]
  )

  useEffect(() => {
    const handleSelectionChange = () => {
      if (isSyncingSelectionRef.current) return
      const htmlEl = htmlEditorRef.current
      const previewEl = wysiwygRef.current
      if (htmlEl && document.activeElement === htmlEl) {
        const value = htmlEl.value
        const start = htmlEl.selectionStart ?? value.length
        const end = htmlEl.selectionEnd ?? start
        const lineStart = getLineFromPosition(value, start)
        const lineEnd = getLineFromPosition(value, end)
        setActivePanel("html")
        setActiveLine(lineStart)
        setActiveRange({ start: Math.min(lineStart, lineEnd), end: Math.max(lineStart, lineEnd) })
        const selectedText = start !== end ? value.slice(start, end) : ""
        const ratio = value.length > 0 ? start / value.length : null
        if (selectedText) {
          syncPreviewByText(selectedText, ratio)
        } else {
          scrollOtherPanelToLine("html", lineStart)
        }
        return
      }
      if (previewEl && document.activeElement === previewEl) {
        const text = previewEl.textContent || ""
        const offsets = getSelectionOffsetsInText(previewEl)
        const startOffset = offsets?.start ?? getCaretOffsetInText(previewEl) ?? text.length
        const endOffset = offsets?.end ?? startOffset
        const lineStart = getLineFromPosition(text, startOffset)
        const lineEnd = getLineFromPosition(text, endOffset)
        setActivePanel("preview")
        setActiveLine(lineStart)
        setActiveRange({ start: Math.min(lineStart, lineEnd), end: Math.max(lineStart, lineEnd) })
        const selectedText = window.getSelection()?.toString() || ""
        const ratio = text.length > 0 ? startOffset / text.length : null
        if (selectedText) {
          syncHtmlByText(selectedText, ratio)
        } else {
          scrollOtherPanelToLine("preview", lineStart)
        }
      }
    }
    document.addEventListener("selectionchange", handleSelectionChange)
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange)
    }
  }, [
    getCaretOffsetInHtml,
    getCaretOffsetInText,
    getSelectionOffsetsInHtml,
    getSelectionOffsetsInText,
    scrollOtherPanelToLine,
    syncHtmlByText,
    syncPreviewByText,
  ])

  const handleSelect = useCallback(
    (row: Record<string, any>) => {
      const keyField = getKeyField(row, columns)
      setSelectedId(row[keyField])
      setEditDraft(buildDraft(draftFieldColumns.length > 0 ? draftFieldColumns : fallbackDraftColumns, row))
    },
    [columns, draftFieldColumns]
  )

  useEffect(() => {
    if (loading) return
    if (filteredRows.length === 0) return
    const hasSelected = selectedId != null && filteredRows.some((row) => String(row[listKeyField]) === String(selectedId))
    if (hasSelected) return
    handleSelect(filteredRows[0])
  }, [filteredRows, handleSelect, listKeyField, loading, selectedId])

  const handleUpdate = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      const row = rows.find((r) => String(r[getKeyField(r, columns)]) === String(selectedId))
      if (!row) throw new Error("No se encontró el registro")
      const keyField = getKeyField(row, columns)
      const { error: updateError } = await updateComunicacion(keyField, row[keyField], editDraft)
      if (updateError) throw new Error(updateError)
      toast({ title: "Guardado", description: "Comunicación actualizada" })
      await fetchData()
      setIsEditOpen(false)
    } catch (err: any) {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const { error: createError } = await createComunicacion(newDraft)
      if (createError) throw new Error(createError)
      toast({ title: "Creada", description: "Comunicación guardada" })
      await fetchData()
      setIsCreateOpen(false)
    } catch (err: any) {
      toast({ title: "Error", description: "No se pudo crear", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const renderField = (col: ColumnDef, draft: Record<string, any>, setDraft: (v: Record<string, any>) => void) => {
    const value = draft[col.name]
    return (
      <Input
        value={value ?? ""}
        onChange={(e) => setDraft({ ...draft, [col.name]: e.target.value })}
        className="border"
      />
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Comunicaciones</h2>
          <p className="text-muted-foreground mt-2">Gestiona plantillas y mensajes de notificación</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Recargar
        </Button>
      </div>

      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4 text-red-600">{error}</CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Listado</CardTitle>
            </div>
            <CardDescription>Selecciona una comunicación por título y asunto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Buscar por título o asunto"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="border"
            />
            {loading ? (
              <div className="text-sm text-muted-foreground">Cargando...</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay comunicaciones registradas</div>
            ) : filteredRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay resultados para el filtro</div>
            ) : (
              <Select
                value={selectedId ? String(selectedId) : ""}
                onValueChange={(value) => {
                  const row = filteredRows.find((r) => String(r[listKeyField]) === value)
                  if (row) handleSelect(row)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una comunicación" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRows.map((row) => {
                    const rowId = row[listKeyField]
                    const title = row.titulo_comunicacion || "Sin título"
                    const subject = row.subject || "Sin asunto"
                    return (
                      <SelectItem key={String(rowId)} value={String(rowId)}>
                        {title} — {subject}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setIsEditOpen(true)} disabled={!selectedId || saving || loading}>
                <Save className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedId(null)
                  const nextDraftColumns = columns.filter((c) => draftFieldNames.includes(c.name))
                  setNewDraft(buildDraft(nextDraftColumns.length > 0 ? nextDraftColumns : fallbackDraftColumns))
                  setActivePanel(null)
                  setActiveLine(null)
                  setActiveRange(null)
                  setIsCreateOpen(false)
                }}
                disabled={saving || loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editor HTML</CardTitle>
          <CardDescription>Escribe el HTML y revisa el resultado</CardDescription>
          <div className="text-sm text-amber-600">
            Evita modificar las variables entre llaves {"{{ }}"}; si cambian, la comunicación puede dejar de funcionar.
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Título</Label>
                <Input
                  value={selectedId ? editDraft.titulo_comunicacion ?? "" : newDraft.titulo_comunicacion ?? ""}
                  onChange={(e) => {
                    if (selectedId) {
                      setEditDraft({ ...editDraft, titulo_comunicacion: e.target.value })
                    } else {
                      setNewDraft({ ...newDraft, titulo_comunicacion: e.target.value })
                    }
                  }}
                  className="border"
                />
              </div>
              <div className="space-y-1">
                <Label>Subject</Label>
                <Input
                  value={selectedId ? editDraft.subject ?? "" : newDraft.subject ?? ""}
                  onChange={(e) => {
                    if (selectedId) {
                      setEditDraft({ ...editDraft, subject: e.target.value })
                    } else {
                      setNewDraft({ ...newDraft, subject: e.target.value })
                    }
                  }}
                  className="border"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>HTML</Label>
              {activeRange ? (
                <div className="text-xs text-muted-foreground">
                  {activeRange.start === activeRange.end ? `Línea en resultado: ${activeRange.start}` : `Líneas en resultado: ${activeRange.start}–${activeRange.end}`}
                </div>
              ) : null}
              <div className="relative">
                {activeRange ? (
                  <div
                    className={`pointer-events-none absolute left-0 right-0 ${activePanel === "html" ? "bg-primary/20" : "bg-primary/10"}`}
                    style={{
                      top: htmlPaddingTop + (activeRange.start - 1) * htmlLineHeight - htmlScrollTop,
                      height: (activeRange.end - activeRange.start + 1) * htmlLineHeight,
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"
                      style={{ opacity: activePanel === "html" ? 0.9 : 0.5 }}
                    />
                  </div>
                ) : null}
                <Textarea
                  ref={htmlEditorRef}
                  defaultValue={selectedId ? editDraft.texto_html ?? "" : newDraft.texto_html ?? ""}
                  onInput={(e) => {
                    const value = (e.currentTarget as HTMLTextAreaElement).value
                    const start = (e.currentTarget as HTMLTextAreaElement).selectionStart ?? value.length
                    const end = (e.currentTarget as HTMLTextAreaElement).selectionEnd ?? start
                    if (selectedId) {
                      setEditDraft({ ...editDraft, texto_html: value })
                    } else {
                      setNewDraft({ ...newDraft, texto_html: value })
                    }
                    setActivePanel("html")
                    const lineStart = getLineFromPosition(value, start)
                    const lineEnd = getLineFromPosition(value, end)
                    setActiveLine(lineStart)
                    setActiveRange({ start: Math.min(lineStart, lineEnd), end: Math.max(lineStart, lineEnd) })
                    const selectedText = start !== end ? value.slice(start, end) : ""
                    const ratio = value.length > 0 ? start / value.length : null
                    if (selectedText) {
                      syncPreviewByText(selectedText, ratio)
                    } else {
                      scrollOtherPanelToLine("html", lineStart)
                    }
                  }}
                  onClick={(e) => {
                    const value = (e.currentTarget as HTMLTextAreaElement).value
                    const start = (e.currentTarget as HTMLTextAreaElement).selectionStart ?? value.length
                    const end = (e.currentTarget as HTMLTextAreaElement).selectionEnd ?? start
                    setActivePanel("html")
                    const lineStart = getLineFromPosition(value, start)
                    const lineEnd = getLineFromPosition(value, end)
                    setActiveLine(lineStart)
                    setActiveRange({ start: Math.min(lineStart, lineEnd), end: Math.max(lineStart, lineEnd) })
                    const selectedText = start !== end ? value.slice(start, end) : ""
                    const ratio = value.length > 0 ? start / value.length : null
                    if (selectedText) {
                      syncPreviewByText(selectedText, ratio)
                    } else {
                      scrollOtherPanelToLine("html", lineStart)
                    }
                  }}
                  onKeyUp={(e) => {
                    const value = (e.currentTarget as HTMLTextAreaElement).value
                    const start = (e.currentTarget as HTMLTextAreaElement).selectionStart ?? value.length
                    const end = (e.currentTarget as HTMLTextAreaElement).selectionEnd ?? start
                    setActivePanel("html")
                    const lineStart = getLineFromPosition(value, start)
                    const lineEnd = getLineFromPosition(value, end)
                    setActiveLine(lineStart)
                    setActiveRange({ start: Math.min(lineStart, lineEnd), end: Math.max(lineStart, lineEnd) })
                    const selectedText = start !== end ? value.slice(start, end) : ""
                    const ratio = value.length > 0 ? start / value.length : null
                    if (selectedText) {
                      syncPreviewByText(selectedText, ratio)
                    } else {
                      scrollOtherPanelToLine("html", lineStart)
                    }
                  }}
                onSelect={(e) => {
                  const value = (e.currentTarget as HTMLTextAreaElement).value
                  const start = (e.currentTarget as HTMLTextAreaElement).selectionStart ?? value.length
                  const end = (e.currentTarget as HTMLTextAreaElement).selectionEnd ?? start
                  setActivePanel("html")
                  const lineStart = getLineFromPosition(value, start)
                  const lineEnd = getLineFromPosition(value, end)
                  setActiveLine(lineStart)
                  setActiveRange({ start: Math.min(lineStart, lineEnd), end: Math.max(lineStart, lineEnd) })
                  const selectedText = start !== end ? value.slice(start, end) : ""
                  const ratio = value.length > 0 ? start / value.length : null
                  if (selectedText) {
                    syncPreviewByText(selectedText, ratio)
                  } else {
                    scrollOtherPanelToLine("html", lineStart)
                  }
                }}
                  onScroll={(e) => {
                    setHtmlScrollTop((e.currentTarget as HTMLTextAreaElement).scrollTop)
                  }}
                  className="border h-[640px] overflow-auto relative z-10 bg-transparent"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Resultado</Label>
              {activeRange ? (
                <div className="text-xs text-muted-foreground">
                  {activeRange.start === activeRange.end ? `Línea en HTML: ${activeRange.start}` : `Líneas en HTML: ${activeRange.start}–${activeRange.end}`}
                </div>
              ) : null}
              <div className="relative">
                {activeRange ? (
                  <div
                    className={`pointer-events-none absolute left-0 right-0 ${activePanel === "preview" ? "bg-primary/20" : "bg-primary/10"}`}
                    style={{
                      top: previewPaddingTop + (activeRange.start - 1) * previewLineHeight - previewScrollTop,
                      height: (activeRange.end - activeRange.start + 1) * previewLineHeight,
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"
                      style={{ opacity: activePanel === "preview" ? 0.9 : 0.5 }}
                    />
                  </div>
                ) : null}
                <div
                  className="rounded-md border p-3 h-[640px] overflow-auto relative z-10 bg-transparent"
                  ref={wysiwygRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(event) => {
                    const text = (event.currentTarget as HTMLDivElement).textContent || ""
                    const offsets = getSelectionOffsetsInText(event.currentTarget as HTMLDivElement)
                    const startOffset = offsets?.start ?? getCaretOffsetInText(event.currentTarget as HTMLDivElement) ?? text.length
                    const endOffset = offsets?.end ?? startOffset
                    if (selectedId) {
                      setEditDraft({ ...editDraft, texto_html: event.currentTarget.innerHTML })
                    } else {
                      setNewDraft({ ...newDraft, texto_html: event.currentTarget.innerHTML })
                    }
                    setActivePanel("preview")
                    const lineStart = getLineFromPosition(text, startOffset)
                    const lineEnd = getLineFromPosition(text, endOffset)
                    setActiveLine(lineStart)
                    setActiveRange({ start: Math.min(lineStart, lineEnd), end: Math.max(lineStart, lineEnd) })
                    const selectedText = window.getSelection()?.toString() || ""
                    const ratio = text.length > 0 ? startOffset / text.length : null
                    if (selectedText) {
                      syncHtmlByText(selectedText, ratio)
                    } else {
                      scrollOtherPanelToLine("preview", lineStart)
                    }
                  }}
                  onClick={(event) => {
                    const text = (event.currentTarget as HTMLDivElement).textContent || ""
                    const offsets = getSelectionOffsetsInText(event.currentTarget as HTMLDivElement)
                    const startOffset = offsets?.start ?? getCaretOffsetInText(event.currentTarget as HTMLDivElement) ?? text.length
                    const endOffset = offsets?.end ?? startOffset
                    setActivePanel("preview")
                    const lineStart = getLineFromPosition(text, startOffset)
                    const lineEnd = getLineFromPosition(text, endOffset)
                    setActiveLine(lineStart)
                    setActiveRange({ start: Math.min(lineStart, lineEnd), end: Math.max(lineStart, lineEnd) })
                    const selectedText = window.getSelection()?.toString() || ""
                    const ratio = text.length > 0 ? startOffset / text.length : null
                    if (selectedText) {
                      syncHtmlByText(selectedText, ratio)
                    } else {
                      scrollOtherPanelToLine("preview", lineStart)
                    }
                  }}
                  onKeyUp={(event) => {
                    const text = (event.currentTarget as HTMLDivElement).textContent || ""
                    const offsets = getSelectionOffsetsInText(event.currentTarget as HTMLDivElement)
                    const startOffset = offsets?.start ?? getCaretOffsetInText(event.currentTarget as HTMLDivElement) ?? text.length
                    const endOffset = offsets?.end ?? startOffset
                    setActivePanel("preview")
                    const lineStart = getLineFromPosition(text, startOffset)
                    const lineEnd = getLineFromPosition(text, endOffset)
                    setActiveLine(lineStart)
                    setActiveRange({ start: Math.min(lineStart, lineEnd), end: Math.max(lineStart, lineEnd) })
                    const selectedText = window.getSelection()?.toString() || ""
                    const ratio = text.length > 0 ? startOffset / text.length : null
                    if (selectedText) {
                      syncHtmlByText(selectedText, ratio)
                    } else {
                      scrollOtherPanelToLine("preview", lineStart)
                    }
                  }}
                onMouseUp={(event) => {
                  const text = (event.currentTarget as HTMLDivElement).textContent || ""
                  const offsets = getSelectionOffsetsInText(event.currentTarget as HTMLDivElement)
                  const startOffset = offsets?.start ?? getCaretOffsetInText(event.currentTarget as HTMLDivElement) ?? text.length
                  const endOffset = offsets?.end ?? startOffset
                  setActivePanel("preview")
                  const lineStart = getLineFromPosition(text, startOffset)
                  const lineEnd = getLineFromPosition(text, endOffset)
                  setActiveLine(lineStart)
                  setActiveRange({ start: Math.min(lineStart, lineEnd), end: Math.max(lineStart, lineEnd) })
                  const selectedText = window.getSelection()?.toString() || ""
                  const ratio = text.length > 0 ? startOffset / text.length : null
                  if (selectedText) {
                    syncHtmlByText(selectedText, ratio)
                  } else {
                    scrollOtherPanelToLine("preview", lineStart)
                  }
                }}
                  onScroll={(event) => {
                    setPreviewScrollTop((event.currentTarget as HTMLDivElement).scrollTop)
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedId ? (
              <Button onClick={handleUpdate} disabled={saving || !selectedId}>
                <Save className="h-4 w-4 mr-2" />
                Guardar cambios
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={saving || (!newDraft.titulo_comunicacion && !newDraft.subject)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear
              </Button>
            )}
          </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar comunicación</DialogTitle>
            <DialogDescription>{selectedId ? `ID seleccionado: ${selectedId}` : "Selecciona una comunicación"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(modalFieldColumns.length > 0 ? modalFieldColumns : fallbackModalColumns).map((col) => (
              <div key={`edit-${col.name}`} className="space-y-1">
                <Label>{col.name}</Label>
                {renderField(col, editDraft, setEditDraft)}
              </div>
            ))}
            <div className="space-y-1">
              <Label>HTML</Label>
              <Textarea
                value={editDraft.texto_html ?? ""}
                onChange={(e) => setEditDraft({ ...editDraft, texto_html: e.target.value })}
                className="border min-h-[220px]"
              />
            </div>
            <div className="space-y-1">
              <Label>Preview</Label>
              <div
                className="rounded-md border p-3"
                ref={editPreviewRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(event) => setEditDraft({ ...editDraft, texto_html: event.currentTarget.innerHTML })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={saving || !selectedId}>
              <Save className="h-4 w-4 mr-2" />
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear comunicación</DialogTitle>
            <DialogDescription>Completa los campos y guarda</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(modalFieldColumns.length > 0 ? modalFieldColumns : fallbackModalColumns).map((col) => (
              <div key={`new-${col.name}`} className="space-y-1">
                <Label>{col.name}</Label>
                {renderField(col, newDraft, setNewDraft)}
              </div>
            ))}
            <div className="space-y-1">
              <Label>HTML</Label>
              <Textarea
                value={newDraft.texto_html ?? ""}
                onChange={(e) => setNewDraft({ ...newDraft, texto_html: e.target.value })}
                className="border min-h-[220px]"
              />
            </div>
            <div className="space-y-1">
              <Label>Preview</Label>
              <div
                className="rounded-md border p-3"
                ref={createPreviewRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(event) => setNewDraft({ ...newDraft, texto_html: event.currentTarget.innerHTML })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={saving || (modalFieldColumns.length === 0 && fallbackModalColumns.length === 0)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
