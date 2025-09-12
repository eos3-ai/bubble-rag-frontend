"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KnowledgeBase } from "@/types"

interface EditKnowledgeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeBase: KnowledgeBase | null
  onUpdate: (kbId: string, name: string, description: string, rerankModelId: string, embeddingModelId: string) => void
}

export function EditKnowledgeDialog({
  open,
  onOpenChange,
  knowledgeBase,
  onUpdate,
}: EditKnowledgeDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [rerankModelId, setRerankModelId] = useState("")
  const [embeddingModelId, setEmbeddingModelId] = useState("")
  const [loading, setLoading] = useState(false)
  const [rerankModels, setRerankModels] = useState<any[]>([])
  const [embeddingModels, setEmbeddingModels] = useState<any[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  // 当弹窗打开或知识库数据变化时，初始化表单
  useEffect(() => {
    if (knowledgeBase && open) {
      setName(knowledgeBase.kb_name || "")
      setDescription(knowledgeBase.kb_desc || "")
      setRerankModelId(knowledgeBase.rerank_model_id || "")
      setEmbeddingModelId(knowledgeBase.embedding_model_id || "")
    }
  }, [knowledgeBase, open])

  // 获取模型列表
  const loadModels = async () => {
    try {
      setModelsLoading(true)
      
      // 分别获取embedding和rerank模型
      const [embeddingResponse, rerankResponse] = await Promise.all([
        fetch('/api/proxy/api/v1/models/list_all_models', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model_type: "embedding" })
        }),
        fetch('/api/proxy/api/v1/models/list_all_models', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model_type: "reranker" })
        })
      ])

      if (!embeddingResponse.ok || !rerankResponse.ok) {
        throw new Error('Failed to fetch models')
      }

      const [embeddingResult, rerankResult] = await Promise.all([
        embeddingResponse.json(),
        rerankResponse.json()
      ])

      // 处理embedding模型
      if (embeddingResult.code === 200 && embeddingResult.data) {
        setEmbeddingModels(embeddingResult.data)
      }

      // 处理rerank模型
      if (rerankResult.code === 200 && rerankResult.data) {
        setRerankModels(rerankResult.data)
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    } finally {
      setModelsLoading(false)
    }
  }

  // 组件挂载时加载模型列表
  useEffect(() => {
    if (open) {
      loadModels()
    }
  }, [open])

  const handleUpdate = async () => {
    if (!name.trim() || !rerankModelId.trim() || !embeddingModelId.trim() || !knowledgeBase?.id) return
    
    setLoading(true)
    try {
      await onUpdate(
        knowledgeBase.id, 
        name.trim(), 
        description.trim(), 
        rerankModelId.trim(), 
        embeddingModelId.trim()
      )
    } catch (error) {
      console.error("更新失败:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    // 重置表单
    if (knowledgeBase) {
      setName(knowledgeBase.kb_name || "")
      setDescription(knowledgeBase.kb_desc || "")
      setRerankModelId(knowledgeBase.rerank_model_id || "")
      setEmbeddingModelId(knowledgeBase.embedding_model_id || "")
    }
  }

  const isValid = name.trim() && rerankModelId.trim() && embeddingModelId.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-md border-white/20 shadow-2xl">
        <DialogHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            编辑知识库
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            修改知识库配置信息，优化您的智能问答体验
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              知识库名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="为您的知识库起个名字..."
              className="h-12 bg-white/80 border border-gray-200/60 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-200/50 focus:shadow-md transition-all duration-300 outline-none rounded-lg"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="description" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              描述信息
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述一下这个知识库的用途和内容..."
              rows={4}
              className="bg-white/80 border border-gray-200/60 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-200/50 focus:shadow-md transition-all duration-300 resize-none outline-none rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="rerankModelId" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Reranker 模型 <span className="text-red-500">*</span>
              </Label>
              <Select value={rerankModelId} onValueChange={setRerankModelId} disabled={modelsLoading}>
                <SelectTrigger className="h-11 bg-white/80 border border-gray-200/60 focus:border-green-500 focus:bg-white focus:ring-1 focus:ring-green-200/50 focus:shadow-md transition-all duration-300 outline-none rounded-lg">
                  <SelectValue placeholder={modelsLoading ? "加载模型中..." : "选择 Reranker 模型"} />
                </SelectTrigger>
                <SelectContent>
                  {rerankModels.map((model) => (
                    <SelectItem key={model.model_id || model.id} value={model.model_id || model.id}>
                      {model.config_name || model.name || model.model_id || model.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="embeddingModelId" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Embedding 模型 <span className="text-red-500">*</span>
              </Label>
              <Select value={embeddingModelId} onValueChange={setEmbeddingModelId} disabled={modelsLoading}>
                <SelectTrigger className="h-11 bg-white/80 border border-gray-200/60 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-200/50 focus:shadow-md transition-all duration-300 outline-none rounded-lg">
                  <SelectValue placeholder={modelsLoading ? "加载模型中..." : "选择 Embedding 模型"} />
                </SelectTrigger>
                <SelectContent>
                  {embeddingModels.map((model) => (
                    <SelectItem key={model.model_id || model.id} value={model.model_id || model.id}>
                      {model.config_name || model.name || model.model_id || model.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 h-12 border-gray-200 hover:bg-gray-50 transition-all duration-200"
          >
            取消
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={!isValid || loading}
            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 text-white"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                更新中...
              </div>
            ) : (
              "更新知识库"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}