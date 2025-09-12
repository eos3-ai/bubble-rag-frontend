/**
 * API相关类型定义
 */

// API标准响应格式
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

// API错误响应
export interface ApiError {
  code: number
  message: string
  details?: any
}

// 分页参数
export interface PaginationParams {
  page?: number
  page_size?: number
  page_num?: number
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next?: boolean
  has_prev?: boolean
}

// 搜索参数
export interface SearchParams {
  query: string
  filters?: Record<string, any>
}

// 排序参数
export interface SortParams {
  field: string
  order: 'asc' | 'desc'
}

// HTTP方法类型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// API请求配置
export interface ApiRequestConfig {
  url: string
  method: HttpMethod
  data?: any
  params?: Record<string, any>
  headers?: Record<string, string>
  timeout?: number
}