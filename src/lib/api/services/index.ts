/**
 * 服务统一导出
 */

export { KnowledgeBaseService, knowledgeBaseService } from './knowledge-base.service'
export { DocumentService, documentService } from './document.service'
export { ChatService, chatService } from './chat.service'
export { ConfigService, configService } from './config.service'

// 导入所有服务实例
import { knowledgeBaseService } from './knowledge-base.service'
import { documentService } from './document.service'
import { chatService } from './chat.service'
import { configService } from './config.service'

// 导出所有服务的统一实例
export const services = {
  knowledgeBase: knowledgeBaseService,
  document: documentService,
  chat: chatService,
  config: configService
} as const