"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Document } from "@/types"

interface EditDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc: Document | null
  onSave: (docId: string, newContent: string) => void
}

export function EditDocumentDialog({
  open,
  onOpenChange,
  doc,
  onSave,
}: EditDocumentDialogProps) {
  const [content, setContent] = useState("")

  if (!doc) return null

  const handleSave = () => {
    onSave(doc.id, content)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>编辑文档: {doc.originalName}</DialogTitle>
          <DialogDescription>
            在此处修改文档内容。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">文档内容</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入新的文档内容..."
              rows={15}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}