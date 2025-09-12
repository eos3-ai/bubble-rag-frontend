"use client"

import { Button } from "@/components/ui/button"
import { KnowledgeBase } from "@/types"

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeBase: KnowledgeBase
  onConfirm: (id: string) => void
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  knowledgeBase,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const handleDelete = () => {
    onConfirm(knowledgeBase.id || knowledgeBase.kb_name || '')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => {
      if (e.target === e.currentTarget) onOpenChange(false)
    }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">确认删除</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            ✕
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            确定要删除知识库 <strong>"{knowledgeBase.kb_name}"</strong> 吗？
          </p>
          <p className="text-sm text-gray-500">
            此操作不可撤销，请谨慎操作。
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            onClick={handleDelete}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            确认删除
          </Button>
        </div>
      </div>
    </div>
  )
}