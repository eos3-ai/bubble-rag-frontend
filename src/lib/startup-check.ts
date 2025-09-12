/**
 * 应用启动时的配置检查
 * 确保所有必要的环境变量都已正确设置
 */

import { getValidatedEnvConfig } from './env-config'

/**
 * 执行启动检查
 */
export function performStartupCheck(): void {
  console.log('🔍 正在执行启动检查...')
  
  try {
    // 验证环境变量配置
    const config = getValidatedEnvConfig()
    
    // 测试后端连接性（可选）
    if (config.NODE_ENV !== 'production') {
      console.log('📡 尝试连接后端服务...')
      testBackendConnection(config.API_BASE_URL)
    }
    
    console.log('✅ 启动检查完成')
    
  } catch (error) {
    console.error('❌ 启动检查失败:', error)
    process.exit(1)
  }
}

/**
 * 测试后端连接
 */
async function testBackendConnection(apiBaseUrl: string): Promise<void> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(`${apiBaseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      console.log('✅ 后端服务连接正常')
    } else {
      console.log(`⚠️  后端服务响应异常 (${response.status})`)
    }
  } catch (error) {
    console.log('⚠️  无法连接后端服务 (这在某些部署环境中是正常的)')
    console.log(`   后端地址: ${apiBaseUrl}`)
    console.log(`   错误信息: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 如果直接运行此文件，执行启动检查
if (require.main === module) {
  performStartupCheck()
}