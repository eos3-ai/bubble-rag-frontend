/**
 * 知识库相关类型定义
 */

// 知识库基础信息
export interface KnowledgeBase {
  id?: string
  kb_name: string
  kb_desc?: string
  coll_name?: string
  create_time?: string
  update_time?: string
  created_at?: string
  updated_at?: string
  status?: number
  doc_count?: number
  total_size?: number
  rerank_model_id?: string
  embedding_model_id?: string
}

// 创建知识库参数
export interface CreateKnowledgeBaseParams {
  kb_name: string
  kb_desc: string
  rerank_model_id: string
  embedding_model_id: string
}

// 更新知识库参数
export interface UpdateKnowledgeBaseParams {
  kb_name: string
  kb_desc?: string
}

// 删除知识库参数
export interface DeleteKnowledgeBaseParams {
  kb_name: string
}

// 知识库列表查询参数
export interface KnowledgeBaseQueryParams {
  kb_name?: string
  page?: number
  page_num?: number
  page_size?: number
}

// 知识库统计信息
export interface KnowledgeBaseStats {
  total_kb: number
  total_docs: number
  total_size: number
  active_kb: number
}