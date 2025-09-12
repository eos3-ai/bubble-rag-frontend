"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { ChatMessage, KnowledgeBase, MessageRole } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Send, Bot, User, FileText, Settings } from "lucide-react"
import { knowledgeBaseAPI } from "@/lib/api"
import { chatService } from "@/lib/api/services"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const knowledgeBaseId = params.id as string
  const { toast } = useToast()

  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSearchingDocs, setIsSearchingDocs] = useState(false) // 文档检索状态
  const [currentThinking, setCurrentThinking] = useState("") // 当前思考内容
  const [currentAnswer, setCurrentAnswer] = useState("") // 当前回答内容
  const [hasThinkTag, setHasThinkTag] = useState(false) // 是否包含think标签
  const [isThinkingComplete, setIsThinkingComplete] = useState(false) // 思考是否完成
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 模型配置相关状态
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  
  // 聊天参数配置
  const [chatConfig, setChatConfig] = useState({
    temperature: 0.5,
    max_tokens: 2048,
    base_url: "",
    api_key: "",
    use_custom_config: false,
    system_prompt: ""
  })
  

  // 加载知识库信息和聊天配置
  useEffect(() => {
    loadKnowledgeBase()
    loadChatConfig()
  }, [knowledgeBaseId])

  // 从localStorage加载聊天配置
  const loadChatConfig = () => {
    try {
      const savedConfig = localStorage.getItem(`chatConfig_${knowledgeBaseId}`)
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        setChatConfig({
          temperature: config.temperature || 0.5,
          max_tokens: config.max_tokens || 2048,
          base_url: config.base_url || "",
          api_key: config.api_key || "",
          use_custom_config: config.use_custom_config || false,
          system_prompt: config.system_prompt || ""
        })
      }
    } catch (error) {
      console.error("加载聊天配置失败:", error)
    }
  }

  // 保存聊天配置到localStorage
  const saveChatConfig = () => {
    try {
      localStorage.setItem(`chatConfig_${knowledgeBaseId}`, JSON.stringify(chatConfig))
    } catch (error) {
      console.error("保存聊天配置失败:", error)
    }
  }

  const loadKnowledgeBase = async () => {
    try {
      const response = await knowledgeBaseAPI.getAll({ kb_name: "", page_size: 100, page_num: 1 })
      if (response.code === 200) {
        const kb = response.data.items.find(kb => kb.id === knowledgeBaseId)
        if (kb) {
          setKnowledgeBase(kb)
        } else {
          router.push("/")
        }
      } else {
        console.error("加载知识库失败:", response.msg)
      }
    } catch (error) {
      console.error("加载知识库失败:", error)
    }
  }

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    scrollToBottom()
  }, [loading, isSearchingDocs, currentThinking, currentAnswer])

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading || isSearchingDocs) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      content: inputMessage,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    const currentMessage = inputMessage
    setInputMessage("")
    setIsSearchingDocs(true) // 先显示文档检索状态
    // 重置状态
    setCurrentThinking("")
    setCurrentAnswer("")
    setHasThinkTag(false)
    setIsThinkingComplete(false)

    // 立即滚动到底部，显示用户刚发送的消息
    setTimeout(() => scrollToBottom(), 100)

    // 准备助手消息ID，但不立即创建消息
    const assistantMessageId = (Date.now() + 1).toString()
    let assistantMessageCreated = false
    let fullContent = "" // 存储完整内容
    let tempThinking = "" // 临时思考内容
    let tempAnswer = "" // 临时回答内容
    let isInsideThink = false // 是否在think标签内
    let searchingTimeout: NodeJS.Timeout | null = null // 保存定时器引用

    try {
      // 模拟文档检索过程，2秒后切换到AI思考状态
      searchingTimeout = setTimeout(() => {
        setIsSearchingDocs(false)
        setLoading(true)
      }, 2000)

      await chatService.sendMessageStream(
        {
          kb_name: knowledgeBaseId,
          message: currentMessage,
          history: messages,
          temperature: chatConfig.temperature,
          max_tokens: chatConfig.max_tokens,
          system_prompt: chatConfig.system_prompt,
          use_custom_config: chatConfig.use_custom_config,
          ...(chatConfig.use_custom_config && {
            base_url: chatConfig.base_url,
            api_key: chatConfig.api_key
          })
        },
        // onMessage: 处理每个流式数据块
        (chunk: string) => {
          // 将新内容添加到完整内容中
          fullContent += chunk
          
          // 解析chunk，分别处理think内外的内容
          let remainingChunk = chunk
          
          while (remainingChunk.length > 0) {
            if (!isInsideThink) {
              // 不在think标签内，寻找<think>标签
              const thinkStartIndex = remainingChunk.indexOf('<think>')
              
              if (thinkStartIndex === -1) {
                // 没有找到<think>标签，全部添加到回答内容
                tempAnswer += remainingChunk
                setCurrentAnswer(tempAnswer)
                break
              } else {
                // 找到<think>标签
                if (thinkStartIndex > 0) {
                  // 将<think>之前的内容添加到回答内容
                  tempAnswer += remainingChunk.substring(0, thinkStartIndex)
                  setCurrentAnswer(tempAnswer)
                }
                // 进入think模式
                isInsideThink = true
                setHasThinkTag(true)
                // 同时更新消息的hasThinking标记
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, hasThinking: true }
                    : msg
                ))
                remainingChunk = remainingChunk.substring(thinkStartIndex + 7) // 跳过'<think>'
              }
            } else {
              // 在think标签内，寻找</think>标签
              const thinkEndIndex = remainingChunk.indexOf('</think>')
              
              if (thinkEndIndex === -1) {
                // 没有找到</think>标签，全部添加到思考内容
                tempThinking += remainingChunk
                setCurrentThinking(tempThinking)
                // 同时更新消息的thinking字段
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, thinking: tempThinking }
                    : msg
                ))
                break
              } else {
                // 找到</think>标签
                if (thinkEndIndex > 0) {
                  // 将</think>之前的内容添加到思考内容
                  tempThinking += remainingChunk.substring(0, thinkEndIndex)
                  setCurrentThinking(tempThinking)
                }
                // 同时更新消息的thinking字段
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, thinking: tempThinking }
                    : msg
                ))
                // 退出think模式
                isInsideThink = false
                remainingChunk = remainingChunk.substring(thinkEndIndex + 8) // 跳过'</think>'
              }
            }
          }
          
          // 如果还没有创建助手消息，先创建一个空消息
          if (!assistantMessageCreated) {
            assistantMessageCreated = true
            
            // 清除搜索定时器，避免重复显示"思考中"
            if (searchingTimeout) {
              clearTimeout(searchingTimeout)
              searchingTimeout = null
            }
            
            setIsSearchingDocs(false) // 关闭文档检索状态
            setLoading(false) // 立即关闭 loading 状态
            
            const assistantMessage: ChatMessage = {
              id: assistantMessageId,
              role: MessageRole.ASSISTANT,
              content: "", // 内容将通过状态更新，而不是直接设置
              timestamp: new Date().toISOString(),
              sources: [],
              thinking: "", // 添加思考内容字段
              hasThinking: false, // 添加是否有思考标记
              isThinkingComplete: false // 添加思考完成标记
            }
            setMessages(prev => [...prev, assistantMessage])
          }
        },
        // onComplete: 处理流式完成
        () => {
          // 标记思考完成
          setIsThinkingComplete(true)
          
          // 过滤掉<think>标签，只保存答案内容
          const cleanContent = fullContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
          
          // 清理状态，将最终内容保存到消息中，同时标记思考完成
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: cleanContent, isThinkingComplete: true }
              : msg
          ))
          
          // 不清理思考相关状态，保持显示
          // 只在新消息开始时才清理这些状态
        },
        // onError: 处理错误
        (error: Error) => {
          console.error("发送消息失败:", error)
          
          // 清理所有定时器
          if (searchingTimeout) {
            clearTimeout(searchingTimeout)
            searchingTimeout = null
          }
          
          // 无论何时出错都立即关闭所有状态
          setIsSearchingDocs(false)
          setLoading(false)
          setCurrentThinking("")
          setCurrentAnswer("")
          setHasThinkTag(false)
          setIsThinkingComplete(false)
          
          setMessages(prev => {
            // 如果还没有创建助手消息，先创建一个错误消息
            if (!assistantMessageCreated) {
              assistantMessageCreated = true
              const errorMessage: ChatMessage = {
                id: assistantMessageId,
                role: MessageRole.ASSISTANT,
                content: "抱歉，发送消息时出现了错误。请稍后重试。",
                timestamp: new Date().toISOString(),
                sources: [],
              }
              return [...prev, errorMessage]
            } else {
              // 更新现有的助手消息为错误内容
              return prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: "抱歉，发送消息时出现了错误。请稍后重试。" }
                  : msg
              )
            }
          })
        }
      )
    } catch (error) {
      console.error("发送消息失败:", error)
      
      // 清理所有定时器
      if (searchingTimeout) {
        clearTimeout(searchingTimeout)
        searchingTimeout = null
      }
      
      // 无论何时出错都立即关闭所有状态
      setIsSearchingDocs(false)
      setLoading(false)
      setCurrentThinking("")
      setCurrentAnswer("")
      setHasThinkTag(false)
      setIsThinkingComplete(false)
      
      setMessages(prev => {
        // 如果还没有创建助手消息，先创建一个错误消息
        if (!assistantMessageCreated) {
          const errorMessage: ChatMessage = {
            id: assistantMessageId,
            role: MessageRole.ASSISTANT,
            content: "抱歉，发送消息时出现了错误。请稍后重试。",
            timestamp: new Date().toISOString(),
            sources: [],
          }
          return [...prev, errorMessage]
        } else {
          // 更新现有的助手消息为错误内容
          return prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: "抱歉，发送消息时出现了错误。请稍后重试。" }
              : msg
          )
        }
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-100">
      {/* 主聊天区域 */}
      <div className="h-full flex flex-col">
        {/* 头部 */}
        <div className="bg-white/70 backdrop-blur-md border-b border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="hover:bg-purple-50 transition-colors duration-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回知识库列表
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  智能问答 - {knowledgeBase?.kb_name}
                </h1>
                <p className="text-gray-500 mt-1">{knowledgeBase?.kb_desc || "暂无描述"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConfigDialog(true)}
                className="hover:bg-purple-50"
              >
                <Settings className="mr-2 h-4 w-4" />
                模型配置
              </Button>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                已连接
              </Badge>
            </div>
          </div>
        </div>

        {/* 消息区域 */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Bot className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  准备好开始对话了！
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  我是基于您的知识库训练的智能助手，随时为您解答问题
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                // 检查是否是最后一条消息且是助手消息，并且有流式内容
                const isCurrentStreaming = index === messages.length - 1 && 
                                           message.role === "assistant" && 
                                           (hasThinkTag || currentAnswer || currentThinking)
                
                // 检查是否有思考内容（当前流式或已保存的）
                const hasThinkContent = message.hasThinking || (isCurrentStreaming && hasThinkTag)
                const thinkingContent = isCurrentStreaming ? currentThinking : message.thinking
                const answerContent = isCurrentStreaming ? currentAnswer : ""
                const isComplete = message.isThinkingComplete || isThinkingComplete
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex gap-4 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`rounded-full flex items-center justify-center shadow-md ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                            : "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                        }`}
                        style={{width: '56px !important', height: '56px !important', minWidth: '56px', minHeight: '56px', maxWidth: '56px', maxHeight: '56px'}}
                      >
                        {message.role === "user" ? (
                          <User className="h-6 w-6" />
                        ) : (
                          <Bot className="h-6 w-6" />
                        )}
                      </div>
                      <div
                        className={`relative rounded-2xl shadow-sm ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-md p-4"
                            : "bg-white/90 backdrop-blur-sm border border-white/20 text-gray-800 rounded-bl-md"
                        }`}
                      >
                        {(isCurrentStreaming || hasThinkContent) ? (
                          // 流式内容显示：三块内容
                          <div>
                            {hasThinkContent && (
                              <>
                                {/* 思考状态 */}
                                <div className="p-4 border-b border-gray-200">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex space-x-1">
                                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-100"></div>
                                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-200"></div>
                                    </div>
                                    <span className="text-sm text-gray-600 font-medium">
                                      {isComplete ? "思考" : "思考中"}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* 思考内容 */}
                                {thinkingContent && (
                                  <div className="p-4 bg-purple-50/80 border-b border-gray-200">
                                    <div className="text-sm text-purple-800 whitespace-pre-wrap leading-relaxed">
                                      {thinkingContent}
                                      {!isComplete && (
                                        <span className="inline-block w-2 h-4 bg-purple-400 ml-1 animate-pulse"></span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {/* 回答内容 */}
                            {(answerContent || message.content || (!hasThinkContent && isCurrentStreaming)) && (
                              <div className={hasThinkContent ? "p-4" : "p-4"}>
                                <ReactMarkdown 
                                  components={{
                                    p: ({ children }) => <p className="leading-relaxed mb-2 last:mb-0">{children}</p>,
                                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                    em: ({ children }) => <em className="italic">{children}</em>,
                                  }}
                                >
                                  {answerContent || message.content}
                                </ReactMarkdown>
                                {!isComplete && isCurrentStreaming && (
                                  <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          // 普通消息显示
                          <div className="p-4">
                            <ReactMarkdown 
                              components={{
                                p: ({ children }) => <p className="leading-relaxed mb-2 last:mb-0">{children}</p>,
                                h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
                                li: ({ children }) => <li>{children}</li>,
                                code: ({ children }) => (
                                  <code className={`px-1 py-0.5 rounded text-sm font-mono ${
                                    message.role === "user" 
                                      ? "bg-white/20 text-purple-100" 
                                      : "bg-gray-100 text-gray-800"
                                  }`}>
                                    {children}
                                  </code>
                                ),
                                pre: ({ children }) => (
                                  <pre className={`p-3 rounded-lg overflow-x-auto mb-2 ${
                                    message.role === "user" 
                                      ? "bg-white/10 text-white border border-white/20" 
                                      : "bg-gray-100 text-gray-800 border border-gray-200"
                                  }`}>
                                    {children}
                                  </pre>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className={`border-l-4 pl-4 italic mb-2 ${
                                    message.role === "user" 
                                      ? "border-white/30 text-purple-100" 
                                      : "border-gray-300 text-gray-700"
                                  }`}>
                                    {children}
                                  </blockquote>
                                ),
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                a: ({ href, children }) => (
                                  <a 
                                    href={href} 
                                    className={`hover:underline ${
                                      message.role === "user" 
                                        ? "text-purple-100 hover:text-white" 
                                        : "text-blue-600 hover:text-blue-800"
                                    }`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                  >
                                    {children}
                                  </a>
                                )
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                            {message.sources && message.sources.length > 0 && (
                              <div className={`mt-4 pt-3 border-t text-xs ${
                                message.role === "user" ? "border-white/30" : "border-gray-200"
                              }`}>
                                <div className={`flex items-center gap-2 mb-2 ${
                                  message.role === "user" ? "text-purple-100" : "text-gray-600"
                                }`}>
                                  <FileText className="h-3 w-3" />
                                  <span>参考来源</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {message.sources.map((source, index) => (
                                    <Badge 
                                      key={index} 
                                      variant="secondary"
                                      className={`text-xs ${
                                        message.role === "user" 
                                          ? "bg-white/20 text-white border-white/30" 
                                          : "bg-gray-100 text-gray-700 border-gray-200"
                                      }`}
                                    >
                                      {typeof source === 'string' ? source : source.doc_name || source.content?.substring(0, 50) + '...'}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            {isSearchingDocs && (
              <div className="flex gap-4">
                <div className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-md" style={{width: '56px !important', height: '56px !important', minWidth: '56px', minHeight: '56px', maxWidth: '56px', maxHeight: '56px'}}>
                  <FileText className="h-6 w-6" />
                </div>
                <div className="bg-white/90 backdrop-blur-sm border border-white/20 text-gray-800 rounded-2xl rounded-bl-md p-4 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-sm text-gray-600">正在检索相关文档...</span>
                  </div>
                </div>
              </div>
            )}
            {loading && (
              <div className="flex gap-4">
                <div className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white flex items-center justify-center shadow-md" style={{width: '56px !important', height: '56px !important', minWidth: '56px', minHeight: '56px', maxWidth: '56px', maxHeight: '56px'}}>
                  <Bot className="h-6 w-6" />
                </div>
                <div className="bg-white/90 backdrop-blur-sm border border-white/20 text-gray-800 rounded-2xl rounded-bl-md p-4 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-sm text-gray-600">AI正在思考中...</span>
                  </div>
                </div>
              </div>
            )}
            {/* 滚动到底部的锚点 */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* 输入区域 */}
        <div className="bg-white/70 backdrop-blur-md border-t border-white/20 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm p-2 focus-within:shadow-lg focus-within:border-purple-400/60 focus-within:bg-white/95 transition-all duration-300">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="输入您的问题，我会基于知识库为您解答..."
                onKeyPress={handleKeyPress}
                disabled={loading || isSearchingDocs}
                className="flex-1 border-0 bg-transparent focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-500"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!inputMessage.trim() || loading || isSearchingDocs}
                className="h-10 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                发送
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">
              按 Enter 发送消息，基于您的知识库内容提供准确回答
            </p>
          </div>
        </div>
      </div>

      {/* 模型配置对话框 */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] bg-white/95 backdrop-blur-md border-white/20 shadow-2xl flex flex-col">
          <DialogHeader className="text-center pb-2 flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              模型配置
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              配置您的AI模型参数，获得更好的对话体验
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-8 py-4">
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  Temperature: {chatConfig.temperature}
                </Label>
                <div className="space-y-3">
                  <Slider
                    value={[chatConfig.temperature]}
                    onValueChange={(value) => setChatConfig({...chatConfig, temperature: value[0]})}
                    max={2}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={chatConfig.temperature}
                    onChange={(e) => setChatConfig({...chatConfig, temperature: parseFloat(e.target.value) || 0})}
                    placeholder="0.5"
                    className="h-10 bg-white/80 border border-gray-200/60 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-200/50 focus:shadow-md transition-all duration-300 outline-none rounded-lg"
                  />
                </div>
                <p className="text-xs text-gray-500">控制回答的随机性和创造性。值越高，回答越随机；值越低，回答越确定。</p>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                  Max Tokens: {chatConfig.max_tokens}
                </Label>
                <div className="space-y-3">
                  <Slider
                    value={[chatConfig.max_tokens]}
                    onValueChange={(value) => setChatConfig({...chatConfig, max_tokens: value[0]})}
                    max={4096}
                    min={0}
                    step={64}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="4096"
                    step="64"
                    value={chatConfig.max_tokens}
                    onChange={(e) => setChatConfig({...chatConfig, max_tokens: parseInt(e.target.value) || 0})}
                    placeholder="2048"
                    className="h-10 bg-white/80 border border-gray-200/60 focus:border-pink-500 focus:ring-1 focus:ring-pink-200/50 focus:shadow-md transition-all duration-300 outline-none rounded-lg"
                  />
                </div>
                <p className="text-xs text-gray-500">限制AI回答的最大长度。设置为0表示使用模型默认值。</p>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  系统提示词
                </Label>
                <div className="space-y-3">
                  <Textarea
                    value={chatConfig.system_prompt}
                    onChange={(e) => setChatConfig({...chatConfig, system_prompt: e.target.value})}
                    placeholder="请输入系统提示词，例如：你是一个专业的AI助手，请根据提供的知识库内容回答问题..."
                    rows={4}
                    className="resize-none bg-white/80 border border-gray-200/60 focus:border-green-500 focus:ring-1 focus:ring-green-200/50 focus:shadow-md transition-all duration-300 outline-none rounded-lg"
                  />
                </div>
                <p className="text-xs text-gray-500">系统提示词将作为对话的背景指令，指导AI的回答风格和行为。</p>
              </div>
            </div>

            {/* 自定义模型配置 */}
            <div className="space-y-6 border-t border-gray-200/60 pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    自定义模型配置
                  </Label>
                  <p className="text-xs text-gray-500">启用后将使用您自定义的API配置进行对话</p>
                </div>
                <Switch
                  checked={chatConfig.use_custom_config}
                  onCheckedChange={(checked) => setChatConfig({...chatConfig, use_custom_config: checked})}
                  className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-300"
                />
              </div>

              {chatConfig.use_custom_config && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Base URL <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={chatConfig.base_url}
                      onChange={(e) => setChatConfig({...chatConfig, base_url: e.target.value})}
                      placeholder="https://api.openai.com/v1"
                      className="h-10 bg-white/80 border border-gray-200/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-200/50 focus:shadow-md transition-all duration-300 outline-none rounded-lg"
                    />
                    <p className="text-xs text-gray-500">API服务的基础URL地址</p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      API Key <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="password"
                      value={chatConfig.api_key}
                      onChange={(e) => setChatConfig({...chatConfig, api_key: e.target.value})}
                      placeholder="sk-..."
                      className="h-10 bg-white/80 border border-gray-200/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-200/50 focus:shadow-md transition-all duration-300 outline-none rounded-lg"
                    />
                    <p className="text-xs text-gray-500">您的API访问密钥</p>
                  </div>
                </div>
              )}
            </div>

          </div>

          <DialogFooter className="flex gap-3 pt-4 flex-shrink-0 border-t border-gray-200/60">
            <Button 
              variant="outline"
              onClick={() => setShowConfigDialog(false)}
              className="flex-1 h-12 border-gray-200 hover:bg-gray-50 transition-all duration-200"
            >
              取消
            </Button>
            <Button
              onClick={() => {
                // 验证自定义配置
                if (chatConfig.use_custom_config) {
                  if (!chatConfig.base_url.trim() || !chatConfig.api_key.trim()) {
                    toast({
                      variant: "destructive",
                      title: "配置错误",
                      description: "启用自定义配置时，Base URL 和 API Key 为必填项",
                    })
                    return
                  }
                }
                
                saveChatConfig()
                setShowConfigDialog(false)
                toast({
                  title: "配置已保存",
                  description: chatConfig.use_custom_config 
                    ? "自定义模型配置已保存，将在下次对话中生效" 
                    : "模型参数已更新，将在下次对话中生效",
                })
              }}
              className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 text-white"
            >
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}