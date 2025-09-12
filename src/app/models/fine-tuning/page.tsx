"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { 
  ArrowLeft, 
  Brain, 
  Database, 
  Settings, 
  Zap,
  CheckCircle,
  FileText,
  Cpu,
  Sparkles,
  Plus,
  Gauge
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// GPU状态相关类型定义
interface GPUDetail {
  memory_summary: {
    allocated: number
    cached: number
    reserved: number
    total: number
  }
  memory: {
    free_gb: number
    total_gb: number
  }
  status: boolean
  gpu_name: string
  utilization?: number
}

interface GPUStatusResponse {
  code: number
  msg: string
  data: {
    total_gpus: number
    allocated_gpus: number
    free_gpus: number
    utilization_rate: number
    memory_summary: {
      total_gb: number
      used_gb: number
      free_gb: number
      usage_percent: number
    }
    gpu_details: {
      [key: string]: {
        status: 'free' | 'allocated'
        task_id: string | null
        allocated_at: string | null
        duration: string | null
        gpu_name: string
        memory: {
          total: number
          used: number
          free: number
          total_gb: number
          used_gb: number
          free_gb: number
          usage_percent: number
        }
        utilization: {
          gpu_percent: number
          memory_percent: number
        }
        temperature: number
      }
    }
    active_tasks: number
  }
}

// 预定义的基础模型选项
const predefinedModels = {
  embedding: "BAAI/bge-m3",
  reranker: "BAAI/bge-reranker-v2-m3"
}

// 预定义的数据集选项
const predefinedDatasets = [
  "sentence-transformers/all-nli"
]

// 设备选项
const deviceOptions = [
  "cpu",
  "cuda:0", 
  "cuda:1",
  "cuda:2",
  "cuda:3",
  "cuda:4", 
  "cuda:5",
  "cuda:6",
  "cuda:7"
]

export default function FineTuningPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [selectedBaseModel, setSelectedBaseModel] = useState(predefinedModels.embedding)
  const [isCustomModel, setIsCustomModel] = useState(false)
  const [datasetPath, setDatasetPath] = useState("sentence-transformers/all-nli")
  const [isCustomDataset, setIsCustomDataset] = useState(false)
  const [loading, setLoading] = useState(false)
  const [taskName, setTaskName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedDevices, setSelectedDevices] = useState<string[]>(["cpu"])
  
  // GPU状态相关state
  const [gpuStatus, setGpuStatus] = useState<GPUStatusResponse | null>(null)
  const [gpuLoading, setGpuLoading] = useState(false)
  
  // 训练参数（按照API要求设置）
  const [trainType, setTrainType] = useState("embedding")
  const [outputDir, setOutputDir] = useState("/path/to/output")
  const [epochs, setEpochs] = useState([1])
  const [epochsInput, setEpochsInput] = useState("1")
  const [trainBatchSize, setTrainBatchSize] = useState([32])
  const [trainBatchSizeInput, setTrainBatchSizeInput] = useState("32")
  const [evalBatchSize, setEvalBatchSize] = useState([32])
  const [evalBatchSizeInput, setEvalBatchSizeInput] = useState("32")
  const [learningRate, setLearningRate] = useState([2e-5])
  const [learningRateInput, setLearningRateInput] = useState("2e-5")
  const [warmupRatio, setWarmupRatio] = useState([0.1])
  const [warmupRatioInput, setWarmupRatioInput] = useState("0.1")
  const [gradientAccumulation, setGradientAccumulation] = useState([1])
  const [gradientAccumulationInput, setGradientAccumulationInput] = useState("1")
  const [evalStrategy, setEvalStrategy] = useState("steps")
  const [evalSteps, setEvalSteps] = useState([1000])
  const [saveStrategy, setSaveStrategy] = useState("steps")
  const [saveSteps, setSaveSteps] = useState([500])
  const [logStrategy, setLogStrategy] = useState("steps")
  const [logSteps, setLogSteps] = useState([100])
  const [precisionType, setPrecisionType] = useState("fp16")
  const [doSample, setDoSample] = useState(false)
  const [trainSampleSize, setTrainSampleSize] = useState([500])
  const [trainSampleSizeInput, setTrainSampleSizeInput] = useState("500")
  const [evalSampleSize, setEvalSampleSize] = useState([500])
  const [evalSampleSizeInput, setEvalSampleSizeInput] = useState("500")
  const [testSampleSize, setTestSampleSize] = useState([500])
  const [testSampleSizeInput, setTestSampleSizeInput] = useState("500")
  const [lrSchedulerType, setLrSchedulerType] = useState("cosine")
  const [useHfSubset, setUseHfSubset] = useState(false)
  const [hfSubsetType, setHfSubsetType] = useState("pair-class")

  // 获取GPU状态
  const fetchGpuStatus = async () => {
    try {
      setGpuLoading(true)
      const response = await fetch('/api/proxy/api/v1/unified_training/gpu/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data: GPUStatusResponse = await response.json()
        if (data.code === 200) {
          setGpuStatus(data)
          console.log('GPU状态获取成功:', data)
          console.log('GPU详情类型:', typeof data.data?.gpu_details)
          console.log('GPU详情内容:', data.data?.gpu_details)
          console.log('总GPU数量:', data.data?.total_gpus)
          console.log('可用GPU数量:', data.data?.free_gpus)
          if (data.data?.gpu_details) {
            Object.keys(data.data.gpu_details).forEach((index) => {
              const gpu = data.data.gpu_details[index]
              console.log(`GPU ${index}:`, gpu)
              console.log(`GPU ${index} status:`, gpu.status)
              console.log(`GPU ${index} memory:`, gpu.memory)
            })
          }
        } else {
          console.error('GPU状态获取失败:', data.msg)
          toast({
            variant: "destructive",
            title: "获取GPU状态失败",
            description: data.msg || "无法获取GPU资源状态",
          })
        }
      } else {
        throw new Error('Failed to fetch GPU status')
      }
    } catch (error) {
      console.error('获取GPU状态出错:', error)
      toast({
        variant: "destructive", 
        title: "网络错误",
        description: "无法连接到GPU状态服务",
      })
    } finally {
      setGpuLoading(false)
    }
  }


  // 根据GPU状态获取可用设备列表
  const getAvailableDevices = () => {
    const devices = ['cpu']
    
    if (gpuStatus?.data?.gpu_details) {
      // gpu_details是对象，键是GPU索引
      Object.keys(gpuStatus.data.gpu_details).forEach((index) => {
        devices.push(`cuda:${index}`)
      })
    } else {
      // 如果没有GPU状态，仍然显示默认的CUDA设备（但标记为未知状态）
      for (let i = 0; i < 8; i++) {
        devices.push(`cuda:${i}`)
      }
    }
    
    return devices
  }

  // 检查设备是否可用
  const isDeviceAvailable = (device: string) => {
    if (device === 'cpu') return true
    
    if (gpuStatus?.data?.gpu_details) {
      const cudaIndex = device.replace('cuda:', '')
      const gpu = gpuStatus.data.gpu_details[cudaIndex]
      // 只有当GPU存在且状态为'free'时才认为可用
      return gpu?.status === 'free'
    }
    
    // 如果没有GPU状态数据，默认返回false（显示为不可用）
    return false
  }

  // 获取设备显示信息
  const getDeviceDisplayInfo = (device: string) => {
    if (device === 'cpu') {
      if (gpuStatus?.data?.memory_summary) {
        // CPU使用整体内存统计
        const totalGB = gpuStatus.data.memory_summary.total_gb || 0
        const freeGB = gpuStatus.data.memory_summary.free_gb || 0
        return {
          name: 'CPU',
          status: true,
          memory: `free: ${Math.round(freeGB)}GB / total: ${Math.round(totalGB)}GB`,
          freeMemory: freeGB,
          totalMemory: totalGB
        }
      }
      return {
        name: 'CPU',
        status: true,
        memory: '系统内存'
      }
    }
    
    const cudaIndex = device.replace('cuda:', '')
    
    if (gpuStatus?.data?.gpu_details) {
      const gpu = gpuStatus.data.gpu_details[cudaIndex]
      
      if (gpu) {
        // 检查GPU memory信息
        console.log(`正在处理GPU ${cudaIndex}:`, gpu)
        console.log(`GPU ${cudaIndex} memory对象:`, gpu.memory)
        
        if (gpu.memory && gpu.memory.total_gb && gpu.memory.free_gb) {
          // 直接使用GPU的memory字段中的GB数据
          const totalGB = gpu.memory.total_gb
          const freeGB = gpu.memory.free_gb
          
          console.log(`GPU ${cudaIndex} memory: ${freeGB}GB / ${totalGB}GB`)
          
          return {
            name: gpu.gpu_name || `GPU ${cudaIndex}`,
            status: gpu.status === 'free', // 只有'free'状态才可用
            memory: `free: ${Math.round(freeGB)}GB / total: ${Math.round(totalGB)}GB`,
            utilization: gpu.utilization,
            freeMemory: freeGB,
            totalMemory: totalGB,
            usedMemory: totalGB - freeGB
          }
        } else {
          console.log(`GPU ${cudaIndex} memory数据不完整:`, gpu.memory)
          return {
            name: gpu.gpu_name || `GPU ${cudaIndex}`,
            status: gpu.status === 'free',
            memory: '内存信息缺失'
          }
        }
      }
    }
    
    // 如果没有GPU状态数据，返回占位符信息
    return {
      name: `GPU ${parseInt(cudaIndex)}`,
      status: false,
      memory: 'free: 0GB / total: 0GB'
    }
  }

  // 页面加载时获取GPU状态
  useEffect(() => {
    fetchGpuStatus()
  }, [])

  // 根据训练类型自动选择基础模型
  useEffect(() => {
    if (trainType && predefinedModels[trainType as keyof typeof predefinedModels] && !isCustomModel) {
      setSelectedBaseModel(predefinedModels[trainType as keyof typeof predefinedModels])
    }
  }, [trainType, isCustomModel])

  // 根据基础模型自动选择训练类型（双向绑定）
  useEffect(() => {
    if (!isCustomModel && selectedBaseModel) {
      // 根据选择的基础模型反向设置训练类型
      if (selectedBaseModel === predefinedModels.embedding) {
        setTrainType("embedding")
      } else if (selectedBaseModel === predefinedModels.reranker) {
        setTrainType("reranker")
      }
    }
  }, [selectedBaseModel, isCustomModel])

  // 当切换到自定义数据集时，禁用HF subset
  useEffect(() => {
    if (isCustomDataset) {
      setUseHfSubset(false)
    }
  }, [isCustomDataset])

  // 处理设备选择 - 实现CPU与CUDA互斥逻辑
  const handleDeviceToggle = (device: string) => {
    setSelectedDevices(prev => {
      const isCpuDevice = device === 'cpu'
      const isCudaDevice = device.startsWith('cuda:')
      const hasCurrentCpu = prev.includes('cpu')
      const currentCudaDevices = prev.filter(d => d.startsWith('cuda:'))
      
      if (prev.includes(device)) {
        // 如果设备已选中，则移除
        const remaining = prev.filter(d => d !== device)
        
        // 确保至少有一个设备被选中
        if (remaining.length === 0) {
          // 如果移除后没有设备，则默认选择CPU
          return ['cpu']
        }
        
        return remaining
      } else {
        // 如果设备未选中，则添加
        if (isCpuDevice) {
          // 如果选择CPU，则移除所有CUDA设备，只保留CPU
          return ['cpu']
        } else if (isCudaDevice) {
          // 如果选择CUDA设备
          if (hasCurrentCpu) {
            // 如果当前有CPU，则移除CPU，只保留新选择的CUDA设备
            return [device]
          } else {
            // 如果当前没有CPU，则添加到CUDA设备列表中
            return [...prev, device]
          }
        }
        
        // 默认情况：添加设备
        return [...prev, device]
      }
    })
  }

  const handleSubmit = async () => {
    // 验证必填参数
    if (!trainType) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请选择训练类型",
      })
      return
    }

    if (!selectedBaseModel) {
      toast({
        variant: "destructive", 
        title: "错误",
        description: "请选择基础模型",
      })
      return
    }

    if (!datasetPath.trim()) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请输入数据集路径",
      })
      return
    }

    if (!outputDir.trim()) {
      toast({
        variant: "destructive",
        title: "错误", 
        description: "请输入输出目录",
      })
      return
    }

    setLoading(true)
    try {
      // 构建API请求参数
      const requestBody = {
        train_type: trainType,
        model_name_or_path: selectedBaseModel,
        dataset_name_or_path: datasetPath,
        output_dir: outputDir,
        num_train_epochs: epochs[0],
        per_device_train_batch_size: trainBatchSize[0],
        per_device_eval_batch_size: evalBatchSize[0],
        learning_rate: learningRate[0],
        warmup_ratio: warmupRatio[0],
        gradient_accumulation_steps: gradientAccumulation[0],
        eval_strategy: evalStrategy,
        ...(evalStrategy === 'steps' && { eval_steps: evalSteps[0] }),
        save_strategy: saveStrategy,
        ...(saveStrategy === 'steps' && { save_steps: saveSteps[0] }),
        log_strategy: logStrategy,
        ...(logStrategy === 'steps' && { log_steps: logSteps[0] }),
        bf16: precisionType === "bf16",
        ...(doSample && {
          train_sample_size: trainSampleSize[0],
          eval_sample_size: evalSampleSize[0],
          test_sample_size: testSampleSize[0]
        }),
        lr_scheduler_type: lrSchedulerType,
        ...(taskName.trim() && { task_name: taskName.trim() }),
        ...(description.trim() && { description: description.trim() }),
        device: selectedDevices.length === 1 ? selectedDevices[0] : selectedDevices,
        ...(useHfSubset && !isCustomDataset && { HF_subset: hfSubsetType })
      }
      
      console.log('Creating training task with params:', requestBody)
      
      const response = await fetch('/api/proxy/api/v1/unified_training/start_training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Training task created:', result)
      
      if (result.code === 200 || result.msg === 'success') {
        toast({
          title: "成功",
          description: "模型微调任务已创建，正在后台处理...",
        })
        router.push('/models')
      } else {
        throw new Error(result.msg || '创建任务失败')
      }
    } catch (error) {
      console.error("创建微调任务失败:", error)
      toast({
        variant: "destructive",
        title: "错误",
        description: error instanceof Error ? error.message : "创建微调任务失败，请稍后重试",
      })
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-100">
      
      <header className="bg-white/80 backdrop-blur-md border-b border-white/30 shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="hover:bg-white/60 backdrop-blur-sm transition-all duration-200 border border-transparent hover:border-white/30 h-9 px-3"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    创建模型微调任务
                  </h1>
                  <p className="text-sm text-gray-500">配置训练参数，开始模型微调</p>
                </div>
              </div>
            </div>
            
            {/* 进度指示 */}
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>配置参数</span>
              </div>
              <div className="w-4 h-px bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <span>开始训练</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pb-8">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
            
            {/* 左侧配置区域 */}
            <div className="xl:col-span-2 space-y-6">
              
              {/* 基本配置 */}
              <Card className="bg-gradient-to-br from-white to-purple-50/30 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-6 border-b border-purple-100/50">
                  <CardTitle className="flex items-center gap-4 text-xl">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Settings className="h-5 w-5 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <div className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        基础配置
                      </div>
                      <div className="text-sm text-gray-500 font-normal">
                        训练任务核心参数设置
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="taskName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>任务名称</span>
                      </Label>
                      <Input
                        id="taskName"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        placeholder="请输入任务名称"
                        className="h-12 bg-white/80 border-2 border-blue-200/60 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200/50 focus:shadow-md transition-all duration-300 rounded-lg"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="description" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span>任务描述</span>
                      </Label>
                      <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="请输入任务描述"
                        className="h-12 bg-white/80 border-2 border-indigo-200/60 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200/50 focus:shadow-md transition-all duration-300 rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="trainType" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>训练类型</span>
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select value={trainType} onValueChange={setTrainType}>
                        <SelectTrigger className="h-12 bg-white/80 border-2 border-purple-200/60 focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200/50 focus:shadow-md transition-all duration-300 rounded-lg">
                          <SelectValue placeholder="选择训练类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="embedding">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              Embedding
                            </div>
                          </SelectItem>
                          <SelectItem value="reranker">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              Reranker
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="selectedBaseModel" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                        <span>基础模型</span>
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="space-y-3">
                        {!isCustomModel ? (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <Select value={selectedBaseModel} onValueChange={setSelectedBaseModel}>
                                <SelectTrigger className="h-12 bg-white/80 border-2 border-pink-200/60 focus:border-pink-500 focus:bg-white focus:ring-2 focus:ring-pink-200/50 focus:shadow-md transition-all duration-300 rounded-lg">
                                  <SelectValue placeholder="选择基础模型" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.values(predefinedModels).map((model) => (
                                    <SelectItem key={model} value={model}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                        {model}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsCustomModel(true)
                                  setSelectedBaseModel("")
                                }}
                                className="h-12 px-3 border-2 border-dashed border-pink-300 text-pink-600 hover:bg-pink-50 hover:border-pink-400 transition-all duration-200 rounded-lg flex items-center gap-2 whitespace-nowrap"
                              >
                                <Plus className="h-4 w-4" />
                                <span className="text-xs font-medium">自定义</span>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <Input
                                id="selectedBaseModel"
                                value={selectedBaseModel}
                                onChange={(e) => setSelectedBaseModel(e.target.value)}
                                placeholder="输入自定义模型名称，如: your-custom-model"
                                className="h-12 bg-white/80 border-2 border-pink-200/60 focus:border-pink-500 focus:bg-white focus:ring-2 focus:ring-pink-200/50 focus:shadow-md transition-all duration-300 rounded-lg"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsCustomModel(false)
                                  setSelectedBaseModel(predefinedModels[trainType as keyof typeof predefinedModels] || predefinedModels.embedding)
                                }}
                                className="h-12 px-3 border-2 border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 rounded-lg flex items-center gap-2 whitespace-nowrap"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="text-xs font-medium">返回</span>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="datasetPath" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>数据集路径</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="space-y-3">
                      {!isCustomDataset ? (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Select value={datasetPath} onValueChange={setDatasetPath}>
                              <SelectTrigger className="h-12 bg-white/80 border-2 border-green-200/60 focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-200/50 focus:shadow-md transition-all duration-300 rounded-lg">
                                <SelectValue placeholder="选择数据集" />
                              </SelectTrigger>
                              <SelectContent>
                                {predefinedDatasets.map((dataset) => (
                                  <SelectItem key={dataset} value={dataset}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      {dataset}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsCustomDataset(true)
                                setDatasetPath("")
                              }}
                              className="h-12 px-3 border-2 border-dashed border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400 transition-all duration-200 rounded-lg flex items-center gap-2 whitespace-nowrap"
                            >
                              <Plus className="h-4 w-4" />
                              <span className="text-xs font-medium">自定义</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              id="datasetPath"
                              value={datasetPath}
                              onChange={(e) => setDatasetPath(e.target.value)}
                              placeholder="输入自定义数据集路径，如: /path/to/your/dataset"
                              className="h-12 bg-white/80 border-2 border-green-200/60 focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-200/50 focus:shadow-md transition-all duration-300 rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsCustomDataset(false)
                                setDatasetPath("sentence-transformers/all-nli")
                              }}
                              className="h-12 px-3 border-2 border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 rounded-lg flex items-center gap-2 whitespace-nowrap"
                            >
                              <ArrowLeft className="h-4 w-4" />
                              <span className="text-xs font-medium">返回</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* HF Subset配置区域 - 移动到基础配置 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>HF Subset配置</span>
                      <Badge variant="secondary" className={`text-xs ${
                        isCustomDataset 
                          ? 'bg-gray-100 text-gray-500' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isCustomDataset ? '不可用' : (useHfSubset ? hfSubsetType : '未启用')}
                      </Badge>
                    </Label>
                    
                    <div className={`rounded-lg border p-4 ${
                      isCustomDataset 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100'
                    }`}>
                      {/* HF_subset checkbox */}
                      <div className="flex items-center space-x-3 mb-3">
                        <input
                          type="checkbox"
                          id="use_hf_subset"
                          checked={useHfSubset && !isCustomDataset}
                          onChange={(e) => setUseHfSubset(e.target.checked)}
                          disabled={isCustomDataset}
                          className={`w-4 h-4 rounded focus:ring-2 ${
                            isCustomDataset 
                              ? 'text-gray-400 bg-gray-200 border-gray-300 cursor-not-allowed' 
                              : 'text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500'
                          }`}
                        />
                        <Label 
                          htmlFor="use_hf_subset" 
                          className={`text-sm font-medium cursor-pointer ${
                            isCustomDataset 
                              ? 'text-gray-500 cursor-not-allowed' 
                              : 'text-blue-700'
                          }`}
                        >
                          启用HF Subset
                        </Label>
                      </div>
                      
                      {useHfSubset && !isCustomDataset && (
                        <div>
                          <Label className="text-sm font-medium text-blue-700 mb-2 block">
                            Subset类型
                          </Label>
                          
                          <Select value={hfSubsetType} onValueChange={setHfSubsetType}>
                            <SelectTrigger className="h-12 bg-white/80 border-2 border-blue-200/60 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200/50 focus:shadow-md transition-all duration-300 rounded-lg">
                              <SelectValue placeholder="选择Subset类型" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pair-class">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span>pair-class</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="pair-score">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                  <span>pair-score</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-blue-600 mt-2">选择HuggingFace数据集的子集类型</p>
                        </div>
                      )}
                      
                      {isCustomDataset && (
                        <p className="text-xs text-gray-500 mt-2">
                          自定义数据集路径时，HF Subset配置不可用
                        </p>
                      )}
                      
                      {!useHfSubset && !isCustomDataset && (
                        <p className="text-xs text-blue-600 mt-2">
                          已禁用HF Subset配置，将使用默认设置
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span>计算设备</span>
                    </Label>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-100 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-emerald-800">选择训练设备</span>
                        <div className="text-xs text-emerald-600 flex items-center gap-2">
                          <span>已选择: {selectedDevices.length} 个设备</span>
                          {gpuLoading && (
                            <div className="w-3 h-3 border border-emerald-300 border-t-emerald-600 rounded-full animate-spin"></div>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={fetchGpuStatus}
                            disabled={gpuLoading}
                            className="h-6 px-2 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                          >
                            刷新状态
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {getAvailableDevices().map((device) => {
                          const isSelected = selectedDevices.includes(device)
                          const isCpu = device === 'cpu'
                          const isAvailable = isDeviceAvailable(device)
                          const deviceInfo = getDeviceDisplayInfo(device)
                          return (
                            <button
                              key={device}
                              type="button"
                              onClick={() => handleDeviceToggle(device)}
                              disabled={!isAvailable}
                              className={`
                                relative px-3 py-3 rounded-lg text-xs font-medium transition-all duration-200 border-2 min-h-[60px]
                                ${!isAvailable 
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                  : isSelected 
                                    ? (isCpu 
                                      ? 'bg-orange-500 text-white border-orange-500 shadow-md hover:bg-orange-600' 
                                      : 'bg-emerald-500 text-white border-emerald-500 shadow-md hover:bg-emerald-600'
                                    )
                                    : (isCpu
                                      ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                                      : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'
                                    )
                                }
                                ${isSelected && isAvailable ? 'ring-2 ring-offset-1' : ''}
                                ${isSelected && isCpu && isAvailable ? 'ring-orange-300' : ''}
                                ${isSelected && !isCpu && isAvailable ? 'ring-emerald-300' : ''}
                              `}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  {isCpu ? (
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                    </svg>
                                  ) : (
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  )}
                                  <span className="font-semibold">{device}</span>
                                  {!isAvailable && (
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {deviceInfo.memory}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full flex items-center justify-center">
                                  <svg className="h-2 w-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <div className="mt-3 text-xs text-emerald-600">
                        <div className="flex items-center gap-2">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>可以选择多个设备进行训练，至少需要选择一个设备</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="outputDir" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span>输出目录</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="outputDir"
                      value={outputDir}
                      onChange={(e) => setOutputDir(e.target.value)}
                      placeholder="/path/to/output"
                      className="mt-2 border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </CardContent>
              </Card>



              {/* 训练参数 */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Cpu className="h-4 w-4 text-white" />
                    </div>
                    训练参数
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    精细调整训练超参数以获得最佳效果
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 核心参数 */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
                      <Label className="text-sm font-semibold text-purple-800 flex items-center justify-between">
                        <span>训练轮数</span>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">{epochs[0]}</Badge>
                      </Label>
                      
                      {/* 数字输入框 */}
                      <div className="mt-3 mb-3">
                        <Input
                          type="number"
                          min="1"
                          value={epochsInput}
                          onChange={(e) => {
                            const value = e.target.value
                            setEpochsInput(value)
                            // 只在有效数字时更新epochs
                            if (value && !isNaN(parseInt(value))) {
                              const numValue = parseInt(value)
                              if (numValue >= 1) {
                                setEpochs([numValue])
                              }
                            }
                          }}
                          onBlur={() => {
                            // 输入框失去焦点时，确保值合法
                            const numValue = parseInt(epochsInput)
                            if (isNaN(numValue) || numValue < 1) {
                              // 如果输入无效或小于1，设置为1
                              setEpochsInput("1")
                              setEpochs([1])
                            } else {
                              // 确保输入框显示整数
                              setEpochsInput(numValue.toString())
                              setEpochs([numValue])
                            }
                          }}
                          className="text-center font-medium bg-white/70 border-purple-200 focus:border-purple-400 focus:ring-purple-200 transition-colors"
                          placeholder="输入训练轮数"
                          onKeyDown={(e) => {
                            // 支持上下箭头键调整数值
                            if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              const current = epochs[0]
                              const newValue = current + 1
                              setEpochs([newValue])
                              setEpochsInput(newValue.toString())
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              const current = epochs[0]
                              const newValue = Math.max(1, current - 1)
                              setEpochs([newValue])
                              setEpochsInput(newValue.toString())
                            }
                          }}
                        />
                      </div>
                      
                      {/* 滑动条 - 限制在合理范围内显示 */}
                      <Slider
                        value={epochs}
                        onValueChange={(value) => {
                          setEpochs(value)
                          setEpochsInput(value[0].toString())
                        }}
                        max={Math.max(50, epochs[0] + 10)} // 动态调整最大值，给出一些额外空间
                        min={1}
                        step={1}
                        className="[&_[role=slider]]:bg-purple-500 [&_[role=slider]]:border-purple-600"
                      />
                      <div className="flex justify-between text-xs text-purple-600 mt-1">
                        <span>1</span>
                        <span>{Math.max(50, epochs[0] + 10)}</span>
                      </div>
                      <p className="text-xs text-purple-600 mt-2">训练轮数 (最小值: 1，默认: 1)</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-100">
                      <Label className="text-sm font-semibold text-blue-800 flex items-center justify-between">
                        <span>批次大小</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">{trainBatchSize[0]}</Badge>
                      </Label>
                      
                      {/* 数字输入框 */}
                      <div className="mt-3 mb-3">
                        <Input
                          type="number"
                          min="1"
                          value={trainBatchSizeInput}
                          onChange={(e) => {
                            const value = e.target.value
                            setTrainBatchSizeInput(value)
                            // 只在有效数字时更新trainBatchSize
                            if (value && !isNaN(parseInt(value))) {
                              const numValue = parseInt(value)
                              if (numValue >= 1) {
                                setTrainBatchSize([numValue])
                              }
                            }
                          }}
                          onBlur={() => {
                            // 输入框失去焦点时，确保值合法
                            const numValue = parseInt(trainBatchSizeInput)
                            if (isNaN(numValue) || numValue < 1) {
                              // 如果输入无效或小于1，设置为32(默认值)
                              setTrainBatchSizeInput("32")
                              setTrainBatchSize([32])
                            } else {
                              // 确保输入框显示整数
                              setTrainBatchSizeInput(numValue.toString())
                              setTrainBatchSize([numValue])
                            }
                          }}
                          onKeyDown={(e) => {
                            // 支持上下箭头键调整数值
                            if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              const current = trainBatchSize[0]
                              const newValue = current + 1
                              setTrainBatchSize([newValue])
                              setTrainBatchSizeInput(newValue.toString())
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              const current = trainBatchSize[0]
                              const newValue = Math.max(1, current - 1)
                              setTrainBatchSize([newValue])
                              setTrainBatchSizeInput(newValue.toString())
                            }
                          }}
                          className="text-center font-medium bg-white/70 border-blue-200 focus:border-blue-400 focus:ring-blue-200 transition-colors"
                          placeholder="输入批次大小"
                        />
                      </div>
                      
                      {/* 滑动条 - 动态调整范围 */}
                      <Slider
                        value={trainBatchSize}
                        onValueChange={(value) => {
                          setTrainBatchSize(value)
                          setTrainBatchSizeInput(value[0].toString())
                        }}
                        max={Math.max(128, trainBatchSize[0] + 32)} // 动态调整最大值，给出额外空间
                        min={1}
                        step={1}
                        className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-600"
                      />
                      <div className="flex justify-between text-xs text-blue-600 mt-1">
                        <span>1</span>
                        <span>{Math.max(128, trainBatchSize[0] + 32)}</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">单次训练样本数量 (最小值: 1，默认: 32)</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-100">
                      <Label className="text-sm font-semibold text-indigo-800 flex items-center justify-between">
                        <span>验证批次大小</span>
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">{evalBatchSize[0]}</Badge>
                      </Label>
                      
                      {/* 数字输入框 */}
                      <div className="mt-3 mb-3">
                        <Input
                          type="number"
                          min="1"
                          value={evalBatchSizeInput}
                          onChange={(e) => {
                            const value = e.target.value
                            setEvalBatchSizeInput(value)
                            // 只在有效数字时更新evalBatchSize
                            if (value && !isNaN(parseInt(value))) {
                              const numValue = parseInt(value)
                              if (numValue >= 1) {
                                setEvalBatchSize([numValue])
                              }
                            }
                          }}
                          onBlur={() => {
                            // 输入框失去焦点时，确保值合法
                            const numValue = parseInt(evalBatchSizeInput)
                            if (isNaN(numValue) || numValue < 1) {
                              // 如果输入无效或小于1，设置为32(默认值)
                              setEvalBatchSizeInput("32")
                              setEvalBatchSize([32])
                            } else {
                              // 确保输入框显示整数
                              setEvalBatchSizeInput(numValue.toString())
                              setEvalBatchSize([numValue])
                            }
                          }}
                          onKeyDown={(e) => {
                            // 支持上下箭头键调整数值
                            if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              const newValue = evalBatchSize[0] + 1
                              setEvalBatchSize([newValue])
                              setEvalBatchSizeInput(newValue.toString())
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              const newValue = Math.max(1, evalBatchSize[0] - 1)
                              setEvalBatchSize([newValue])
                              setEvalBatchSizeInput(newValue.toString())
                            }
                          }}
                          placeholder="输入验证批次大小..."
                          className="h-10 text-center font-medium bg-white border-2 border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                      
                      {/* 滑动条 - 限制在合理范围内显示 */}
                      <Slider
                        value={evalBatchSize}
                        onValueChange={(value) => {
                          setEvalBatchSize(value)
                          setEvalBatchSizeInput(value[0].toString())
                        }}
                        max={Math.max(128, evalBatchSize[0] + 32)} // 动态调整最大值，给出额外空间
                        min={1}
                        step={1}
                        className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-indigo-600"
                      />
                      <div className="flex justify-between text-xs text-indigo-600 mt-1">
                        <span>1</span>
                        <span>{Math.max(128, evalBatchSize[0] + 32)}</span>
                      </div>
                      <p className="text-xs text-indigo-600 mt-2">单次验证样本数量 (最小值: 1，默认: 32)</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
                      <Label className="text-sm font-semibold text-green-800 flex items-center justify-between">
                        <span>学习率</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">{learningRate[0].toExponential(1)}</Badge>
                      </Label>
                      
                      {/* 数字输入框 */}
                      <div className="mt-3 mb-3">
                        <Input
                          type="text"
                          value={learningRateInput}
                          onChange={(e) => {
                            const value = e.target.value
                            setLearningRateInput(value)
                            // 尝试解析科学计数法或普通数字
                            if (value && !isNaN(parseFloat(value))) {
                              const numValue = parseFloat(value)
                              if (numValue >= 1e-6 && numValue <= 1e-3) {
                                setLearningRate([numValue])
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              const currentValue = learningRate[0]
                              const newValue = Math.min(1e-3, currentValue * 2)
                              setLearningRate([newValue])
                              setLearningRateInput(newValue.toExponential())
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              const currentValue = learningRate[0]
                              const newValue = Math.max(1e-6, currentValue / 2)
                              setLearningRate([newValue])
                              setLearningRateInput(newValue.toExponential())
                            }
                          }}
                          placeholder="输入学习率..."
                          className="h-10 text-center font-medium bg-white border-2 border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                        />
                      </div>
                      
                      {/* 滑动条 - 使用对数刻度显示 */}
                      <Slider
                        value={learningRate}
                        onValueChange={(value) => {
                          setLearningRate(value)
                          setLearningRateInput(value[0].toExponential())
                        }}
                        max={1e-3}
                        min={1e-6}
                        step={1e-6}
                        className="[&_[role=slider]]:bg-green-500 [&_[role=slider]]:border-green-600"
                      />
                      <div className="flex justify-between text-xs text-green-600 mt-1">
                        <span>1e-6</span>
                        <span>1e-3</span>
                      </div>
                      <p className="text-xs text-green-600 mt-2">参数更新速度控制 (最小值: 1e-6，默认: 2e-5)</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-100">
                      <Label className="text-sm font-semibold text-orange-800 flex items-center justify-between mb-3">
                        <span>样本采样配置</span>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          {doSample ? `训练:${trainSampleSize[0]} 验证:${evalSampleSize[0]} 测试:${testSampleSize[0]}` : '不采样'}
                        </Badge>
                      </Label>
                      
                      {/* do_sample checkbox */}
                      <div className="flex items-center space-x-3 mb-3">
                        <input
                          type="checkbox"
                          id="do_sample"
                          checked={doSample}
                          onChange={(e) => setDoSample(e.target.checked)}
                          className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                        />
                        <Label htmlFor="do_sample" className="text-sm font-medium text-orange-700 cursor-pointer">
                          启用样本采样 (do_sample)
                        </Label>
                      </div>
                      
                      {doSample && (
                        <div className="space-y-4">
                          {/* 训练样本大小 */}
                          <div>
                            <Label className="text-sm font-medium text-orange-700 mb-2 block">
                              训练样本数量: {trainSampleSize[0]}
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={trainSampleSizeInput}
                              onChange={(e) => {
                                const value = e.target.value
                                setTrainSampleSizeInput(value)
                                if (value && !isNaN(parseInt(value))) {
                                  const numValue = parseInt(value)
                                  if (numValue >= 1) {
                                    setTrainSampleSize([numValue])
                                  }
                                }
                              }}
                              onBlur={() => {
                                const numValue = parseInt(trainSampleSizeInput)
                                if (isNaN(numValue) || numValue < 1) {
                                  setTrainSampleSizeInput("500")
                                  setTrainSampleSize([500])
                                } else {
                                  setTrainSampleSizeInput(numValue.toString())
                                  setTrainSampleSize([numValue])
                                }
                              }}
                              className="h-8 text-center font-medium bg-white border-2 border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                              placeholder="训练样本数量"
                            />
                          </div>
                          
                          {/* 验证样本大小 */}
                          <div>
                            <Label className="text-sm font-medium text-orange-700 mb-2 block">
                              验证样本数量: {evalSampleSize[0]}
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={evalSampleSizeInput}
                              onChange={(e) => {
                                const value = e.target.value
                                setEvalSampleSizeInput(value)
                                if (value && !isNaN(parseInt(value))) {
                                  const numValue = parseInt(value)
                                  if (numValue >= 1) {
                                    setEvalSampleSize([numValue])
                                  }
                                }
                              }}
                              onBlur={() => {
                                const numValue = parseInt(evalSampleSizeInput)
                                if (isNaN(numValue) || numValue < 1) {
                                  setEvalSampleSizeInput("500")
                                  setEvalSampleSize([500])
                                } else {
                                  setEvalSampleSizeInput(numValue.toString())
                                  setEvalSampleSize([numValue])
                                }
                              }}
                              className="h-8 text-center font-medium bg-white border-2 border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                              placeholder="验证样本数量"
                            />
                          </div>
                          
                          {/* 测试样本大小 */}
                          <div>
                            <Label className="text-sm font-medium text-orange-700 mb-2 block">
                              测试样本数量: {testSampleSize[0]}
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={testSampleSizeInput}
                              onChange={(e) => {
                                const value = e.target.value
                                setTestSampleSizeInput(value)
                                if (value && !isNaN(parseInt(value))) {
                                  const numValue = parseInt(value)
                                  if (numValue >= 1) {
                                    setTestSampleSize([numValue])
                                  }
                                }
                              }}
                              onBlur={() => {
                                const numValue = parseInt(testSampleSizeInput)
                                if (isNaN(numValue) || numValue < 1) {
                                  setTestSampleSizeInput("500")
                                  setTestSampleSize([500])
                                } else {
                                  setTestSampleSizeInput(numValue.toString())
                                  setTestSampleSize([numValue])
                                }
                              }}
                              className="h-8 text-center font-medium bg-white border-2 border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                              placeholder="测试样本数量"
                            />
                          </div>
                          
                          <p className="text-xs text-orange-600 mt-2">分别设置训练、验证和测试的样本数量 (最小值: 1，默认: 500)</p>
                        </div>
                      )}
                      
                      {!doSample && (
                        <p className="text-xs text-orange-600 mt-2">
                          已禁用样本采样，将使用全部数据进行训练
                        </p>
                      )}
                    </div>
                    
                    {/* 评估策略区域 */}
                    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-lg border border-teal-100">
                      <Label className="text-sm font-semibold text-teal-800 flex items-center justify-between mb-3">
                        <span>评估策略</span>
                        <Badge variant="secondary" className="bg-teal-100 text-teal-700">{evalStrategy}</Badge>
                      </Label>
                      
                      {/* 策略选择 */}
                      <Select value={evalStrategy} onValueChange={setEvalStrategy}>
                        <SelectTrigger className="h-12 bg-white/80 border-2 border-teal-200/60 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-200/50 focus:shadow-md transition-all duration-300 rounded-lg mb-3">
                          <SelectValue placeholder="选择评估策略" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">不评估 (none)</SelectItem>
                          <SelectItem value="epoch">每轮评估 (epoch)</SelectItem>
                          <SelectItem value="steps">按步数评估 (steps)</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* 只有选择steps时显示评估步数 */}
                      {evalStrategy === 'steps' && (
                        <div>
                          <Label className="text-sm font-medium text-teal-700 mb-2 block">
                            评估步数: {evalSteps[0]}
                          </Label>
                          <Slider
                            value={evalSteps}
                            onValueChange={setEvalSteps}
                            max={2000}
                            min={100}
                            step={100}
                            className="[&_[role=slider]]:bg-teal-500 [&_[role=slider]]:border-teal-600"
                          />
                          <div className="flex justify-between text-xs text-teal-600 mt-1">
                            <span>100</span>
                            <span>2000</span>
                          </div>
                          <p className="text-xs text-teal-600 mt-2">每隔多少步进行一次评估 (默认: 1000)</p>
                        </div>
                      )}
                    </div>
                    
                    {/* 保存策略区域 */}
                    <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-4 rounded-lg border border-rose-100">
                      <Label className="text-sm font-semibold text-rose-800 flex items-center justify-between mb-3">
                        <span>保存策略</span>
                        <Badge variant="secondary" className="bg-rose-100 text-rose-700">{saveStrategy}</Badge>
                      </Label>
                      
                      {/* 策略选择 */}
                      <Select value={saveStrategy} onValueChange={setSaveStrategy}>
                        <SelectTrigger className="h-12 bg-white/80 border-2 border-rose-200/60 focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-200/50 focus:shadow-md transition-all duration-300 rounded-lg mb-3">
                          <SelectValue placeholder="选择保存策略" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="epoch">每轮保存 (epoch)</SelectItem>
                          <SelectItem value="steps">按步数保存 (steps)</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* 只有选择steps时显示保存步数 */}
                      {saveStrategy === 'steps' && (
                        <div>
                          <Label className="text-sm font-medium text-rose-700 mb-2 block">
                            保存步数: {saveSteps[0]}
                          </Label>
                          <Slider
                            value={saveSteps}
                            onValueChange={setSaveSteps}
                            max={1000}
                            min={100}
                            step={50}
                            className="[&_[role=slider]]:bg-rose-500 [&_[role=slider]]:border-rose-600"
                          />
                          <div className="flex justify-between text-xs text-rose-600 mt-1">
                            <span>100</span>
                            <span>1000</span>
                          </div>
                          <p className="text-xs text-rose-600 mt-2">每隔多少步保存一次模型 (默认: 500)</p>
                        </div>
                      )}
                    </div>
                    
                    {/* 日志策略区域 */}
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-lg border border-amber-100">
                      <Label className="text-sm font-semibold text-amber-800 flex items-center justify-between mb-3">
                        <span>日志策略</span>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">{logStrategy}</Badge>
                      </Label>
                      
                      {/* 策略选择 */}
                      <Select value={logStrategy} onValueChange={setLogStrategy}>
                        <SelectTrigger className="h-12 bg-white/80 border-2 border-amber-200/60 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200/50 focus:shadow-md transition-all duration-300 rounded-lg mb-3">
                          <SelectValue placeholder="选择日志策略" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">不记录 (none)</SelectItem>
                          <SelectItem value="epoch">每轮记录 (epoch)</SelectItem>
                          <SelectItem value="steps">按步数记录 (steps)</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* 只有选择steps时显示日志步数 */}
                      {logStrategy === 'steps' && (
                        <div>
                          <Label className="text-sm font-medium text-amber-700 mb-2 block">
                            日志步数: {logSteps[0]}
                          </Label>
                          <Slider
                            value={logSteps}
                            onValueChange={setLogSteps}
                            max={500}
                            min={10}
                            step={10}
                            className="[&_[role=slider]]:bg-amber-500 [&_[role=slider]]:border-amber-600"
                          />
                          <div className="flex justify-between text-xs text-amber-600 mt-1">
                            <span>10</span>
                            <span>500</span>
                          </div>
                          <p className="text-xs text-amber-600 mt-2">每隔多少步记录一次日志 (默认: 100)</p>
                        </div>
                      )}
                    </div>
                    
                    {/* 预热比例区域 */}
                    <div className="bg-gradient-to-br from-sky-50 to-blue-50 p-4 rounded-lg border border-sky-100">
                      <Label className="text-sm font-semibold text-sky-800 flex items-center justify-between">
                        <span>预热比例</span>
                        <Badge variant="secondary" className="bg-sky-100 text-sky-700">{warmupRatio[0]}</Badge>
                      </Label>
                      
                      {/* 数字输入框 */}
                      <div className="mt-3 mb-3">
                        <Input
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={warmupRatioInput}
                          onChange={(e) => {
                            const value = e.target.value
                            setWarmupRatioInput(value)
                            // 只在有效数字时更新warmupRatio
                            if (value && !isNaN(parseFloat(value))) {
                              const numValue = parseFloat(value)
                              if (numValue >= 0 && numValue <= 1) {
                                setWarmupRatio([numValue])
                              }
                            }
                          }}
                          onBlur={() => {
                            // 输入框失去焦点时，确保值合法
                            const numValue = parseFloat(warmupRatioInput)
                            if (isNaN(numValue) || numValue < 0 || numValue > 1) {
                              // 如果输入无效，设置为0.1(默认值)
                              setWarmupRatioInput("0.1")
                              setWarmupRatio([0.1])
                            } else {
                              // 确保输入框显示正确格式
                              setWarmupRatioInput(numValue.toString())
                              setWarmupRatio([numValue])
                            }
                          }}
                          onKeyDown={(e) => {
                            // 支持上下箭头键调整数值(步长0.01)
                            if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              const current = warmupRatio[0]
                              const newValue = Math.min(1, current + 0.01)
                              setWarmupRatio([newValue])
                              setWarmupRatioInput(newValue.toFixed(2))
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              const current = warmupRatio[0]
                              const newValue = Math.max(0, current - 0.01)
                              setWarmupRatio([newValue])
                              setWarmupRatioInput(newValue.toFixed(2))
                            }
                          }}
                          className="h-10 text-center font-medium bg-white border-2 border-sky-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                          placeholder="输入预热比例"
                        />
                      </div>
                      
                      {/* 滑动条 */}
                      <Slider
                        value={warmupRatio}
                        onValueChange={(value) => {
                          setWarmupRatio(value)
                          setWarmupRatioInput(value[0].toFixed(2))
                        }}
                        max={0.5}
                        min={0.0}
                        step={0.01}
                        className="[&_[role=slider]]:bg-sky-500 [&_[role=slider]]:border-sky-600"
                      />
                      <div className="flex justify-between text-xs text-sky-600 mt-1">
                        <span>0.0</span>
                        <span>0.5</span>
                      </div>
                      <p className="text-xs text-sky-600 mt-2">学习率预热阶段占总训练步数的比例 (最小值: 0.0，默认: 0.1)</p>
                    </div>
                    
                    {/* 梯度累积步数区域 */}
                    <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-4 rounded-lg border border-slate-100">
                      <Label className="text-sm font-semibold text-slate-800 flex items-center justify-between">
                        <span>梯度累积步数</span>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700">{gradientAccumulation[0]}</Badge>
                      </Label>
                      
                      {/* 数字输入框 */}
                      <div className="mt-3 mb-3">
                        <Input
                          type="number"
                          min="1"
                          value={gradientAccumulationInput}
                          onChange={(e) => {
                            const value = e.target.value
                            setGradientAccumulationInput(value)
                            // 只在有效数字时更新gradientAccumulation
                            if (value && !isNaN(parseInt(value))) {
                              const numValue = parseInt(value)
                              if (numValue >= 1) {
                                setGradientAccumulation([numValue])
                              }
                            }
                          }}
                          onBlur={() => {
                            // 输入框失去焦点时，确保值合法
                            const numValue = parseInt(gradientAccumulationInput)
                            if (isNaN(numValue) || numValue < 1) {
                              // 如果输入无效或小于1，设置为1(默认值)
                              setGradientAccumulationInput("1")
                              setGradientAccumulation([1])
                            } else {
                              // 确保输入框显示整数
                              setGradientAccumulationInput(numValue.toString())
                              setGradientAccumulation([numValue])
                            }
                          }}
                          onKeyDown={(e) => {
                            // 支持上下箭头键调整数值
                            if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              const current = gradientAccumulation[0]
                              const newValue = current + 1
                              setGradientAccumulation([newValue])
                              setGradientAccumulationInput(newValue.toString())
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              const current = gradientAccumulation[0]
                              const newValue = Math.max(1, current - 1)
                              setGradientAccumulation([newValue])
                              setGradientAccumulationInput(newValue.toString())
                            }
                          }}
                          className="h-10 text-center font-medium bg-white border-2 border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          placeholder="输入梯度累积步数"
                        />
                      </div>
                      
                      <Slider
                        value={gradientAccumulation}
                        onValueChange={(value) => {
                          setGradientAccumulation(value)
                          setGradientAccumulationInput(value[0].toString())
                        }}
                        max={Math.max(32, gradientAccumulation[0] + 8)} // 动态调整最大值
                        min={1}
                        step={1}
                        className="[&_[role=slider]]:bg-slate-500 [&_[role=slider]]:border-slate-600"
                      />
                      <div className="flex justify-between text-xs text-slate-600 mt-1">
                        <span>1</span>
                        <span>{Math.max(32, gradientAccumulation[0] + 8)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2">梯度累积步数 (最小值: 1，默认: 1)</p>
                    </div>
                    
                    {/* 混合精度训练区域 */}
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-lg border border-violet-100">
                      <Label className="text-sm font-semibold text-violet-800 flex items-center justify-between mb-3">
                        <span>混合精度训练</span>
                        <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                          {precisionType}
                        </Badge>
                      </Label>
                      
                      <Select value={precisionType} onValueChange={setPrecisionType}>
                        <SelectTrigger className="h-12 bg-white/80 border-2 border-violet-200/60 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-200/50 focus:shadow-md transition-all duration-300 rounded-lg">
                          <SelectValue placeholder="选择精度类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bf16">bf16</SelectItem>
                          <SelectItem value="fp16">fp16</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-violet-600 mt-2">
                        混合精度训练可以加速训练并减少显存占用
                      </p>
                    </div>
                    
                    {/* 学习率调度器区域 */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-100">
                      <Label className="text-sm font-semibold text-emerald-800 flex items-center justify-between mb-3">
                        <span>学习率调度器</span>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                          {lrSchedulerType}
                        </Badge>
                      </Label>
                      
                      <Select value={lrSchedulerType} onValueChange={setLrSchedulerType}>
                        <SelectTrigger className="h-12 bg-white/80 border-2 border-emerald-200/60 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200/50 focus:shadow-md transition-all duration-300 rounded-lg">
                          <SelectValue placeholder="选择调度器类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cosine">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                              <span>cosine</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="linear">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                              <span>linear</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-emerald-600 mt-2">
                        控制学习率在训练过程中的衰减策略
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右侧预览和提交区域 */}
            <div className="space-y-6 xl:sticky xl:top-24 xl:h-fit">
              
              {/* 配置预览 */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-md">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    配置预览
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {/* 基础配置状态 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          trainType ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-xs text-gray-600">训练类型</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          selectedBaseModel ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-xs text-gray-600">基础模型</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          datasetPath.trim() ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-xs text-gray-600">数据集</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          outputDir !== '/path/to/output' ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-xs text-gray-600">输出目录</span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">关键参数</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">训练类型</span>
                          <Badge variant="outline" className="text-xs">
                            {trainType || '未设置'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">训练轮数</span>
                          <Badge variant="outline" className="text-xs">
                            {epochs[0]}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">批次大小</span>
                          <Badge variant="outline" className="text-xs">
                            {trainBatchSize[0]}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">学习率</span>
                          <Badge variant="outline" className="text-xs">
                            {learningRate[0].toExponential(1)}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">训练样本</span>
                            <Badge variant="outline" className="text-xs">
                              {trainSampleSize[0]}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">验证样本</span>
                            <Badge variant="outline" className="text-xs">
                              {evalSampleSize[0]}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">测试样本</span>
                            <Badge variant="outline" className="text-xs">
                              {testSampleSize[0]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 提交准备状态 */}
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-700">准备状态</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {!trainType || !selectedBaseModel || !datasetPath.trim() || outputDir === '/path/to/output' ? (
                          <div className="flex items-center gap-2 text-amber-600">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                            请完成必填配置项
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            配置完成，可以开始训练
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 提交按钮 */}
              <div className="space-y-3">
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !trainType || !selectedBaseModel || !datasetPath.trim() || !outputDir}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-200 text-base font-semibold text-white"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      创建中...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      开始训练
                    </div>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => router.push('/models')}
                  className="w-full h-10 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}