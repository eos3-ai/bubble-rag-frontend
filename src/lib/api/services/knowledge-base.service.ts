/**
 * 知识库服务
 */

import { api } from '../client'
import { ENDPOINTS } from '../endpoints'
import type {
  KnowledgeBase,
  CreateKnowledgeBaseParams,
  UpdateKnowledgeBaseParams,
  DeleteKnowledgeBaseParams,
  KnowledgeBaseQueryParams,
  PaginatedResponse
} from '@/types'

export class KnowledgeBaseService {
  // 获取知识库列表
  async list(params?: KnowledgeBaseQueryParams): Promise<PaginatedResponse<KnowledgeBase>> {
    const response = await api.post(ENDPOINTS.KB.LIST, {
      kb_name: params?.kb_name || '', // 查询全部时传空字符串
      page_size: params?.page_size || 10,
      page_num: params?.page_num || params?.page || 1
    })
    
    // 返回完整的分页响应
    return response.data || {
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
      total_pages: 0
    }
  }

  // 创建知识库
  async create(params: CreateKnowledgeBaseParams): Promise<KnowledgeBase> {
    const requestData = {
      kb_name: params.kb_name,
      kb_desc: params.kb_desc,
      rerank_model_id: params.rerank_model_id,
      embedding_model_id: params.embedding_model_id,
    }
    
    const response = await api.post(ENDPOINTS.KB.CREATE, requestData)
    
    return response.data
  }

  // 更新知识库
  async update(params: UpdateKnowledgeBaseParams): Promise<KnowledgeBase> {
    const response = await api.post(ENDPOINTS.KB.UPDATE, {
      kb_name: params.kb_name,
      kb_desc: params.kb_desc
    })
    
    return response.data
  }

  // 删除知识库
  async delete(params: DeleteKnowledgeBaseParams): Promise<void> {
    // 根据request.md，删除接口使用kb_id而不是kb_name
    await api.post(ENDPOINTS.KB.DELETE, {
      kb_id: params.kb_name // 这里需要传递实际的ID
    })
  }

  // 检查知识库是否存在
  async exists(kbName: string): Promise<boolean> {
    try {
      const response = await this.list({ kb_name: kbName })
      return response.items.some(kb => kb.kb_name === kbName)
    } catch {
      return false
    }
  }

  // 获取知识库详情
  async getDetail(kbName: string): Promise<KnowledgeBase | null> {
    try {
      const response = await this.list({ kb_name: kbName })
      return response.items.find(kb => kb.kb_name === kbName) || null
    } catch {
      return null
    }
  }
}

// 创建服务实例
export const knowledgeBaseService = new KnowledgeBaseService()