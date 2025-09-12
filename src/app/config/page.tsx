"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LLMConfig, ModelProvider, SystemConfig } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, TestTube2, ArrowLeft, CheckCircle, XCircle } from "lucide-react"
import { configAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function ConfigPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [config, setConfig] = useState<LLMConfig>({
    provider: ModelProvider.OPENAI,
    api_key: "",
    base_url: "https://api.openai.com/v1",
    model: "",
  })
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await configAPI.getConfig()
      if (response.code === 200) {
        setConfig(response.data.llm)
      }
    } catch (error) {
      console.error("加载配置失败:", error)
      toast({
        variant: "destructive",
        title: "错误",
        description: "加载配置失败",
      })
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const response = await configAPI.updateConfig({ llm: config })
      if (response.code === 200) {
        setTestResult({
          success: true,
          message: "配置已保存",
        })
        toast({
          variant: "success",
          title: "成功",
          description: "配置保存成功",
        })
      } else {
        throw new Error(response.msg || "保存失败")
      }
    } catch (error) {
      console.error("保存配置失败:", error)
      setTestResult({
        success: false,
        message: "保存配置失败",
      })
      toast({
        variant: "destructive",
        title: "错误",
        description: "保存配置失败",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    try {
      setTesting(true)
      const result = await configAPI.testConfig(config)
      if (result.code === 200 && result.data.success) {
        setTestResult({
          success: true,
          message: result.data.message || "连接测试成功",
        })
        toast({
          variant: "success",
          title: "测试成功",
          description: "API连接正常",
        })
      } else {
        setTestResult({
          success: false,
          message: result.data.message || "连接测试失败",
        })
        toast({
          variant: "destructive",
          title: "测试失败",
          description: result.data.message || "API连接失败",
        })
      }
    } catch (error) {
      console.error("测试连接失败:", error)
      setTestResult({
        success: false,
        message: "测试失败，请检查配置",
      })
      toast({
        variant: "destructive",
        title: "测试失败",
        description: "请检查API配置和网络连接",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleChange = (field: keyof LLMConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }))
    setTestResult(null)
  }

  const getModelsForProvider = (provider: ModelProvider) => {
    switch (provider) {
      case ModelProvider.OPENAI:
        return [
          { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", tier: "标准" },
          { value: "gpt-3.5-turbo-16k", label: "GPT-3.5 Turbo 16K", tier: "标准" },
          { value: "gpt-4", label: "GPT-4", tier: "高级" },
          { value: "gpt-4-32k", label: "GPT-4 32K", tier: "高级" },
          { value: "gpt-4o", label: "GPT-4o", tier: "最新" },
          { value: "gpt-4o-mini", label: "GPT-4o Mini", tier: "最新" },
        ]
      case ModelProvider.ANTHROPIC:
        return [
          { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku", tier: "快速" },
          { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet", tier: "平衡" },
          { value: "claude-3-opus-20240229", label: "Claude 3 Opus", tier: "高级" },
          { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", tier: "最新" },
        ]
      case ModelProvider.AZURE:
        return [
          { value: "gpt-35-turbo", label: "GPT-3.5 Turbo", tier: "标准" },
          { value: "gpt-4", label: "GPT-4", tier: "高级" },
          { value: "gpt-4-32k", label: "GPT-4 32K", tier: "高级" },
          { value: "gpt-4o", label: "GPT-4o", tier: "最新" },
        ]
      case ModelProvider.LOCAL:
        return [
          { value: "llama2-7b", label: "Llama 2 7B", tier: "本地" },
          { value: "llama2-13b", label: "Llama 2 13B", tier: "本地" },
          { value: "mixtral-8x7b", label: "Mixtral 8x7B", tier: "本地" },
          { value: "qwen-7b", label: "Qwen 7B", tier: "本地" },
        ]
      default:
        return []
    }
  }

  const currentModels = getModelsForProvider(config.provider)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">模型配置</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>AI模型配置</CardTitle>
            <CardDescription>
              配置您的AI模型参数，支持OpenAI API兼容的接口
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                <div className="flex items-center">
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mr-2" />
                  )}
                  <AlertDescription>{testResult.message}</AlertDescription>
                </div>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="api_key">API密钥 *</Label>
              <div className="relative">
                <Input
                  id="api_key"
                  type={showApiKey ? "text" : "password"}
                  value={config.api_key}
                  onChange={(e) => handleChange("api_key", e.target.value)}
                  placeholder="sk-..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? "隐藏" : "显示"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                您的API密钥将安全存储在浏览器本地存储中
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">模型供应商 *</Label>
              <Select
                value={config.provider}
                onValueChange={(value) => handleChange("provider", value as ModelProvider)}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="请选择模型供应商..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    支持的供应商
                  </div>
                  <SelectItem value={ModelProvider.OPENAI}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">OpenAI</span>
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">官方</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={ModelProvider.AZURE}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">Azure OpenAI</span>
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">企业</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={ModelProvider.ANTHROPIC}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">Anthropic Claude</span>
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">Claude</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={ModelProvider.LOCAL}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">本地部署</span>
                      <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full">自托管</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                选择您要使用的AI模型供应商
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_url">Base URL *</Label>
              <Input
                id="base_url"
                type="url"
                value={config.base_url}
                onChange={(e) => handleChange("base_url", e.target.value)}
                placeholder={
                  config.provider === ModelProvider.OPENAI ? "https://api.openai.com/v1" :
                  config.provider === ModelProvider.AZURE ? "https://your-resource.openai.azure.com" :
                  config.provider === ModelProvider.ANTHROPIC ? "https://api.anthropic.com" :
                  "http://localhost:8000/v1"
                }
              />
              <p className="text-sm text-muted-foreground">
                {config.provider === ModelProvider.OPENAI && "OpenAI官方API地址"}
                {config.provider === ModelProvider.AZURE && "Azure OpenAI资源端点地址"}
                {config.provider === ModelProvider.ANTHROPIC && "Anthropic API地址"}
                {config.provider === ModelProvider.LOCAL && "本地模型服务地址"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">模型 *</Label>
              <Select
                value={config.model}
                onValueChange={(value) => handleChange("model", value)}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="请选择AI模型..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    {config.provider === ModelProvider.OPENAI && "OpenAI 模型"}
                    {config.provider === ModelProvider.ANTHROPIC && "Anthropic 模型"}
                    {config.provider === ModelProvider.AZURE && "Azure OpenAI 模型"}
                    {config.provider === ModelProvider.LOCAL && "本地模型"}
                  </div>
                  {currentModels.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{model.label}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ml-2 ${
                          model.tier === '最新' ? 'text-green-600 bg-green-50' :
                          model.tier === '高级' ? 'text-purple-600 bg-purple-50' :
                          model.tier === '快速' ? 'text-orange-600 bg-orange-50' :
                          model.tier === '平衡' ? 'text-purple-600 bg-purple-50' :
                          model.tier === '本地' ? 'text-gray-600 bg-gray-50' :
                          'text-gray-500 bg-gray-50'
                        }`}>
                          {model.tier}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                不同模型具有不同的性能和成本特点，建议根据使用场景选择
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTest}
                disabled={testing || !config.api_key || !config.base_url}
                variant="outline"
              >
                <TestTube2 className="mr-2 h-4 w-4" />
                {testing ? "测试中..." : "测试连接"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || !config.api_key || !config.base_url}
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? "保存中..." : "保存配置"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="list-disc pl-4 space-y-1">
              <li>支持OpenAI官方API和任何兼容OpenAI格式的API服务</li>
              <li>Base URL需要包含完整的API地址，如：https://api.openai.com/v1</li>
              <li>不同模型具有不同的能力和价格，请根据需求选择</li>
              <li>建议先测试连接再保存配置</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}