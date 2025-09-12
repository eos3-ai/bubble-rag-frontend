/**
 * 聊天相关类型定义
 */

// 消息角色枚举
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

// 聊天消息
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  sources?: ChatSource[]
  metadata?: Record<string, any>
  thinking?: string // 思考内容
  hasThinking?: boolean // 是否包含思考过程
  isThinkingComplete?: boolean // 思考是否完成
}

// 消息来源
export interface ChatSource {
  doc_id: string
  doc_name: string
  content: string
  score: number
  page?: number
  chunk_index?: number
}

// 发送消息参数
export interface SendMessageParams {
  kb_name: string
  message: string
  history?: ChatMessage[]
  top_k?: number
  score_threshold?: number
  stream?: boolean
  temperature?: number
  max_tokens?: number
  system_prompt?: string
}

// 聊天会话
export interface ChatSession {
  id: string
  kb_name: string
  title?: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

// 创建会话参数
export interface CreateSessionParams {
  kb_name: string
  title?: string
}

// 聊天配置
export interface ChatConfig {
  model: string
  temperature?: number
  top_p?: number
  max_tokens?: number
  system_prompt?: string
}