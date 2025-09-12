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

interface UploadKnowledgeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, description: string, rerankModelId: string, embeddingModelId: string) => void
}

export function UploadKnowledgeDialog({
  open,
  onOpenChange,
  onCreate,
}: UploadKnowledgeDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [rerankModelId, setRerankModelId] = useState("")
  const [embeddingModelId, setEmbeddingModelId] = useState("")
  const [loading, setLoading] = useState(false)
  const [rerankModels, setRerankModels] = useState<any[]>([])
  const [embeddingModels, setEmbeddingModels] = useState<any[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

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
        
        // 默认选择第一个embedding模型
        if (embeddingResult.data.length > 0) {
          setEmbeddingModelId(embeddingResult.data[0].model_id || embeddingResult.data[0].id)
        }
      }

      // 处理rerank模型
      if (rerankResult.code === 200 && rerankResult.data) {
        setRerankModels(rerankResult.data)
        
        // 默认选择第一个rerank模型
        if (rerankResult.data.length > 0) {
          setRerankModelId(rerankResult.data[0].model_id || rerankResult.data[0].id)
        }
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

  const handleCreate = async () => {
    if (!name.trim() || !rerankModelId.trim() || !embeddingModelId.trim()) return
    
    setLoading(true)
    try {
      await onCreate(name.trim(), description.trim(), rerankModelId.trim(), embeddingModelId.trim())
      setName("")
      setDescription("")
      setRerankModelId("")
      setEmbeddingModelId("")
    } catch (error) {
      console.error("创建失败:", error)
    } finally {
      setLoading(false)
    }
  }

  const isValid = name.trim() && rerankModelId.trim() && embeddingModelId.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-md border-white/20 shadow-2xl">
        <DialogHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            创建知识库
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            构建您的专属智能问答系统，让知识触手可及
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              知识库名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="为您的知识库起个名字..."
              className="h-12 bg-white/80 border border-gray-200/60 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-200/50 focus:shadow-md transition-all duration-300 outline-none rounded-lg"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="description" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              描述信息
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述一下这个知识库的用途和内容..."
              rows={4}
              className="bg-white/80 border border-gray-200/60 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-200/50 focus:shadow-md transition-all duration-300 resize-none outline-none rounded-lg"
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
            onClick={() => {
              onOpenChange(false)
              setName("")
              setDescription("")
              setRerankModelId("")
              setEmbeddingModelId("")
            }}
            disabled={loading}
            className="flex-1 h-12 border-gray-200 hover:bg-gray-50 transition-all duration-200"
          >
            取消
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isValid || loading}
            className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 text-white"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                创建中...
              </div>
            ) : (
              "创建知识库"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}