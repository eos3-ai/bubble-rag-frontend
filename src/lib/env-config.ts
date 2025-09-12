/**
 * 环境变量配置管理
 * 统一管理所有环境变量的读取和验证
 */

// 环境变量类型定义
interface EnvironmentConfig {
  // 后端服务配置
  API_BASE_URL: string
  TRAINING_API_BASE_URL: string  // 专用于训练相关API (12410端口)
  DEFAULT_TOKEN: string
  API_TIMEOUT: number
  ENABLE_API_LOGS: boolean
  
  // 应用配置
  NODE_ENV: string
  PORT: number
  
  // 前端API配置
  NEXT_PUBLIC_API_URL: string
}

// 默认配置
const defaultConfig: EnvironmentConfig = {
  API_BASE_URL: 'http://localhost:8000',
  TRAINING_API_BASE_URL: 'http://localhost:8001',
  DEFAULT_TOKEN: '',
  API_TIMEOUT: 30000,
  ENABLE_API_LOGS: false,
  NODE_ENV: 'development',
  PORT: 3000,
  NEXT_PUBLIC_API_URL: '/api/proxy'
}

/**
 * 安全地解析整数环境变量
 */
function parseIntSafe(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * 解析布尔值环境变量
 */
function parseBooleanSafe(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue
  return value.toLowerCase() === 'true'
}

/**
 * 获取环境变量配置
 */
export function getEnvConfig(): EnvironmentConfig {
  return {
    API_BASE_URL: process.env.API_BASE_URL || defaultConfig.API_BASE_URL,
    TRAINING_API_BASE_URL: process.env.TRAINING_API_BASE_URL || defaultConfig.TRAINING_API_BASE_URL,
    DEFAULT_TOKEN: process.env.DEFAULT_TOKEN || defaultConfig.DEFAULT_TOKEN,
    API_TIMEOUT: parseIntSafe(process.env.API_TIMEOUT, defaultConfig.API_TIMEOUT),
    ENABLE_API_LOGS: parseBooleanSafe(process.env.ENABLE_API_LOGS, defaultConfig.ENABLE_API_LOGS),
    NODE_ENV: process.env.NODE_ENV || defaultConfig.NODE_ENV,
    PORT: parseIntSafe(process.env.PORT, defaultConfig.PORT),
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || defaultConfig.NEXT_PUBLIC_API_URL
  }
}

/**
 * 验证必需的环境变量
 */
export function validateEnvConfig(config: EnvironmentConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // 验证API_BASE_URL格式
  try {
    new URL(config.API_BASE_URL)
  } catch {
    errors.push(`API_BASE_URL 格式无效: ${config.API_BASE_URL}`)
  }
  
  // 验证TRAINING_API_BASE_URL格式
  try {
    new URL(config.TRAINING_API_BASE_URL)
  } catch {
    errors.push(`TRAINING_API_BASE_URL 格式无效: ${config.TRAINING_API_BASE_URL}`)
  }
  
  // 验证超时时间
  if (config.API_TIMEOUT <= 0) {
    errors.push(`API_TIMEOUT 必须大于0: ${config.API_TIMEOUT}`)
  }
  
  // 验证端口号
  if (config.PORT <= 0 || config.PORT > 65535) {
    errors.push(`PORT 必须在1-65535范围内: ${config.PORT}`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 打印配置信息（开发环境用）
 */
export function logEnvConfig(config: EnvironmentConfig): void {
  if (config.NODE_ENV === 'production') {
    console.log('🚀 应用已启动')
    console.log(`   后端服务: ${config.API_BASE_URL}`)
    console.log(`   训练服务: ${config.TRAINING_API_BASE_URL}`)
    console.log(`   监听端口: ${config.PORT}`)
  } else {
    console.log('🔧 环境变量配置:')
    console.log(`   NODE_ENV: ${config.NODE_ENV}`)
    console.log(`   API_BASE_URL: ${config.API_BASE_URL}`)
    console.log(`   TRAINING_API_BASE_URL: ${config.TRAINING_API_BASE_URL}`)
    console.log(`   DEFAULT_TOKEN: ${config.DEFAULT_TOKEN ? '***已设置***' : '未设置'}`)
    console.log(`   API_TIMEOUT: ${config.API_TIMEOUT}ms`)
    console.log(`   ENABLE_API_LOGS: ${config.ENABLE_API_LOGS}`)
    console.log(`   PORT: ${config.PORT}`)
    console.log(`   NEXT_PUBLIC_API_URL: ${config.NEXT_PUBLIC_API_URL}`)
  }
}

/**
 * 获取并验证配置
 */
export function getValidatedEnvConfig(): EnvironmentConfig {
  const config = getEnvConfig()
  const validation = validateEnvConfig(config)
  
  if (!validation.valid) {
    console.error('❌ 环境变量配置错误:')
    validation.errors.forEach(error => console.error(`   - ${error}`))
    process.exit(1)
  }
  
  // 打印配置信息
  logEnvConfig(config)
  
  return config
}

// 导出单例配置
export const envConfig = getEnvConfig()