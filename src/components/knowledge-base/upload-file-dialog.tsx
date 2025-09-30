"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, FileText, X, Plus } from "lucide-react"

interface UploadFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (files: File[], chunkSize: number, options?: { data_clean?: string, semantic_split?: string, small2big?: string }) => Promise<void>
}

export function UploadFileDialog({ open, onOpenChange, onUpload }: UploadFileDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [chunkSize, setChunkSize] = useState(1000)
  const [uploading, setUploading] = useState(false)

  // 新增的三个开关字段
  const [dataClean, setDataClean] = useState(false)
  const [semanticSplit, setSemanticSplit] = useState(false)
  const [small2big, setSmall2big] = useState(false)

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
  }

  // 移除选中的文件
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // 处理上传
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    try {
      setUploading(true)
      // 传递开关参数
      await onUpload(selectedFiles, chunkSize, {
        data_clean: dataClean ? '1' : '0',
        semantic_split: semanticSplit ? '1' : '0',
        small2big: small2big ? '1' : '0'
      })

      // 重置状态
      setSelectedFiles([])
      setChunkSize(1000)
      setDataClean(false)
      setSemanticSplit(false)
      setSmall2big(false)
      onOpenChange(false)
    } finally {
      setUploading(false)
    }
  }

  // 关闭对话框时重置状态
  const handleClose = () => {
    setSelectedFiles([])
    setChunkSize(1000)
    setDataClean(false)
    setSemanticSplit(false)
    setSmall2big(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl flex flex-col">
        <DialogHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              上传文件
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-600 dark:text-slate-400 text-base">
            选择要上传的文件，支持PDF、TXT、MD、DOC、DOCX、JSON、CSV等格式
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-4">
          {/* 文件选择区域 */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              选择文件
            </Label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                accept=".pdf,.txt,.md,.doc,.docx,.json,.csv"
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 dark:text-slate-400 mb-1">
                  点击选择文件或拖拽文件到此处
                </p>
                <p className="text-xs text-slate-500">
                  支持 PDF、TXT、MD、DOC、DOCX、JSON、CSV 格式
                </p>
              </label>
            </div>

            {/* 已选择文件列表 */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  已选择文件 ({selectedFiles.length})
                </Label>
                <div className="space-y-2 max-h-24 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chunk Size 设置 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  分块大小 (Chunk Size)
                </Label>
                <span className="text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">
                  {chunkSize}
                </span>
              </div>
              <Slider
                value={[chunkSize]}
                onValueChange={(value) => setChunkSize(value[0])}
                min={200}
                max={2000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>200</span>
                <span>1000 (推荐)</span>
                <span>2000</span>
              </div>
              <p className="text-xs text-slate-500">
                分块大小影响文档检索精度，较小的值提供更精确的匹配，较大的值提供更多上下文
              </p>
            </div>

            {/* 数据处理选项 */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                数据处理选项
              </Label>

              {/* 数据清洗 */}
              <div className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 ${
                dataClean
                  ? 'bg-purple-50 border-purple-200 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${dataClean ? 'bg-purple-500' : 'bg-slate-300'}`}></div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      数据清洗
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      dataClean
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {dataClean ? '开启' : '关闭'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    开启后会自动清理文档中的无关信息和格式
                  </div>
                </div>
                <Switch
                  checked={dataClean}
                  onCheckedChange={setDataClean}
                  className="ml-4 data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-slate-300 scale-110"
                />
              </div>

              {/* 语义分块 */}
              <div className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 ${
                semanticSplit
                  ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${semanticSplit ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      语义分块
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      semanticSplit
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {semanticSplit ? '开启' : '关闭'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    使用语义理解进行智能分块，提高检索准确性
                  </div>
                </div>
                <Switch
                  checked={semanticSplit}
                  onCheckedChange={setSemanticSplit}
                  className="ml-4 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-300 scale-110"
                />
              </div>

              {/* Small2Big */}
              <div className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 ${
                small2big
                  ? 'bg-amber-50 border-amber-200 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${small2big ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Small2Big 优化
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      small2big
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {small2big ? '开启' : '关闭'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    启用小块到大块的检索优化策略
                  </div>
                </div>
                <Switch
                  checked={small2big}
                  onCheckedChange={setSmall2big}
                  className="ml-4 data-[state=checked]:bg-amber-600 data-[state=unchecked]:bg-slate-300 scale-110"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 pt-4 flex-shrink-0 border-t border-slate-200">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={uploading}
            className="h-11 px-6 rounded-xl bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600"
          >
            取消
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="h-11 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl border-0 disabled:opacity-50 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? '上传中...' : '上传文件'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}