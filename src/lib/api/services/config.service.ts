/**
 * 配置服务
 */

import { api } from '../client'
import { ENDPOINTS } from '../endpoints'
import type {
  SystemConfig,
  ModelOption,
  TestConnectionParams,
  TestConnectionResult,
  LLMConfig
} from '@/types'
import { ModelProvider } from '@/types'

export class ConfigService {
  // 获取系统配置
  async getConfig(): Promise<SystemConfig> {
    const response = await api.get(ENDPOINTS.CONFIG.GET)
    return response.data
  }

  // 更新系统配置
  async updateConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
    const response = await api.post(ENDPOINTS.CONFIG.UPDATE, config)
    return response.data
  }

  // 测试连接
  async testConnection(params: TestConnectionParams): Promise<TestConnectionResult> {
    const response = await api.post(ENDPOINTS.CONFIG.TEST, params)
    return response.data
  }

  // 获取可用模型列表
  async getModels(): Promise<ModelOption[]> {
    try {
      const response = await api.get(ENDPOINTS.CONFIG.MODELS)
      return response.data || []
    } catch {
      // 返回默认模型列表
      return this.getDefaultModels()
    }
  }

  // 获取默认模型列表
  private getDefaultModels(): ModelOption[] {
    return [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: ModelProvider.OPENAI,
        type: 'llm',
        description: 'OpenAI GPT-3.5 Turbo model',
        max_tokens: 4096,
        supports_streaming: true
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: ModelProvider.OPENAI,
        type: 'llm',
        description: 'OpenAI GPT-4 model',
        max_tokens: 8192,
        supports_streaming: true
      },
      {
        id: 'text-embedding-ada-002',
        name: 'Text Embedding Ada 002',
        provider: ModelProvider.OPENAI,
        type: 'embedding',
        description: 'OpenAI text embedding model'
      }
    ]
  }

  // 验证API配置
  async validateConfig(config: LLMConfig): Promise<boolean> {
    try {
      const result = await this.testConnection({ config })
      return result.success
    } catch {
      return false
    }
  }

  // 获取配置模板
  getConfigTemplate(): SystemConfig {
    return {
      llm: {
        provider: ModelProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        api_key: '',
        base_url: 'https://api.openai.com/v1',
        temperature: 0.7,
        max_tokens: 1000,
        timeout: 30000
      },
      embedding: {
        provider: ModelProvider.OPENAI,
        model: 'text-embedding-ada-002',
        api_key: '',
        base_url: 'https://api.openai.com/v1',
        dimensions: 1536,
        timeout: 30000
      },
      chunk_size: 1000,
      chunk_overlap: 200
    }
  }
}

// 创建服务实例
export const configService = new ConfigService()