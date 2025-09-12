/**
 * 配置相关类型定义
 */

// 模型提供商枚举
export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  AZURE = 'azure',
  LOCAL = 'local'
}

// LLM模型配置
export interface LLMConfig {
  provider: ModelProvider
  model: string
  api_key?: string
  base_url?: string
  temperature?: number
  max_tokens?: number
  timeout?: number
}

// 嵌入模型配置
export interface EmbeddingConfig {
  provider: ModelProvider
  model: string
  api_key?: string
  base_url?: string
  dimensions?: number
  timeout?: number
}

// 重排序模型配置
export interface RerankConfig {
  provider: ModelProvider
  model: string
  api_key?: string
  base_url?: string
  top_k?: number
  timeout?: number
}

// 系统配置
export interface SystemConfig {
  llm: LLMConfig
  embedding: EmbeddingConfig
  rerank?: RerankConfig
  chunk_size?: number
  chunk_overlap?: number
  vector_store?: VectorStoreConfig
}

// 向量存储配置
export interface VectorStoreConfig {
  type: 'faiss' | 'chroma' | 'qdrant' | 'milvus'
  host?: string
  port?: number
  collection_name?: string
  index_params?: Record<string, any>
}

// 模型列表项
export interface ModelOption {
  id: string
  name: string
  provider: ModelProvider
  type: 'llm' | 'embedding' | 'rerank'
  description?: string
  max_tokens?: number
  supports_streaming?: boolean
}

// 测试连接参数
export interface TestConnectionParams {
  config: LLMConfig | EmbeddingConfig | RerankConfig
  test_prompt?: string
}

// 测试连接结果
export interface TestConnectionResult {
  success: boolean
  message: string
  latency?: number
  error?: string
}