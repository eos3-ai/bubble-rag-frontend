/**
 * API接口封装 - 兼容旧版本
 * 
 * @deprecated 建议使用 @/lib/api 中的新服务
 */

// 重新导出新的API以保持向后兼容
export * from './api'

// 兼容旧的导出方式
import { knowledgeBaseService, documentService, chatService, configService } from './api/services'

export const knowledgeBaseAPI = {
  getAll: async (params?: any) => {
    const data = await knowledgeBaseService.list(params)
    return { 
      code: 200, 
      msg: 'success', 
      data: data
    }
  },
  create: async (data: { name: string; description: string; rerankModelId: string; embeddingModelId: string }) => {
    const result = await knowledgeBaseService.create({ 
      kb_name: data.name, 
      kb_desc: data.description,
      rerank_model_id: data.rerankModelId,
      embedding_model_id: data.embeddingModelId
    })
    return { code: 200, msg: 'success', data: result }
  },
  update: async (id: string, data: { name?: string; description?: string }) => {
    const result = await knowledgeBaseService.update({ kb_name: data.name || '', kb_desc: data.description })
    return { code: 200, msg: 'success', data: result }
  },
  delete: async (id: string) => {
    await knowledgeBaseService.delete({ kb_name: id })
    return { code: 200, msg: 'success', data: null }
  },
  uploadFile: async (id: string, file: File) => {
    const result = await documentService.upload({ kb_name: id, file })
    return { code: 200, msg: 'success', data: result }
  },
  getDocuments: async (kbId: string, pageNum = 1, pageSize = 20) => {
    const data = await documentService.list({ kb_name: kbId, page: pageNum, page_size: pageSize })
    return { 
      code: 200, 
      msg: 'success', 
      data: data
    }
  },
  searchDocuments: async (kbId: string, query: string) => {
    const data = await documentService.search({ kb_name: kbId, query })
    return { code: 200, msg: 'success', data }
  },
  deleteDocument: async (docId: string) => {
    await documentService.delete({ kb_name: '', doc_id: docId })
    return { code: 200, msg: 'success', data: null }
  }
}

export const documentAPI = {
  addDoc: async (data: any) => {
    const result = await documentService.upload({ kb_name: data.doc_knowledge_base_id, file: data.file })
    return { code: 200, msg: 'success', data: result }
  },
  editDoc: async (data: any) => {
    const result = await documentService.update({ kb_name: '', doc_id: data.doc_id, doc_content: data.doc_content })
    return { code: 200, msg: 'success', data: result }
  },
  deleteDoc: async (docId: string) => {
    await documentService.delete({ kb_name: '', doc_id: docId })
    return { code: 200, msg: 'success', data: null }
  }
}

export const chatAPI = {
  sendMessage: async (knowledgeBaseId: string, message: string, history: any[] = [], temperature: number = 0, max_tokens: number = 0) => {
    const result = await chatService.sendMessage({ 
      kb_name: knowledgeBaseId, 
      message, 
      history, 
      temperature, 
      max_tokens 
    })
    return { code: 200, msg: 'success', data: { response: result.content, sources: result.sources } }
  }
}

export const configAPI = {
  getConfig: async () => {
    const result = await configService.getConfig()
    return { code: 200, msg: 'success', data: result }
  },
  updateConfig: async (config: any) => {
    const result = await configService.updateConfig(config)
    return { code: 200, msg: 'success', data: result }
  },
  testConfig: async (config: any) => {
    const result = await configService.testConnection({ config })
    return { code: 200, msg: 'success', data: result }
  }
}

export const authAPI = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  },
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  },
  clearToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }
}

export const modelAPI = {
  getEmbeddingModels: () => configService.getModels(),
  getRerankModels: () => configService.getModels()
}