/**
 * 聊天服务
 */

import { api } from '../client'
import { ENDPOINTS } from '../endpoints'
import type {
  ChatMessage,
  SendMessageParams,
  ChatSession,
  CreateSessionParams
} from '@/types'
import { MessageRole } from '@/types'

export class ChatService {
  // 发送消息 - 使用OpenAI兼容的聊天接口
  async sendMessage(params: SendMessageParams): Promise<ChatMessage> {
    // 构建OpenAI格式的消息历史
    const messages = [
      // 添加系统消息，使用自定义系统提示词或默认提示词
      {
        role: "system",
        content: params.system_prompt || `你是一个基于知识库的智能助手。请根据知识库"${params.kb_name}"中的内容来回答用户的问题。如果知识库中没有相关信息，请诚实地说明。`
      },
      // 添加历史消息
      ...(params.history || []).map(msg => ({
        role: msg.role === MessageRole.USER ? "user" : "assistant",
        content: msg.content
      })),
      // 添加当前用户消息
      {
        role: "user",
        content: params.message
      }
    ]

    const response = await api.post('/api/v1/chat/completions', {
      // model: "gpt-3.5-turbo", // 默认模型，后端会处理
      messages: messages,
      stream: true,
      temperature: params.temperature || 0.7,
      max_tokens: params.max_tokens || 2048,
      doc_knowledge_base_id: params.kb_name, // 添加doc_knowledge_base_id参数
      limit_result: 5 // 固定限制结果为5
    })
    
    return {
      id: Date.now().toString(),
      role: MessageRole.ASSISTANT,
      content: response.data.choices?.[0]?.message?.content || response.data.answer || '',
      timestamp: new Date().toISOString(),
      sources: response.data.sources || response.data.docs || []
    }
  }

  // 流式发送消息 - 使用OpenAI兼容的聊天接口
  async sendMessageStream(
    params: SendMessageParams & { 
      base_url?: string;
      api_key?: string;
      use_custom_config?: boolean;
    },
    onMessage: (chunk: string) => void,
    onComplete: (message: ChatMessage) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      // 构建OpenAI格式的消息历史
      const messages = [
        // 添加系统消息，使用自定义系统提示词或默认提示词
        {
          role: "system",
          content: params.system_prompt || `你是一个基于知识库的智能助手。请根据知识库"${params.kb_name}"中的内容来回答用户的问题。如果知识库中没有相关信息，请诚实地说明。`
        },
        // 添加历史消息
        ...(params.history || []).map(msg => ({
          role: msg.role === MessageRole.USER ? "user" : "assistant",
          content: msg.content
        })),
        // 添加当前用户消息
        {
          role: "user",
          content: params.message
        }
      ]

      // 始终使用代理API，让代理处理自定义配置
      const requestUrl = '/api/proxy/api/v1/chat/completions'
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
        'x-token': this.getToken() || ''
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          // model: "gpt-3.5-turbo",
          messages: messages,
          stream: true,
          temperature: params.temperature || 0.7,
          max_tokens: params.max_tokens || 2048,
          doc_knowledge_base_id: params.kb_name,
          limit_result: 5,
          // 直接传递自定义配置参数
          ...(params.use_custom_config && params.base_url && {
            base_url: params.base_url
          }),
          ...(params.use_custom_config && params.api_key && {
            api_key: params.api_key
          })
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      let fullContent = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.slice(6).trim()
              if (dataStr === '[DONE]') {
                break
              }
              const data = JSON.parse(dataStr)
              const content = data.choices?.[0]?.delta?.content
              if (content) {
                fullContent += content
                onMessage(content)
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      onComplete({
        id: Date.now().toString(),
        role: MessageRole.ASSISTANT,
        content: fullContent,
        timestamp: new Date().toISOString(),
        sources: []
      })
    } catch (error) {
      onError(error as Error)
    }
  }

  // 获取会话列表
  async getSessions(): Promise<ChatSession[]> {
    try {
      const response = await api.get(ENDPOINTS.CHAT.SESSIONS)
      return response.data || []
    } catch {
      // 如果API不存在，返回空数组
      return []
    }
  }

  // 创建会话
  async createSession(params: CreateSessionParams): Promise<ChatSession> {
    try {
      const response = await api.post(ENDPOINTS.CHAT.CREATE_SESSION, params)
      return response.data
    } catch {
      // 如果API不存在，创建本地会话
      return {
        id: Date.now().toString(),
        kb_name: params.kb_name,
        title: params.title || '新对话',
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  }

  // 删除会话
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await api.delete(`${ENDPOINTS.CHAT.DELETE_SESSION}/${sessionId}`)
    } catch {
      // 如果API不存在，忽略错误
    }
  }

  // 获取token
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || ''
    }
    return ''
  }
}

// 创建服务实例
export const chatService = new ChatService()