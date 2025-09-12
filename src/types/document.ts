/**
 * 文档相关类型定义
 */

// 文档状态枚举
export enum DocumentStatus {
  PROCESSING = 0,
  SUCCESS = 1,
  FAILED = 2
}

// 文档类型枚举
export enum DocumentType {
  PDF = 1,
  TXT = 2,
  DOCX = 3,
  MD = 4,
  JSON = 5,
  CSV = 6
}

// 文档基础信息
export interface Document {
  // 基础字段
  id: string
  doc_id?: string
  doc_name?: string
  doc_title?: string
  filename: string
  curr_filename?: string
  original_name?: string
  originalName?: string
  
  // 文档属性
  file_type?: string
  fileType?: string
  doc_type?: DocumentType
  file_size?: number
  fileSize?: number
  
  // 关联字段
  kb_name?: string
  knowledgeBaseId?: string
  
  // 内容字段
  doc_content?: string
  
  // 搜索评分字段
  embedding_score?: number
  rerank_score?: number
  
  // 处理参数
  chunk_size?: number
  chunk_overlap?: number
  
  // 状态字段
  status?: DocumentStatus
  
  // 时间字段
  create_time?: string
  update_time?: string
  createdAt?: string
  updatedAt?: string
}

// 上传文档参数
export interface UploadDocumentParams {
  kb_name: string
  file: File
  chunk_size?: number
  chunk_overlap?: number
}

// 更新文档参数
export interface UpdateDocumentParams {
  kb_name: string
  doc_id: string
  doc_name?: string
  doc_content?: string
}

// 删除文档参数
export interface DeleteDocumentParams {
  kb_name: string
  doc_id: string
}

// 文档列表查询参数
export interface DocumentQueryParams {
  kb_name: string
  page?: number
  page_size?: number
  status?: DocumentStatus
  file_type?: string
}

// 搜索文档参数
export interface SearchDocumentParams {
  kb_name: string
  query: string
  top_k?: number
  score_threshold?: number
}

// 文档搜索结果
export interface DocumentSearchResult {
  doc_id: string
  doc_title: string
  doc_name?: string
  content: string
  score: number
  metadata?: Record<string, any>
}

// 文档统计信息
export interface DocumentStats {
  total: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  total_size: number
}