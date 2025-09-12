/**
 * API客户端封装
 */

import { ApiResponse, ApiError, HttpMethod } from '@/types'

// API配置
interface ApiClientConfig {
  baseURL: string
  timeout: number
  defaultHeaders: Record<string, string>
}

// 请求拦截器
type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>

// 响应拦截器
type ResponseInterceptor = (response: Response) => Response | Promise<Response>

// API客户端类
export class ApiClient {
  private config: ApiClientConfig
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []

  constructor(config: Partial<ApiClientConfig> = {}) {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/api/proxy'
    
    this.config = {
      baseURL: typeof window !== 'undefined' ? 
        new URL('/api/proxy', window.location.origin).toString() : 
        baseURL,
      timeout: 30000,
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
      ...config
    }

    // 添加默认认证
    this.addRequestInterceptor(this.addAuthHeaders)
  }

  // 添加请求拦截器
  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor)
  }

  // 添加响应拦截器
  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor)
  }

  // 添加认证头
  private addAuthHeaders = (config: RequestInit): RequestInit => {
    const token = this.getToken()
    const headers = new Headers(config.headers)
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
      headers.set('x-token', token)
    }

    return {
      ...config,
      headers
    }
  }

  // 获取token
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      // 优先从localStorage获取，没有则使用默认token，最后为空
      return localStorage.getItem('auth_token') || 
             process.env.NEXT_PUBLIC_DEFAULT_TOKEN || 
             ''
    }
    return process.env.NEXT_PUBLIC_DEFAULT_TOKEN || ''
  }

  // 构建URL
  private buildURL(endpoint: string, params?: Record<string, any>): string {
    // 确保baseURL以斜杠结尾，endpoint不以斜杠开头
    const baseURL = this.config.baseURL.endsWith('/') ? this.config.baseURL : this.config.baseURL + '/'
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    
    const url = new URL(cleanEndpoint, baseURL)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return url.toString()
  }

  // 应用请求拦截器
  private async applyRequestInterceptors(config: RequestInit): Promise<RequestInit> {
    let result = config
    for (const interceptor of this.requestInterceptors) {
      result = await interceptor(result)
    }
    return result
  }

  // 应用响应拦截器
  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let result = response
    for (const interceptor of this.responseInterceptors) {
      result = await interceptor(result)
    }
    return result
  }

  // 基础请求方法
  private async request<T = any>(
    endpoint: string,
    options: RequestInit & {
      params?: Record<string, any>
      timeout?: number
    } = {}
  ): Promise<ApiResponse<T>> {
    const { params, timeout = this.config.timeout, ...requestOptions } = options

    // 构建请求配置
    let config: RequestInit = {
      ...requestOptions,
      headers: {
        ...this.config.defaultHeaders,
        ...requestOptions.headers
      }
    }

    // 应用请求拦截器
    config = await this.applyRequestInterceptors(config)

    // 构建URL
    const url = this.buildURL(endpoint, params)

    // 创建AbortController用于超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // 发送请求
      let response = await fetch(url, {
        ...config,
        signal: controller.signal
      })

      // 清除超时
      clearTimeout(timeoutId)

      // 应用响应拦截器
      response = await this.applyResponseInterceptors(response)

      // 解析响应
      const data = await response.json()

      // 检查业务状态码
      if (data.code !== 200) {
        throw new Error(data.msg || 'API request failed')
      }

      return data as ApiResponse<T>
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout')
        }
        throw error
      }
      
      throw new Error('Unknown error occurred')
    }
  }

  // GET请求
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      params
    })
  }

  // POST请求
  async post<T = any>(endpoint: string, data?: any, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      params
    })
  }

  // PUT请求
  async put<T = any>(endpoint: string, data?: any, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      params
    })
  }

  // DELETE请求
  async delete<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      params
    })
  }

  // 文件上传
  async upload<T = any>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    // 对于FormData上传，完全绕过默认的请求处理
    const token = this.getToken()
    const headers: HeadersInit = {}
    
    // 只添加认证头，不设置Content-Type
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      headers['x-token'] = token
    }

    // 构建URL
    const url = this.buildURL(endpoint)

    // 创建AbortController用于超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      // 直接发送请求，不经过request方法
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal
      })

      // 清除超时
      clearTimeout(timeoutId)

      // 解析响应
      const data = await response.json()

      // 检查业务状态码
      if (data.code !== 200) {
        throw new Error(data.msg || 'API request failed')
      }

      return data as ApiResponse<T>
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout')
        }
        throw error
      }
      
      throw new Error('Unknown error occurred')
    }
  }
}

// 创建默认实例
export const apiClient = new ApiClient()

// 导出便捷方法
export const api = {
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
  upload: apiClient.upload.bind(apiClient)
}