"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Document, KnowledgeBase, PaginatedResponse, DocumentSearchResult } from "@/types"

interface DocumentTask {
  id: string
  total_file: number
  success_file: number
  curr_filename: string
  create_time: string
  remaining_file: number
  file_id: string
  doc_knowledge_base_id: string
  curr_file_progress: number
  chunk_size: number
  update_time: string
}
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ArrowLeft, Search, Edit, Trash2, Calendar, FileText, Plus, BookOpen, Activity, Layers, Eye, MessageCircle, Upload, Type, X, Clock, RefreshCw } from "lucide-react"
import { knowledgeBaseAPI } from "@/lib/api"
import { documentService } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { UploadFileDialog } from "@/components/knowledge-base/upload-file-dialog"

export default function DocumentsPage() {
  const router = useRouter()
  const params = useParams()
  const kbId = params.id as string
  const { toast } = useToast()
  
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null)
  const [paginatedData, setPaginatedData] = useState<PaginatedResponse<Document> | null>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [documentContent, setDocumentContent] = useState("")
  const [documentTitle, setDocumentTitle] = useState("")
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set())
  
  // 文件上传相关状态 - 保留addMethod用于兼容性
  const [addMethod, setAddMethod] = useState<'text' | 'file'>('text')
  
  // 视图模式状态
  const [viewMode, setViewMode] = useState<'text' | 'file'>('file') // 当前查看模式：文件上传或文本文档
  
  // 文档上传任务状态
  const [documentTasks, setDocumentTasks] = useState<DocumentTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  
  // 防重复调用的ref
  const loadingRef = useRef(false)

  // 加载文档上传任务列表
  const loadDocumentTasks = useCallback(async () => {
    try {
      setTasksLoading(true)
      const response = await fetch('/api/proxy/api/v1/documents/list_doc_tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doc_knowledge_base_id: kbId,
          page_num: currentPage,
          page_size: pageSize
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200 && data.data && data.data.items) {
          // 使用新的数据结构：data.items
          setDocumentTasks(Array.isArray(data.data.items) ? data.data.items : [])
        } else {
          setDocumentTasks([])
        }
      }
    } catch (error) {
      console.error("加载文档任务失败:", error)
    } finally {
      setTasksLoading(false)
    }
  }, [kbId, currentPage, pageSize])

  // 启动轮询
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    
    pollingRef.current = setInterval(() => {
      loadDocumentTasks()
    }, 5000) // 5秒轮询
  }, [loadDocumentTasks])

  // 停止轮询
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }


  // 切换文档内容展开/折叠
  const toggleDocumentExpand = (docId: string) => {
    setExpandedDocs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(docId)) {
        newSet.delete(docId)
      } else {
        newSet.add(docId)
      }
      return newSet
    })
  }

  // 处理文件上传（新的独立方法）
  const handleFileUpload = async (files: File[], chunkSize: number, options?: { data_clean?: string, semantic_split?: string, small2big?: string }) => {
    try {
      // 上传文件
      await documentService.uploadFile({
        files: files,
        doc_knowledge_base_id: kbId,
        chunk_size: chunkSize,
        ...options // 传递新的选项参数
      })
      
      toast({
        title: "上传成功",
        description: "文件上传成功，正在后台处理...",
      })
      
      // 立即加载任务状态并启动轮询
      await loadDocumentTasks()
      startPolling()
      
      // 文件上传可能需要后台处理时间，使用智能刷新
      // 但减少轮询频率，避免过度调用
      setTimeout(() => {
        loadDocuments(currentPage, 'file')
      }, 2000) // 2秒后刷新一次
      
    } catch (error) {
      console.error("文件上传失败:", error)
      toast({
        variant: "destructive",
        title: "错误",
        description: "文件上传失败，请稍后重试",
      })
      throw error // 重新抛出错误让对话框处理
    }
  }

  // 加载知识库信息
  const loadKnowledgeBase = async () => {
    try {
      const response = await knowledgeBaseAPI.getAll({
        kb_name: "",
        page_num: 1,
        page_size: 100
      })
      if (response.code === 200) {
        const kb = response.data.items.find(item => item.id === kbId)
        if (kb) {
          setKnowledgeBase(kb)
        }
      }
    } catch (error) {
      console.error("加载知识库信息失败:", error)
    }
  }

  // 加载文档列表
  const loadDocuments = useCallback(async (page: number = 1, mode: 'text' | 'file' = viewMode) => {
    // 防重复调用
    if (loadingRef.current) {
      console.log('Skipping duplicate loadDocuments call')
      return
    }
    
    try {
      loadingRef.current = true
      setLoading(true)
      let paginatedResponse;
      
      if (mode === 'text') {
        // 文本文档模式：使用语义检索接口
        paginatedResponse = await documentService.list({
          kb_name: kbId, // 这里实际上是知识库ID
          page: page,
          page_size: pageSize
        })
      } else {
        // 文件上传模式：使用任务列表接口
        paginatedResponse = await documentService.listDocTasks({
          kb_name: kbId, // 这里实际上是知识库ID
          page: page,
          page_size: pageSize
        })
      }
      
      setPaginatedData(paginatedResponse)
    } catch (error) {
      console.error("加载文档列表失败:", error)
      toast({
        variant: "destructive",
        title: "错误",
        description: "加载文档列表失败，请检查网络连接",
      })
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [kbId, toast, viewMode])

  // 初始加载，只在kbId变化时触发
  useEffect(() => {
    if (kbId) {
      loadKnowledgeBase()
      loadDocuments(1, viewMode)
      // 如果初始是文件模式，加载文档任务并启动轮询
      if (viewMode === 'file') {
        loadDocumentTasks()
        startPolling()
      }
    }
  }, [kbId])

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  // 当视图模式改变时重新加载文档（避免初始重复调用）
  useEffect(() => {
    // 只有在已经加载过数据且viewMode确实改变时才重新加载
    if (kbId && paginatedData) {
      setCurrentPage(1) // 重置到第一页
      loadDocuments(1, viewMode)
      
      // 如果切换到文件模式，启动轮询
      if (viewMode === 'file') {
        loadDocumentTasks()
        startPolling()
      } else {
        // 如果切换到文本模式，停止轮询
        stopPolling()
      }
    }
  }, [viewMode])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadDocuments(page)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  // 搜索文档
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }

    try {
      setSearching(true)
      // 使用新的语义搜索API
      const results = await documentService.semanticQuery({
        doc_content: query,
        doc_knowledge_base_id: kbId
      })
      
      // 确保结果是数组格式
      if (Array.isArray(results)) {
        setSearchResults(results)
      } else {
        console.warn("搜索结果不是数组格式:", results)
        setSearchResults([])
      }
    } catch (error) {
      console.error("搜索文档失败:", error)
      setSearchResults([]) // 出错时设置为空数组而不是null
      toast({
        variant: "destructive",
        title: "搜索失败",
        description: "搜索文档失败，请稍后重试",
      })
    } finally {
      setSearching(false)
    }
  }

  // 智能延迟刷新 - 检查文档是否已处理完成
  const smartRefreshDocuments = async (page: number, expectedTotal: number, mode: 'text' | 'file' = addMethod) => {
    const checkInterval = 1500 // 1.5秒检查间隔
    const maxCheckTime = 10000 // 最大等待10秒
    let elapsedTime = 0
    
    const checkDocuments = async (): Promise<boolean> => {
      try {
        let response;
        if (mode === 'text') {
          response = await documentService.list({
            kb_name: kbId,
            page: page,
            page_size: pageSize
          })
        } else {
          response = await documentService.listDocTasks({
            kb_name: kbId,
            page: page,
            page_size: pageSize
          })
        }
        
        // 检查文档总数是否达到预期值（支持增加和减少）
        if (response.total === expectedTotal) {
          setPaginatedData(response)
          toast({
            title: "处理完成",
            description: response.total > (paginatedData?.total || 0) 
              ? (mode === 'text' ? "新文档已成功添加并处理完成" : "文件上传任务已完成")
              : "文档删除完成，列表已更新",
          })
          return true
        }
        return false
      } catch (error) {
        console.error("检查文档状态失败:", error)
        return false
      }
    }
    
    // 首次延迟检查
    setTimeout(async () => {
      const completed = await checkDocuments()
      if (!completed && elapsedTime < maxCheckTime) {
        // 如果还没完成且未超时，再等待一次
        elapsedTime += checkInterval
        setTimeout(async () => {
          await checkDocuments()
        }, checkInterval)
      }
    }, checkInterval)
  }

  // 添加文档（现在只用于文本添加）
  const handleAddDocument = async () => {
    // 验证文档标题
    if (!documentTitle.trim()) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请输入文档标题",
      })
      return
    }

    // 验证文档内容
    if (!documentContent.trim()) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请输入文档内容",
      })
      return
    }

    try {
      // 文本添加
      await documentService.add({
        doc_title: documentTitle.trim(),
        doc_content: documentContent.trim(),
        doc_knowledge_base_id: kbId,
      })
      
      toast({
        title: "添加成功",
        description: "文档添加成功",
      })
      setShowAddDialog(false)
      setDocumentTitle("")
      setDocumentContent("")
      
      // 立即刷新文档列表，避免重复调用和延迟
      await loadDocuments(currentPage, 'text')
      
    } catch (error) {
      console.error("添加文档失败:", error)
      toast({
        variant: "destructive",
        title: "错误",
        description: "添加文档失败，请稍后重试",
      })
    }
  }

  // 编辑文档
  const handleEditDocument = async () => {
    if (!selectedDocument) {
      return
    }

    // 验证文档标题
    if (!documentTitle.trim()) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请输入文档标题",
      })
      return
    }

    // 验证文档内容
    if (!documentContent.trim()) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请输入文档内容",
      })
      return
    }

    try {
      await documentService.edit({
        doc_id: selectedDocument.doc_id || selectedDocument.id,
        doc_title: documentTitle.trim(),
        doc_content: documentContent.trim(),
      })
      
      toast({
        title: "成功",
        description: "文档编辑成功",
      })
      setShowEditDialog(false)
      setDocumentTitle("")
      setDocumentContent("")
      setSelectedDocument(null)
      
      // 刷新文档列表
      await loadDocuments(currentPage, 'text')
    } catch (error) {
      console.error("编辑文档失败:", error)
      toast({
        variant: "destructive",
        title: "错误",
        description: "编辑文档失败",
      })
    }
  }

  // 删除文档
  const handleDeleteDocument = async () => {
    if (!selectedDocument) return

    try {
      await documentService.deleteDoc({
        doc_id: selectedDocument.doc_id || selectedDocument.id
      })
      
      toast({
        title: "删除成功",
        description: "文档已删除",
      })
      setShowDeleteDialog(false)
      setSelectedDocument(null)
      
      // 立即刷新文档列表
      await loadDocuments(currentPage, viewMode)
      
    } catch (error) {
      console.error("删除文档失败:", error)
      toast({
        variant: "destructive",
        title: "错误",
        description: "删除文档失败",
      })
    }
  }

  // 打开编辑对话框
  const openEditDialog = (doc: Document) => {
    setSelectedDocument(doc)
    setDocumentTitle(doc.doc_name || "")
    setDocumentContent(doc.doc_content || "")
    setShowEditDialog(true)
  }

  // 打开删除确认对话框
  const openDeleteDialog = (doc: Document) => {
    setSelectedDocument(doc)
    setShowDeleteDialog(true)
  }

  // 搜索防抖
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch(searchTerm)
      } else {
        setSearchResults(null)
      }
    }, 500) // 500ms 防抖

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // 当前显示的文档列表 - 适配不同接口的返回格式
  const currentDocuments = (searchResults && Array.isArray(searchResults) && searchResults.length > 0) 
    ? searchResults.map(result => ({
        id: result.doc_id,
        doc_id: result.doc_id,
        doc_name: result.doc_name || result.doc_title || '未命名文档',
        doc_content: result.content,
        filename: result.doc_name || result.doc_title || '未命名文档',
        curr_filename: result.doc_name || result.doc_title,
        chunk_size: undefined,
        chunk_overlap: undefined,
        create_time: undefined,
        update_time: undefined,
        embedding_score: result.score || 0,
        rerank_score: result.score || 0,
        curr_file_progress: 100
      }))
    : (() => {
    // 根据viewMode决定数据源
    if (viewMode === 'file') {
      // 文件上传模式：直接使用documentTasks数据
      return documentTasks || []
    } else {
      // 文本文档模式：使用paginatedData
      return (paginatedData?.items || []).map(item => ({
        id: item.id || item.doc_id,
        doc_id: item.id || item.doc_id,
        doc_name: item.doc_title || '未命名文档',
        doc_content: item.doc_content,
        filename: item.filename || item.doc_title || '未命名文档',
        curr_filename: item.curr_filename || item.doc_title,
        chunk_size: item.chunk_size,
        chunk_overlap: item.chunk_overlap,
        create_time: item.create_time,
        update_time: item.update_time,
        embedding_score: item.embedding_score || 0,
        rerank_score: item.rerank_score || 0,
        curr_file_progress: 100
      }))
    }
  })()

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-100 flex flex-col">
      
      <header className="bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm shrink-0">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="hover:bg-white/60 dark:hover:bg-slate-800/60 backdrop-blur-sm transition-all duration-200 border border-transparent hover:border-white/30"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {knowledgeBase?.kb_name || "加载中..."}
                  </h1>
                  {knowledgeBase?.kb_desc && (
                    <p className="text-sm text-gray-500 mt-1">
                      {knowledgeBase.kb_desc}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {paginatedData && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => router.push(`/chat/${kbId}`)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 text-white"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  开始聊天
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto px-6 py-6 h-full flex flex-col">
        {/* 统计信息和搜索操作区 - 固定区域 */}
        <div className="mb-6 shrink-0">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">文档管理</h2>
              <p className="text-gray-600">管理您的知识库文档，支持智能搜索</p>
            </div>
            {paginatedData && (
              <div className="flex items-center gap-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm border border-white/20">
                  <span className="text-sm font-medium text-gray-700">
                    共 {paginatedData.total} 个文档
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm border border-white/20">
                  <span className="text-sm font-medium text-gray-700">
                    第 {paginatedData.page || currentPage} / {paginatedData.total_pages || Math.ceil((paginatedData.total || 0) / (paginatedData.page_size || 10))} 页
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 视图模式切换标签页 */}
          <div className="mb-6">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
              <Button
                variant={viewMode === 'file' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('file')}
                className={`h-9 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'file'
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                <Upload className="h-4 w-4 mr-2" />
                文件上传
              </Button>
              <Button
                variant={viewMode === 'text' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('text')}
                className={`h-9 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'text'
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                <Type className="h-4 w-4 mr-2" />
                文本文档
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {viewMode === 'text' 
                ? '显示通过文本添加的文档（使用语义检索）' 
                : '显示通过文件上传的文档（显示任务状态）'
              }
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            {viewMode === 'text' && (
              <div className="flex-1 flex items-center gap-6">
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="🔍 智能语义搜索文档内容..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-12 h-12 text-base border border-gray-200/60 backdrop-blur-sm bg-white/60 focus:bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-200/50 focus:shadow-md transition-all duration-300 rounded-xl outline-none"
                  />
                  {searching && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                    </div>
                  )}
                </div>
                
                {searchResults && Array.isArray(searchResults) && searchResults.length > 0 && (
                  <div className="px-4 py-2 rounded-xl bg-green-50/80 backdrop-blur-sm border border-green-200">
                    <span className="text-sm font-semibold text-green-700">
                      ✨ 搜索到 {searchResults.length} 个结果
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {viewMode === 'file' && (
              <div className="flex-1">
                <p className="text-gray-500 text-sm">
                  📁 文件上传列表 - 显示上传任务的状态和进度
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => {
                  if (viewMode === 'text') {
                    setShowAddDialog(true)
                  } else {
                    setShowUploadDialog(true)
                  }
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                {viewMode === 'text' ? '添加文档' : '上传文件'}
              </Button>
              <Button
                onClick={() => loadDocuments(currentPage, viewMode)}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                title="刷新列表"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto relative">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="w-16 h-16 relative">
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-gray-200"></div>
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">加载中...</p>
          </div>
        ) : currentDocuments.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <FileText className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {searchTerm ? "未找到匹配的文档" : "该知识库暂无文档"}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm 
                ? "尝试使用不同的关键词进行搜索，或者添加新的文档内容" 
                : "开始添加文档来构建您的知识库，支持多种格式文件"}
            </p>
            {!searchTerm && (
              <div className="flex items-center gap-2 justify-center">
                <Button 
                  onClick={() => {
                    if (viewMode === 'text') {
                      setShowAddDialog(true)
                    } else {
                      setShowUploadDialog(true)
                    }
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {viewMode === 'text' ? '添加第一个文档' : '上传第一个文件'}
                </Button>
                <Button
                  onClick={() => loadDocuments(currentPage, viewMode)}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                  title="刷新列表"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 文档表格 - 首页风格 */}
            <div className="rounded-xl bg-white/60 backdrop-blur-sm shadow-sm">
              <table className="w-full caption-bottom text-sm">
                <thead className="sticky top-0 bg-white/90 backdrop-blur-sm z-20 shadow-sm border-b border-gray-200/50">
                  <TableRow className="hover:bg-gray-50/50 border-0">
                  {viewMode === 'text' ? (
                    <>
                      <TableHead className="text-gray-700 font-semibold">文档标题</TableHead>
                      <TableHead className="text-gray-700 font-semibold">文档内容</TableHead>
                      <TableHead className="text-gray-700 font-semibold text-center">语义分块</TableHead>
                      <TableHead className="text-gray-700 font-semibold text-center">数据清洗</TableHead>
                      <TableHead className="text-right text-gray-700 font-semibold">操作</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-gray-700 font-semibold">文件名</TableHead>
                      <TableHead className="text-gray-700 font-semibold">分块大小</TableHead>
                      <TableHead className="text-gray-700 font-semibold">当前进度</TableHead>
                      <TableHead className="text-gray-700 font-semibold">创建时间</TableHead>
                      <TableHead className="text-gray-700 font-semibold">更新时间</TableHead>
                    </>
                  )}
                </TableRow>
              </thead>
              <TableBody>
                {currentDocuments.map((doc) => (
                  <TableRow key={doc.id} className="border-0 hover:bg-purple-50/30 transition-colors duration-200">
                    {viewMode === 'text' ? (
                      <>
                        {/* 文本文档模式的列 */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-r from-purple-500 to-pink-500">
                              <FileText className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{doc.curr_filename || (doc as any).doc_name || "未命名文档"}</div>
                              <div className="text-sm text-gray-500">ID: {doc.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          <div className="max-w-md">
                            {(doc as any).doc_content ? (
                              <div className="text-sm text-gray-800">
                                <div className={expandedDocs.has(doc.id || '') ? '' : 'line-clamp-2'}>
                                  {expandedDocs.has(doc.id || '') ? (doc as any).doc_content : (doc as any).doc_content.slice(0, 100)}
                                </div>
                                {(doc as any).doc_content.length > 100 && (
                                  <button
                                    onClick={() => toggleDocumentExpand(doc.id || '')}
                                    className="text-purple-600 hover:text-purple-800 text-xs mt-1 font-medium transition-colors"
                                  >
                                    {expandedDocs.has(doc.id || '') ? '收起' : '...更多'}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">暂无内容</div>
                            )}
                          </div>
                        </TableCell>

                        {/* 语义分块状态列 */}
                        <TableCell className="text-center">
                          {(() => {
                            const semanticSplit = (doc as any).semantic_split
                            if (semanticSplit === -1) {
                              return (
                                <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
                                  不需要
                                </div>
                              )
                            } else if (semanticSplit === 0) {
                              return (
                                <div className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                                  未分块
                                </div>
                              )
                            } else if (semanticSplit === 1) {
                              return (
                                <div className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                                  已完成
                                </div>
                              )
                            } else {
                              return (
                                <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                                  <div className="w-2 h-2 bg-gray-300 rounded-full mr-1"></div>
                                  未知
                                </div>
                              )
                            }
                          })()}
                        </TableCell>

                        {/* 数据清洗状态列 */}
                        <TableCell className="text-center">
                          {(() => {
                            const dataClean = (doc as any).data_clean
                            if (dataClean === -1) {
                              return (
                                <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
                                  不需要
                                </div>
                              )
                            } else if (dataClean === 0) {
                              return (
                                <div className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                                  <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                                  未清洗
                                </div>
                              )
                            } else if (dataClean === 1) {
                              return (
                                <div className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                                  已清洗
                                </div>
                              )
                            } else {
                              return (
                                <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                                  <div className="w-2 h-2 bg-gray-300 rounded-full mr-1"></div>
                                  未知
                                </div>
                              )
                            }
                          })()}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog({
                                id: doc.id,
                                doc_id: (doc as any).doc_id,
                                doc_content: (doc as any).doc_content,
                                doc_name: (doc as any).doc_name
                              } as any)}
                              className="h-8 w-8 p-0 hover:bg-purple-100 hover:text-purple-600"
                              title="编辑"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDeleteDialog({
                                id: doc.id,
                                doc_id: (doc as any).doc_id,
                                doc_content: (doc as any).doc_content,
                                doc_name: (doc as any).doc_name
                              } as any)}
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                              title="删除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        {/* 文件上传模式的列 */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-r from-green-500 to-emerald-500">
                              <Upload className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{doc.curr_filename || "未命名文件"}</div>
                              <div className="text-sm text-gray-500">ID: {doc.id || (doc as any).doc_id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          <div className="inline-flex items-center px-2 py-1 rounded-md bg-orange-50 text-orange-700 text-sm font-medium">
                            {doc.chunk_size || '--'}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {(() => {
                            const progress = doc.curr_file_progress || 0
                            const isCompleted = progress === 100
                            const progressColor = progress === 0 
                              ? 'from-red-500 to-red-600'
                              : progress === 100
                                ? 'from-green-500 to-green-600'
                                : 'from-yellow-500 to-yellow-600'
                            
                            if (isCompleted) {
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-green-700">
                                    已完成
                                  </span>
                                </div>
                              )
                            } else {
                              return (
                                <div className="flex items-center gap-3">
                                  <div className="w-24 bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                                    <div 
                                      className={`bg-gradient-to-r ${progressColor} h-2.5 rounded-full transition-all duration-700 ease-out shadow-sm`}
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>
                                  <span className={`text-sm font-semibold min-w-12 ${
                                    progress === 0 ? 'text-red-700' : 'text-yellow-700'
                                  }`}>
                                    {progress}%
                                  </span>
                                </div>
                              )
                            }
                          })()}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {doc.create_time ? formatDate(doc.create_time) : '未知'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {doc.update_time ? formatDate(doc.update_time) : '未知'}
                            </span>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              </table>
            </div>

          </>
        )}
        </div>
        
        {/* 分页控件 - 固定在表格下方，不随滚动 */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>第 {paginatedData?.page || currentPage} 页，共 {paginatedData?.total_pages || Math.ceil((paginatedData?.total || 0) / (paginatedData?.page_size || 10))} 页</span>
                </div>
                {(paginatedData?.total || 0) > 0 && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <span>共</span>
                    <span className="font-medium text-purple-600">{paginatedData?.total || 0}</span>
                    <span>条记录</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="h-9 px-3 text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  上一页
                </Button>

                {(() => {
                  const totalPages = paginatedData?.total_pages || Math.ceil((paginatedData?.total || 0) / (paginatedData?.page_size || 10))
                  return totalPages <= 7 ? (
                    Array.from({ length: totalPages }, (_, i) => (
                      <Button
                        key={i + 1}
                        variant={currentPage === i + 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(i + 1)}
                        className={`h-9 w-9 p-0 transition-all duration-200 ${
                          currentPage === i + 1 
                            ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700 shadow-sm' 
                            : 'bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600'
                        }`}
                      >
                        <span className="text-sm font-medium">{i + 1}</span>
                      </Button>
                    ))
                  ) : (
                    <>
                      {currentPage > 3 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(1)}
                            className="h-9 w-9 p-0 bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600"
                          >
                            <span className="text-sm font-medium">1</span>
                          </Button>
                          {currentPage > 4 && <span className="px-2 text-gray-400 text-sm">•••</span>}
                        </>
                      )}

                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (page > totalPages) return null;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className={`h-9 w-9 p-0 transition-all duration-200 ${
                              currentPage === page 
                                ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700 shadow-md' 
                                : 'bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600'
                            }`}
                          >
                            <span className="text-sm font-medium">{page}</span>
                          </Button>
                        );
                      })}

                      {currentPage < totalPages - 2 && (
                        <>
                          {currentPage < totalPages - 3 && <span className="px-2 text-gray-400 text-sm">•••</span>}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(totalPages)}
                            className="h-9 w-9 p-0 bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600"
                          >
                            <span className="text-sm font-medium">{totalPages}</span>
                          </Button>
                        </>
                      )}
                    </>
                  )
                })()}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(paginatedData?.total_pages || Math.ceil((paginatedData?.total || 0) / (paginatedData?.page_size || 10)), currentPage + 1))}
                  disabled={currentPage >= (paginatedData?.total_pages || Math.ceil((paginatedData?.total || 0) / (paginatedData?.page_size || 10)))}
                  className="h-9 px-3 text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  下一页
                </Button>
              </div>

              {(paginatedData?.total_pages || Math.ceil((paginatedData?.total || 0) / (paginatedData?.page_size || 10))) > 7 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">跳转到</span>
                  <Input
                    type="number"
                    min={1}
                    max={paginatedData?.total_pages || Math.ceil((paginatedData?.total || 0) / (paginatedData?.page_size || 10))}
                    value={currentPage}
                    onChange={(e) => {
                      const totalPages = paginatedData?.total_pages || Math.ceil((paginatedData?.total || 0) / (paginatedData?.page_size || 10))
                      const page = Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1))
                      handlePageChange(page)
                    }}
                    className="w-16 h-8 text-center text-sm"
                  />
                  <span className="text-sm text-gray-600">页</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>


      {/* 添加文档对话框 - 仅用于文本输入 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[700px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Type className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                添加文档
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 dark:text-slate-400 text-base">
              输入文档内容，支持 Markdown 格式
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-6">
              {/* 文档标题输入框 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  文档标题
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="✨ 请输入文档标题..."
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="text-base border border-gray-200/60 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl focus:bg-white dark:focus:bg-slate-700/70 focus:border-purple-500 focus:ring-1 focus:ring-purple-200/50 focus:shadow-md transition-all duration-300"
                />
              </div>

              {/* 文档内容输入框 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  文档内容
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="✨ 请输入文档内容...支持 Markdown 格式"
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  rows={10}
                  className="min-h-[250px] text-base leading-relaxed border border-gray-200/60 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl focus:bg-white dark:focus:bg-slate-700/70 focus:border-purple-500 focus:ring-1 focus:ring-purple-200/50 focus:shadow-md transition-all duration-300 resize-none outline-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddDialog(false)
                setDocumentContent("")
              }}
              className="h-11 px-6 rounded-xl bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600"
            >
              取消
            </Button>
            <Button 
              onClick={handleAddDocument}
              className="h-11 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加文档
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 文件上传对话框 */}
      <UploadFileDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={handleFileUpload}
      />

      {/* 高级编辑文档对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[700px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Edit className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                编辑文档
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 dark:text-slate-400 text-base">
              修改文档内容，支持实时预览和自动保存
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-6">
              {/* 文档标题输入框 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  文档标题
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="✨ 请输入文档标题..."
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="text-base border border-gray-200/60 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl focus:bg-white dark:focus:bg-slate-700/70 focus:border-purple-500 focus:ring-1 focus:ring-purple-200/50 focus:shadow-md transition-all duration-300"
                />
              </div>

              {/* 文档内容输入框 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  文档内容
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="✏️ 请输入文档内容...支持 Markdown 格式"
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  rows={10}
                  className="min-h-[250px] text-base leading-relaxed border border-gray-200/60 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl focus:bg-white dark:focus:bg-slate-700/70 focus:border-purple-500 focus:ring-1 focus:ring-purple-200/50 focus:shadow-md transition-all duration-300 resize-none outline-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(false)}
              className="h-11 px-6 rounded-xl bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600"
            >
              取消
            </Button>
            <Button 
              onClick={handleEditDocument}
              className="h-11 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl border-0 text-white"
            >
              <Eye className="h-4 w-4 mr-2" />
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除文档确认对话框 */}
      {showDeleteDialog && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) setShowDeleteDialog(false)
        }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">确认删除</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                ✕
              </Button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                确定要删除文档 <strong>"{selectedDocument.doc_name || selectedDocument.curr_filename || '未知文档'}"</strong> 吗？
              </p>
              <p className="text-sm text-gray-500">
                此操作不可撤销，请谨慎操作。
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleDeleteDocument}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}