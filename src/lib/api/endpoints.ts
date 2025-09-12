/**
 * API端点定义
 */

// 知识库相关端点
export const KNOWLEDGE_BASE_ENDPOINTS = {
  // 列表
  LIST: 'api/v1/knowledge_base/list_knowledge_base',
  // 创建
  CREATE: 'api/v1/knowledge_base/add_knowledge_base',
  // 更新
  UPDATE: 'api/v1/knowledge_base/update_knowledge_base',
  // 删除
  DELETE: 'api/v1/knowledge_base/delete_knowledge_base',
} as const

// 文档相关端点（根据request.md更新）
export const DOCUMENT_ENDPOINTS = {
  // 列表 - 语义检索接口（用于文字添加的文档）
  LIST: 'api/v1/documents/semantic_query',
  // 文档任务列表 - 用于文件上传的文档
  LIST_DOC_TASKS: 'api/v1/documents/list_doc_tasks',
  // 添加文档
  ADD: 'api/v1/documents/add_doc',
  // 编辑文档
  EDIT: 'api/v1/documents/edit_doc',
  // 删除文档
  DELETE: 'api/v1/documents/delete_doc',
  // 语义搜索
  SEMANTIC_QUERY: 'api/v1/documents/semantic_query',
  // 文件上传任务
  ADD_DOC_TASK: 'api/v1/documents/add_doc_task',
  
  // 保留旧的端点以防向后兼容
  UPLOAD: 'api/v1/knowledge_base/upload_document',
  UPDATE: 'api/v1/knowledge_base/update_document',
  SEARCH: 'api/v1/knowledge_base/search_documents',
} as const

// 聊天相关端点
export const CHAT_ENDPOINTS = {
  // 发送消息 - 使用OpenAI兼容的聊天接口
  COMPLETIONS: 'api/v1/chat/completions',
  // 发送消息 - 使用新的rag_chat接口（保留备用）
  SEND: 'api/v1/documents/rag_chat',
  // 会话列表
  SESSIONS: 'api/v1/chat/sessions',
  // 创建会话
  CREATE_SESSION: 'api/v1/chat/create_session',
  // 删除会话
  DELETE_SESSION: 'api/v1/chat/delete_session',
} as const

// 配置相关端点
export const CONFIG_ENDPOINTS = {
  // 获取配置
  GET: 'api/v1/config/get_config',
  // 更新配置
  UPDATE: 'api/v1/config/update_config',
  // 测试连接
  TEST: 'api/v1/config/test_config',
  // 获取模型列表
  MODELS: 'api/v1/config/models',
} as const

// 所有端点
export const ENDPOINTS = {
  KB: KNOWLEDGE_BASE_ENDPOINTS,
  DOC: DOCUMENT_ENDPOINTS,
  CHAT: CHAT_ENDPOINTS,
  CONFIG: CONFIG_ENDPOINTS,
} as const