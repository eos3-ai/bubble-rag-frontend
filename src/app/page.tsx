"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { KnowledgeBase, PaginatedResponse } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Settings, Trash2, MessageCircle, Calendar, FileText, Copy, Check, FolderOpen, Brain } from "lucide-react"
import { UploadKnowledgeDialog } from "@/components/knowledge-base/upload-knowledge-dialog"
import { EditKnowledgeDialog } from "@/components/knowledge-base/edit-knowledge-dialog"
import { DeleteConfirmDialog } from "@/components/knowledge-base/delete-confirm-dialog"
import { knowledgeBaseAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  const router = useRouter()
  const { toast } = useToast()
  const [paginatedData, setPaginatedData] = useState<PaginatedResponse<KnowledgeBase> | null>(null)
  const [loading, setLoading] = useState(true)
  // 搜索功能已移除
  // const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null)
  const [copiedIds, setCopiedIds] = useState<Record<string, boolean>>({})

  // 加载知识库列表（移除搜索功能）
  const loadKnowledgeBases = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      const response = await knowledgeBaseAPI.getAll({
        kb_name: "", // 查询所有知识库
        page_num: page,
        page_size: pageSize,
      })
      if (response.code === 200) {
        setPaginatedData(response.data)
      } else {
        toast({
          variant: "destructive",
          title: "错误",
          description: response.msg || "加载知识库失败",
        })
      }
    } catch (error) {
      console.error("加载知识库失败:", error)
      toast({
        variant: "destructive",
        title: "错误",
        description: "加载知识库失败，请检查网络连接",
      })
    } finally {
      setLoading(false)
    }
  }, [pageSize, toast])

  // 初始化和页码变化时加载数据
  useEffect(() => {
    loadKnowledgeBases(currentPage)
  }, [currentPage, loadKnowledgeBases])

  const handleCreate = async (name: string, description: string, rerankModelId: string, embeddingModelId: string) => {
    try {
      const createResponse = await knowledgeBaseAPI.create({ 
        name, 
        description,
        rerankModelId,
        embeddingModelId,
      })
      if (createResponse.code === 200) {
        toast({
          variant: "success",
          title: "成功",
          description: `知识库 "${name}" 创建成功`,
        })
        await loadKnowledgeBases(currentPage)
        setUploadOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "错误",
          description: createResponse.msg || "创建知识库失败",
        })
      }
    } catch (error) {
      console.error("创建知识库失败:", error)
      toast({
        variant: "destructive",
        title: "错误",
        description: "创建知识库失败",
      })
    }
  }

  // 处理编辑知识库
  const handleEdit = (id: string) => {
    const kb = paginatedData?.items?.find(item => (item.id || item.kb_name) === id)
    if (kb) {
      setSelectedKB(kb)
      setEditOpen(true)
    }
  }

  // 处理更新知识库
  const handleUpdate = async (kbId: string, name: string, description: string, rerankModelId: string, embeddingModelId: string) => {
    try {
      const response = await fetch('/api/proxy/api/v1/knowledge_base/update_knowledge_base', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kb_id: kbId,
          kb_name: name,
          rerank_model_id: rerankModelId,
          embedding_model_id: embeddingModelId,
          kb_desc: description
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          toast({
            variant: "success",
            title: "成功",
            description: `知识库 "${name}" 更新成功`,
          })
          await loadKnowledgeBases(currentPage)
          setEditOpen(false)
          setSelectedKB(null)
        } else {
          toast({
            variant: "destructive",
            title: "错误",
            description: data.msg || "更新知识库失败",
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "错误",
          description: "更新知识库失败",
        })
      }
    } catch (error) {
      console.error("更新知识库失败:", error)
      toast({
        variant: "destructive",
        title: "错误",
        description: "更新知识库失败",
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const deleteResponse = await knowledgeBaseAPI.delete(id)
      if (deleteResponse.code === 200) {
        toast({
          variant: "success",
          title: "成功",
          description: "知识库删除成功",
        })
        await loadKnowledgeBases(currentPage)
        setDeleteOpen(false)
      } else {
        toast({
          variant: "destructive",
          title: "错误",
          description: deleteResponse.msg || "删除知识库失败",
        })
      }
    } catch (error) {
      console.error("删除知识库失败:", error)
      toast({
        variant: "destructive",
        title: "错误",
        description: "删除知识库失败",
      })
    }
  }

  // 编辑功能已移除
  // const openEditDialog = (kb: KnowledgeBase) => {
  //   setSelectedKB(kb)
  //   setEditOpen(true)
  // }

  const openDeleteDialog = (kb: KnowledgeBase) => {
    setSelectedKB(kb)
    setDeleteOpen(true)
  }

  const openChat = (id: string) => {
    router.push(`/chat/${id}`)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const copyKnowledgeBaseId = async (kb: KnowledgeBase) => {
    const kbId = kb.id
    if (!kbId) return

    try {
      // 检查是否支持现代的 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(kbId)
      } else {
        // 降级方案：使用传统的方式复制文本
        const textArea = document.createElement("textarea")
        textArea.value = kbId
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
      }

      const key = kb.id || kb.kb_name
      setCopiedIds(prev => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopiedIds(prev => ({ ...prev, [key]: false }))
      }, 2000)
      
      toast({
        variant: "success",
        title: "复制成功",
        description: "知识库ID已复制到剪切板",
      })
    } catch (error) {
      console.error("复制失败:", error)
      toast({
        variant: "destructive",
        title: "复制失败",
        description: "无法复制到剪切板，请手动复制",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-100 flex flex-col">
      <header className="bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm shrink-0">
        <div className="container mx-auto px-6 py-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  BubbleRAG
                </h1>
                <p className="text-sm text-gray-500">知识管理 + 模型训练一体化平台</p>
              </div>
            </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setUploadOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              创建知识库
            </Button>
          </div>
          </div>
          
          {/* 导航标签页 */}
          <div className="flex items-center gap-1 bg-slate-100/80 backdrop-blur-sm p-1 rounded-lg w-fit">
            <Button
              variant="default"
              size="sm"
              className="h-9 px-4 rounded-md text-sm font-medium bg-white shadow-sm text-slate-800"
            >
              <FileText className="h-4 w-4 mr-2" />
              知识库管理
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/models')}
              className="h-9 px-4 rounded-md text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-white/50"
            >
              <Brain className="h-4 w-4 mr-2" />
              模型训练
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto px-6 py-6 h-full flex flex-col">
        {/* 统计信息 - 固定区域 */}
        <div className="mb-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">知识库概览</h2>
            <p className="text-gray-600">管理您的知识库，开启智能对话</p>
          </div>
          {paginatedData && (
            <div className="flex items-center gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm border border-white/20">
                <span className="text-sm font-medium text-gray-700">
                  共 {paginatedData.total} 个知识库
                </span>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm border border-white/20">
                <span className="text-sm font-medium text-gray-700">
                  第 {paginatedData.page} / {paginatedData.total_pages} 页
                </span>
              </div>
              {/* 右上角分页控件 */}
              {paginatedData.total_pages > 1 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2 shadow-sm border border-white/20">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="h-8 w-8 p-0 text-purple-600 border-purple-200 hover:bg-purple-50 disabled:opacity-50"
                      title="上一页"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>
                    
                    {(() => {
                      const totalPages = paginatedData.total_pages
                      const maxVisible = 3 // 在右上角显示最多3个页码
                      return totalPages <= maxVisible ? (
                        Array.from({ length: totalPages }, (_, i) => (
                          <Button
                            key={i + 1}
                            variant={currentPage === i + 1 ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(i + 1)}
                            className={`h-8 w-8 p-0 transition-all duration-200 ${
                              currentPage === i + 1 
                                ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700' 
                                : 'bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600'
                            }`}
                          >
                            <span className="text-xs font-medium">{i + 1}</span>
                          </Button>
                        ))
                      ) : (
                        <>
                          {currentPage > 2 && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(1)}
                                className="h-8 w-8 p-0 bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600"
                              >
                                <span className="text-xs font-medium">1</span>
                              </Button>
                              {currentPage > 3 && <span className="px-1 text-gray-400 text-xs">•••</span>}
                            </>
                          )}

                          {Array.from({ length: Math.min(maxVisible, totalPages) }, (_, i) => {
                            const page = Math.max(1, Math.min(totalPages - maxVisible + 1, currentPage - 1)) + i;
                            if (page > totalPages) return null;
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(page)}
                                className={`h-8 w-8 p-0 transition-all duration-200 ${
                                  currentPage === page 
                                    ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700' 
                                    : 'bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600'
                                }`}
                              >
                                <span className="text-xs font-medium">{page}</span>
                              </Button>
                            );
                          })}

                          {currentPage < totalPages - 1 && (
                            <>
                              {currentPage < totalPages - 2 && <span className="px-1 text-gray-400 text-xs">•••</span>}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(totalPages)}
                                className="h-8 w-8 p-0 bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600"
                              >
                                <span className="text-xs font-medium">{totalPages}</span>
                              </Button>
                            </>
                          )}
                        </>
                      )
                    })()}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(paginatedData.total_pages, currentPage + 1))}
                      disabled={currentPage >= paginatedData.total_pages}
                      className="h-8 w-8 p-0 text-purple-600 border-purple-200 hover:bg-purple-50 disabled:opacity-50"
                      title="下一页"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="w-16 h-16 relative">
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-gray-200"></div>
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">加载中...</p>
          </div>
        ) : !paginatedData || paginatedData.items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <FileText className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">还没有知识库</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              创建您的第一个知识库，开始构建智能问答系统
            </p>
            <Button 
              onClick={() => setUploadOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              创建知识库
            </Button>
          </div>
        ) : (
          <>
            {/* 知识库网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedData.items.map((kb) => (
                <div 
                  key={kb.id || kb.kb_name}
                  className="group knowledge-card bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/20 hover:shadow-xl hover:shadow-purple-100/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                  onClick={() => router.push(`/documents/${kb.id || kb.kb_name}`)}
                >
                  <div className="knowledge-card-content">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors duration-200 h-6 leading-6 overflow-hidden text-ellipsis whitespace-nowrap" title={kb.kb_name}>
                            {kb.kb_name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 h-10 leading-5 text-ellipsis-multiline line-clamp-2" title={kb.kb_desc || "暂无描述"}>
                            {kb.kb_desc || "暂无描述"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/documents/${kb.id || kb.kb_name}`);
                          }}
                          className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                          title="进入管理"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openChat(kb.id || kb.kb_name || kb.kb_name);
                          }}
                          className="h-8 w-8 p-0 hover:bg-purple-100 hover:text-purple-600"
                          title="开始聊天"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(kb.id || kb.kb_name);
                          }}
                          className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                          title="编辑知识库"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(kb);
                          }}
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-gray-50/80 rounded-lg p-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>ID</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyKnowledgeBaseId(kb);
                          }}
                          className="h-6 w-6 p-0 hover:bg-gray-200/50"
                          title="复制ID"
                        >
                          {copiedIds[kb.id || kb.kb_name] ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <code className="text-xs font-mono text-gray-800 overflow-hidden text-ellipsis whitespace-nowrap block" title={kb.id}>
                        {kb.id}
                      </code>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>创建时间</span>
                      </div>
                      <span>{formatDate(kb.create_time || new Date().toISOString())}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>更新时间</span>
                      </div>
                      <span>{formatDate(kb.update_time || new Date().toISOString())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </>
        )}
        </div>
        </div>
      </main>

      {/* 新建知识库对话框 */}
      <UploadKnowledgeDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onCreate={handleCreate}
      />

      {/* 编辑知识库对话框 */}
      <EditKnowledgeDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        knowledgeBase={selectedKB}
        onUpdate={handleUpdate}
      />

      {/* 删除确认对话框 */}
      {selectedKB && (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          knowledgeBase={selectedKB}
          onConfirm={handleDelete}
        />
      )}
      <Toaster />
    </div>
  )
}