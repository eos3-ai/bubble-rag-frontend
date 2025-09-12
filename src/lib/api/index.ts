/**
 * API模块统一导出
 */

// 客户端
export { ApiClient, apiClient, api } from './client'

// 端点
export { ENDPOINTS } from './endpoints'

// 服务
export * from './services'

// 重新导出旧的API函数以保持兼容性
import { knowledgeBaseService, documentService, chatService, configService } from './services'

// 简化API兼容层
export const apiRequest = (url: string, data?: any) => {
  // 简单的POST请求实现
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json())
}

// 兼容旧API
export const getKnowledgeBases = () => knowledgeBaseService.list()
export const createKnowledgeBase = (params: any) => knowledgeBaseService.create(params)
export const deleteKnowledgeBase = (params: any) => knowledgeBaseService.delete(params)
export const getDocuments = (params: any) => documentService.list(params)
export const uploadDocument = (params: any) => documentService.upload(params)
export const deleteDocument = (params: any) => documentService.delete(params)
export const sendChatMessage = (params: any) => chatService.sendMessage(params)
export const getConfig = () => configService.getConfig()
export const updateConfig = (config: any) => configService.updateConfig(config)
export const testConfig = (params: any) => configService.testConnection(params)