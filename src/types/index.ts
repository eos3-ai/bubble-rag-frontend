/**
 * 类型定义统一导出
 */

// API相关类型
export type {
  ApiResponse,
  ApiError,
  PaginationParams,
  PaginatedResponse,
  SearchParams,
  SortParams,
  HttpMethod,
  ApiRequestConfig
} from './api'

// 知识库相关类型
export type {
  KnowledgeBase,
  CreateKnowledgeBaseParams,
  UpdateKnowledgeBaseParams,
  DeleteKnowledgeBaseParams,
  KnowledgeBaseQueryParams,
  KnowledgeBaseStats
} from './knowledge-base'

// 文档相关类型
export type {
  Document,
  UploadDocumentParams,
  UpdateDocumentParams,
  DeleteDocumentParams,
  DocumentQueryParams,
  SearchDocumentParams,
  DocumentSearchResult,
  DocumentStats
} from './document'

export {
  DocumentStatus,
  DocumentType
} from './document'

// 聊天相关类型
export type {
  ChatMessage,
  ChatSource,
  SendMessageParams,
  ChatSession,
  CreateSessionParams,
  ChatConfig
} from './chat'

export {
  MessageRole
} from './chat'

// 配置相关类型
export type {
  LLMConfig,
  EmbeddingConfig,
  RerankConfig,
  SystemConfig,
  VectorStoreConfig,
  ModelOption,
  TestConnectionParams,
  TestConnectionResult
} from './config'

export {
  ModelProvider
} from './config'

// 通用类型
export interface BaseEntity {
  id: string
  created_at?: string
  updated_at?: string
}

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

export interface FileUpload {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}