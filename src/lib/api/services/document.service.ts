/**
 * 文档服务
 */

import { api } from '../client'
import { ENDPOINTS } from '../endpoints'
import type {
  Document,
  UploadDocumentParams,
  UpdateDocumentParams,
  DeleteDocumentParams,
  DocumentQueryParams,
  SearchDocumentParams,
  DocumentSearchResult,
  PaginatedResponse
} from '@/types'

export class DocumentService {
  // 获取文档列表（语义检索接口，用于文字添加的文档）
  async list(params: DocumentQueryParams): Promise<PaginatedResponse<Document>> {
    const response = await api.post(ENDPOINTS.DOC.LIST, {
      doc_content: '', // 空字符串获取所有文档
      doc_knowledge_base_id: params.kb_name,
      page_size: params.page_size || 10,
      page_num: params.page || 1
    })
    
    // 如果后端返回分页格式，处理并确保字段完整
    if (response.data && 'items' in response.data) {
      const data = response.data
      // 确保total_pages字段存在且正确
      if (data.total && data.page_size && !data.total_pages) {
        data.total_pages = Math.ceil(data.total / data.page_size)
      }
      return data
    } else {
      // 如果是旧格式（直接返回数组），构造分页格式
      const items = response.data || []
      const pageSize = params.page_size || 10
      return {
        items,
        total: items.length,
        page: params.page || 1,
        page_size: pageSize,
        total_pages: Math.ceil(items.length / pageSize)
      }
    }
  }

  // 获取文档任务列表（用于文件上传的文档）
  async listDocTasks(params: DocumentQueryParams): Promise<PaginatedResponse<Document>> {
    const response = await api.post(ENDPOINTS.DOC.LIST_DOC_TASKS, {
      doc_knowledge_base_id: params.kb_name,
      page_num: params.page || 1,
      page_size: params.page_size || 10
    })
    
    const data = response.data || {
      items: [],
      total: 0,
      page: params.page || 1,
      page_size: params.page_size || 10,
      total_pages: 0
    }
    
    // 确保total_pages字段存在且正确
    if (data.total && data.page_size && !data.total_pages) {
      data.total_pages = Math.ceil(data.total / data.page_size)
    }
    
    return data
  }

  // 添加文档（使用新的端点）
  async add(params: { doc_title?: string; doc_content: string; doc_knowledge_base_id: string }): Promise<Document> {
    const response = await api.post(ENDPOINTS.DOC.ADD, {
      doc_title: params.doc_title,
      doc_content: params.doc_content,
      doc_knowledge_base_id: params.doc_knowledge_base_id
    })
    
    return response.data
  }

  // 编辑文档（使用新的端点）
  async edit(params: { doc_title?: string; doc_content: string; doc_id: string }): Promise<Document> {
    const response = await api.post(ENDPOINTS.DOC.EDIT, {
      doc_title: params.doc_title,
      doc_content: params.doc_content,
      doc_id: params.doc_id
    })
    
    return response.data
  }

  // 删除文档（使用新的端点）
  async deleteDoc(params: { doc_id: string }): Promise<void> {
    await api.post(ENDPOINTS.DOC.DELETE, {
      doc_id: params.doc_id
    })
  }

  // 语义搜索（使用新的端点）
  async semanticQuery(params: { 
    doc_content: string; 
    doc_knowledge_base_id: string;
    page_size?: number;
    page_num?: number;
  }): Promise<DocumentSearchResult[]> {
    const response = await api.post(ENDPOINTS.DOC.SEMANTIC_QUERY, {
      doc_content: params.doc_content,
      doc_knowledge_base_id: params.doc_knowledge_base_id,
      page_size: params.page_size || 10,
      page_num: params.page_num || 1
    })
    
    // 确保返回值始终是数组
    const data = response.data
    if (Array.isArray(data)) {
      return data
    }
    
    // 如果是对象格式，可能包含items字段
    if (data && typeof data === 'object' && Array.isArray(data.items)) {
      return data.items
    }
    
    // 如果数据格式不正确，返回空数组
    console.warn('语义搜索API返回了意外的数据格式:', data)
    return []
  }

  // 新的文件上传接口（add_doc_task）
  async uploadFile(params: {
    files: File[]; 
    doc_knowledge_base_id: string; 
    chunk_size?: number;
  }): Promise<any> {
    const formData = new FormData()
    
    // 添加文件
    params.files.forEach((file, index) => {
      formData.append('files', file)
    })
    
    // 添加知识库ID
    formData.append('doc_knowledge_base_id', params.doc_knowledge_base_id)
    
    // 添加chunk_size，默认1000
    formData.append('chunk_size', String(params.chunk_size || 1000))

    const response = await api.upload(ENDPOINTS.DOC.ADD_DOC_TASK, formData)
    return response.data
  }

  // 保留旧的方法以向后兼容
  async upload(params: UploadDocumentParams): Promise<Document> {
    const formData = new FormData()
    formData.append('kb_name', params.kb_name)
    formData.append('file', params.file)
    
    if (params.chunk_size) {
      formData.append('chunk_size', String(params.chunk_size))
    }
    if (params.chunk_overlap) {
      formData.append('chunk_overlap', String(params.chunk_overlap))
    }

    const response = await api.upload(ENDPOINTS.DOC.UPLOAD, formData)
    return response.data
  }

  // 更新文档（旧方法）
  async update(params: UpdateDocumentParams): Promise<Document> {
    return this.edit({
      doc_content: params.doc_content || '',
      doc_id: params.doc_id
    })
  }

  // 删除文档（旧方法）
  async delete(params: DeleteDocumentParams): Promise<void> {
    await this.deleteDoc({ doc_id: params.doc_id })
  }

  // 搜索文档（旧方法）
  async search(params: SearchDocumentParams & { page_size?: number; page_num?: number }): Promise<DocumentSearchResult[]> {
    return this.semanticQuery({
      doc_content: params.query,
      doc_knowledge_base_id: params.kb_name,
      page_size: params.page_size,
      page_num: params.page_num
    })
  }

  // 获取文档详情
  async getDetail(kbName: string, docId: string): Promise<Document | null> {
    try {
      const response = await this.list({ kb_name: kbName })
      return response.items.find(doc => doc.doc_id === docId || doc.id === docId) || null
    } catch {
      return null
    }
  }

  // 下载文档
  async download(kbName: string, docId: string): Promise<Blob> {
    // 这里需要根据实际API实现
    const response = await fetch(`/api/v1/knowledge_base/download_document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kb_name: kbName,
        doc_id: docId
      })
    })

    if (!response.ok) {
      throw new Error('Download failed')
    }

    return response.blob()
  }
}

// 创建服务实例
export const documentService = new DocumentService()