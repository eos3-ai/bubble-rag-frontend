"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { 
  ArrowLeft, 
  Plus, 
  Settings, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Zap,
  Brain,
  Cpu,
  Database,
  TrendingUp,
  Calendar,
  Square,
  Rocket,
  Server,
  Search,
  StopCircle,
  List,
  BarChart
} from "lucide-react"

interface ModelTrainingTask {
  id: string
  model_name: string
  task_type: 'fine_tuning' | 'training' | 'deployment'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'deployed'
  progress: number
  knowledge_base_id?: string
  knowledge_base_name?: string
  base_model: string
  created_time: string
  updated_time: string
  gpu_hours?: number
  loss?: number
}

// 接口返回的训练任务数据接口
interface ApiTrainingTask {
  [key: string]: any
}

interface ModelDeployment {
  [key: string]: any
}

export default function ModelsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [models, setModels] = useState<ApiTrainingTask[]>([])
  const [allModels, setAllModels] = useState<ApiTrainingTask[]>([]) // 存储所有数据用于分页
  const [currentTrainingPage, setCurrentTrainingPage] = useState(1)
  const currentTrainingPageRef = useRef(1)
  const [totalTrainingPages, setTotalTrainingPages] = useState(1)
  const [trainingPageSize] = useState(10)
  const [dockerServers, setDockerServers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [dockerLoading, setDockerLoading] = useState(false)
  const [modelList, setModelList] = useState<any[]>([])
  const [modelListLoading, setModelListLoading] = useState(false)
  const [modelConfigNameFilter, setModelConfigNameFilter] = useState('')
  const [modelTypeFilter, setModelTypeFilter] = useState('all')
  const [currentModelPage, setCurrentModelPage] = useState(1)
  const [totalModelPages, setTotalModelPages] = useState(1)
  const [modelPageSize] = useState(10)
  const [showAddModelDialog, setShowAddModelDialog] = useState(false)
  const [addModelFormData, setAddModelFormData] = useState({
    config_name: '',
    model_base_url: '',
    model_name: '',
    model_api_key: '',
    model_type: 'embedding',
    embedding_dim: 1024
  })
  const [activeTab, setActiveTab] = useState<'training' | 'deployment' | 'docker' | 'models'>('training')
  const [showAddDockerDialog, setShowAddDockerDialog] = useState(false)
  const [showEditDockerDialog, setShowEditDockerDialog] = useState(false)
  const [showDeleteDockerDialog, setShowDeleteDockerDialog] = useState(false)
  const [selectedDockerServer, setSelectedDockerServer] = useState<any>(null)
  const [showDeleteModelDialog, setShowDeleteModelDialog] = useState(false)
  const [selectedModelForDelete, setSelectedModelForDelete] = useState<any>(null)
  const [showDeleteTaskDialog, setShowDeleteTaskDialog] = useState(false)
  const [selectedTaskForDelete, setSelectedTaskForDelete] = useState<any>(null)
  const [showStopTaskDialog, setShowStopTaskDialog] = useState(false)
  const [selectedTaskForStop, setSelectedTaskForStop] = useState<any>(null)
  const [showDatasetDialog, setShowDatasetDialog] = useState(false)
  const [selectedTaskForDataset, setSelectedTaskForDataset] = useState<any>(null)
  const [datasetInfo, setDatasetInfo] = useState<any>(null)
  const [datasetLoading, setDatasetLoading] = useState(false)
  const [showLogsDialog, setShowLogsDialog] = useState(false)
  const [selectedTaskForLogs, setSelectedTaskForLogs] = useState<any>(null)
  const [logsInfo, setLogsInfo] = useState<any>(null)
  const [logsLoading, setLogsLoading] = useState(false)
  const [showDeleteDeploymentDialog, setShowDeleteDeploymentDialog] = useState(false)
  const [selectedDeploymentForDelete, setSelectedDeploymentForDelete] = useState<any>(null)
  const [dockerSearchQuery, setDockerSearchQuery] = useState('')
  const [showDeployDialog, setShowDeployDialog] = useState(false)
  const [selectedModelForDeploy, setSelectedModelForDeploy] = useState<any>(null)
  const [deployFormData, setDeployFormData] = useState({
    docker_server_id: '',
    model_type: 0,
    model_path: '',
    svc_port: '',
    gpus_cfg: '',
    run_cfg: '',
    config_name: '',
    model_name: '',
    embedding_dim: 1024
  })
  const [dockerFormData, setDockerFormData] = useState({
    server_name: '',
    srv_base_url: ''
  })
  const [deployments, setDeployments] = useState<ModelDeployment[]>([])
  const [deploymentsLoading, setDeploymentsLoading] = useState(false)
  const [deploymentModelTypeFilter, setDeploymentModelTypeFilter] = useState<string>('all')
  const [currentDeployPage, setCurrentDeployPage] = useState(1)
  const [totalDeployPages, setTotalDeployPages] = useState(1)
  const [deployPageSize] = useState(10)
  // 结果相关状态
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [selectedTaskForResults, setSelectedTaskForResults] = useState<any>(null)
  const [lossData, setLossData] = useState<any>(null)
  const [evalResults, setEvalResults] = useState<any>(null)
  const [resultsLoading, setResultsLoading] = useState(false)

  // 过滤已完成的任务用于部署页面
  const completedModels = models.filter(model => 
    model.status?.toLowerCase() === 'succeeded' || 
    model.status?.toLowerCase() === 'completed'
  )

  // 根据搜索查询过滤Docker服务器
  const filteredDockerServers = dockerServers.filter(server => {
    if (!dockerSearchQuery.trim()) return true
    
    const searchLower = dockerSearchQuery.toLowerCase()
    const serverName = (server.server_name || server.name || '').toLowerCase()
    const serverUrl = (server.srv_base_url || server.base_url || server.url || '').toLowerCase()
    
    return serverName.includes(searchLower) || serverUrl.includes(searchLower)
  })

  // 根据模型类型过滤部署（服务器端分页已处理，这里只做客户端二次过滤）
  const filteredDeployments = deployments

  // 更新训练任务分页数据
  const updateTrainingPageData = (allTasks: ApiTrainingTask[], page: number) => {
    const totalPages = Math.max(1, Math.ceil(allTasks.length / trainingPageSize))
    const startIndex = (page - 1) * trainingPageSize
    const endIndex = startIndex + trainingPageSize
    const pageData = allTasks.slice(startIndex, endIndex)
    
    setModels(pageData)
    setTotalTrainingPages(totalPages)
  }

  // 处理训练任务分页变化
  const handleTrainingPageChange = (page: number) => {
    setCurrentTrainingPage(page)
    currentTrainingPageRef.current = page
    // 直接调用API获取新页面的数据
    loadTrainingTasks(false)
  }

  // 获取训练任务列表  
  const loadTrainingTasks = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true)
      }
      
      const response = await fetch(`/api/proxy/api/v1/unified_training/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch training tasks')
      }
      
      const data = await response.json()
      
      if (data.code === 200 && data.data?.tasks) {
        const newTasks = data.data.tasks
        // 按创建时间倒序排序（最新的在前面）
        const sortedTasks = newTasks.sort((a: any, b: any) => {
          const timeA = a.created_at || a.created_time || a.create_time || ''
          const timeB = b.created_at || b.created_time || b.create_time || ''
          return new Date(timeB).getTime() - new Date(timeA).getTime()
        })
        // 保存所有数据用于分页
        setAllModels(sortedTasks)
        // 计算分页数据
        updateTrainingPageData(sortedTasks, currentTrainingPageRef.current)
      } else if (data.data?.tasks) {
        const tasks = data.data.tasks
        // 按创建时间倒序排序（最新的在前面）
        const sortedTasks = tasks.sort((a: any, b: any) => {
          const timeA = a.created_at || a.created_time || a.create_time || ''
          const timeB = b.created_at || b.created_time || b.create_time || ''
          return new Date(timeB).getTime() - new Date(timeA).getTime()
        })
        setAllModels(sortedTasks)
        updateTrainingPageData(sortedTasks, currentTrainingPageRef.current)
      } else if (Array.isArray(data)) {
        // 按创建时间倒序排序（最新的在前面）
        const sortedTasks = data.sort((a: any, b: any) => {
          const timeA = a.created_at || a.created_time || a.create_time || ''
          const timeB = b.created_at || b.created_time || b.create_time || ''
          return new Date(timeB).getTime() - new Date(timeA).getTime()
        })
        setAllModels(sortedTasks)
        updateTrainingPageData(sortedTasks, currentTrainingPageRef.current)
      } else {
        console.error('Unexpected data format:', data)
        if (isInitialLoad) {
          setAllModels([])
          setModels([])
          setTotalTrainingPages(1)
        }
      }
    } catch (error) {
      console.error('Error loading training tasks:', error)
      if (isInitialLoad) {
        setModels([])
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }

  // 获取部署列表
  const loadDeployments = async (isInitialLoad = false, pageNum = currentDeployPage) => {
    try {
      if (isInitialLoad) {
        setDeploymentsLoading(true)
      }
      
      console.log('Loading deployments with params:', {
        page_size: deployPageSize,
        page_num: pageNum,
        ...(deploymentModelTypeFilter !== 'all' && { model_type: parseInt(deploymentModelTypeFilter) })
      })
      
      const response = await fetch('/api/proxy/api/v1/model_deploy/list_model_deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_size: deployPageSize,
          page_num: pageNum,
          ...(deploymentModelTypeFilter !== 'all' && { model_type: parseInt(deploymentModelTypeFilter) })
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch deployments')
      }
      
      const data = await response.json()
      console.log('Deployment data received:', data)
      
      if (data.code === 200 && data.data) {
        const deploymentList = data.data.list || data.data.items || data.data || []
        setDeployments(deploymentList)
        
        // 更新分页信息
        let totalPages = 1
        let totalCount = 0
        
        if (data.data.total !== undefined) {
          totalCount = data.data.total
          totalPages = Math.max(1, Math.ceil(totalCount / deployPageSize))
          console.log(`Total deployments: ${totalCount}, pages: ${totalPages}`)
        } else if (data.data.total_pages) {
          totalPages = Math.max(1, data.data.total_pages)
          console.log(`Total pages from API: ${totalPages}`)
        } else if (deploymentList.length >= deployPageSize) {
          // 如果当前页满了，可能还有下一页
          totalPages = pageNum + 1
          console.log(`Estimated total pages: ${totalPages}`)
        } else if (deploymentList.length > 0) {
          // 如果有数据但不满一页，总页数为1
          totalPages = 1
        }
        
        setTotalDeployPages(totalPages)
      } else {
        console.error('Unexpected deployment data format:', data)
        if (isInitialLoad) {
          setDeployments([])
          setTotalDeployPages(1)
        }
      }
    } catch (error) {
      console.error('Error loading deployments:', error)
      if (isInitialLoad) {
        setDeployments([])
        setTotalDeployPages(1)
      }
    } finally {
      if (isInitialLoad) {
        setDeploymentsLoading(false)
      }
    }
  }

  // 获取Docker服务器列表
  const loadDockerServers = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setDockerLoading(true)
      }

      const response = await fetch('/api/proxy/api/v1/docker_servers/list_all_docker_servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server_name: "",
          srv_base_url: "",
          page_size: 10,
          page_num: 1
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch docker servers')
      }

      const data = await response.json()
      console.log('Docker servers data:', data)

      if (data.code === 200 && data.data?.servers) {
        setDockerServers(data.data.servers)
      } else if (data.data?.items) {
        setDockerServers(data.data.items)
      } else if (Array.isArray(data.data)) {
        setDockerServers(data.data)
      } else {
        console.error('Unexpected docker servers data format:', data)
        if (isInitialLoad) {
          setDockerServers([])
        }
      }
    } catch (error) {
      console.error('Error loading docker servers:', error)
      if (isInitialLoad) {
        setDockerServers([])
      }
    } finally {
      if (isInitialLoad) {
        setDockerLoading(false)
      }
    }
  }

  // 获取模型列表
  const loadModelList = async (isInitialLoad = false, configName = '', modelType = '', pageNum = currentModelPage) => {
    try {
      if (isInitialLoad) {
        setModelListLoading(true)
      }
      
      const requestBody = {
        config_name: configName || '',
        model_type: modelType === 'all' ? '' : modelType || '',
        page_num: pageNum,
        page_size: modelPageSize
      }
      
      console.log('Loading models with params:', requestBody)
      
      const response = await fetch('/api/proxy/api/v1/models/list_models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }
      
      const data = await response.json()
      console.log('Model list data received:', data)
      
      if (data.code === 200 && data.data) {
        const models = data.data.items || data.data.list || data.data.models || data.data || []
        setModelList(models)

        // 计算总页数
        let totalPages = 1
        if (data.data.total) {
          // 如果返回total字段
          const totalCount = data.data.total
          totalPages = Math.max(1, Math.ceil(totalCount / modelPageSize))
        } else if (data.data.total_pages) {
          // 如果返回total_pages字段
          totalPages = data.data.total_pages
        } else if (models.length >= modelPageSize) {
          // 估算：如果当前页满了，假设还有下一页
          totalPages = pageNum + 1
        }
        setTotalModelPages(totalPages)
      } else {
        console.error('Unexpected model list data format:', data)
        if (isInitialLoad) {
          setModelList([])
          setTotalModelPages(1)
        }
      }
    } catch (error) {
      console.error('Error loading model list:', error)
      if (isInitialLoad) {
        setModelList([])
        setTotalModelPages(1)
      }
    } finally {
      if (isInitialLoad) {
        setModelListLoading(false)
      }
    }
  }

  // 组件挂载时加载数据，并设置轮询
  useEffect(() => {
    // 初次加载显示loading
    loadTrainingTasks(true)
    
    // 只在模型微调tab时设置轮询
    let interval: NodeJS.Timeout | null = null
    if (activeTab === 'training') {
      interval = setInterval(() => {
        loadTrainingTasks(false) // 静默更新训练任务数据
      }, 5000)
    }
    
    // 清理定时器
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [activeTab])

  // 监听过滤器参数变化，重新加载数据

  // 当切换到不同tab时加载对应数据并设置轮询
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (activeTab === 'docker') {
      loadDockerServers(true)
      // Docker服务器轮询
      interval = setInterval(() => {
        loadDockerServers(false)
      }, 10000) // 10秒轮询Docker服务器
    } else if (activeTab === 'models') {
      loadModelList(true, modelConfigNameFilter, modelTypeFilter, currentModelPage)
    } else if (activeTab === 'deployment') {
      loadDeployments(true, currentDeployPage)
    }
    
    // 清理定时器
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [activeTab])


  // 当页码或筛选条件变化时重新加载
  useEffect(() => {
    if (activeTab === 'deployment') {
      loadDeployments(false, currentDeployPage)
    }
  }, [currentDeployPage, deploymentModelTypeFilter, activeTab])

  // 组件加载时预加载Docker服务器列表，用于部署按钮的判断
  useEffect(() => {
    loadDockerServers(false)
  }, [])

  // 当模型筛选条件变化时重新加载
  useEffect(() => {
    if (activeTab === 'models') {
      loadModelList(false, modelConfigNameFilter, modelTypeFilter, currentModelPage)
    }
  }, [modelConfigNameFilter, modelTypeFilter, activeTab])

  // 当模型分页变化时重新加载
  useEffect(() => {
    if (activeTab === 'models') {
      loadModelList(false, modelConfigNameFilter, modelTypeFilter, currentModelPage)
    }
  }, [currentModelPage, activeTab])

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      stopLossPolling()
      stopLogsPolling()
    }
  }, [])

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status?.toLowerCase()
    switch (normalizedStatus) {
      case 'running':
        return <Play className="h-4 w-4 text-purple-500" />
      case 'succeeded':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'deployed':
        return <Zap className="h-4 w-4 text-purple-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Pause className="h-4 w-4 text-orange-400" />
      case 'stopped':
        return <Pause className="h-4 w-4 text-gray-400" />
      default:
        return <Pause className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase()
    switch (normalizedStatus) {
      case 'running':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'succeeded':
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'deployed':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'pending':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'stopped':
        return 'bg-gray-100 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'fine_tuning':
        return '模型微调'
      case 'training':
        return '模型训练'
      case 'deployment':
        return '模型部署'
      default:
        return type
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 打开停止训练任务确认对话框
  const handleStopTraining = (taskId: string) => {
    setSelectedTaskForStop(taskId)
    setShowStopTaskDialog(true)
  }

  // 确认停止训练任务
  const handleConfirmStopTraining = async () => {
    if (!selectedTaskForStop) return
    
    const taskId = selectedTaskForStop
    try {
      const response = await fetch(`/api/proxy/api/v1/unified_training/stop_training?task_id=${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        // 关闭对话框并刷新任务列表
        setShowStopTaskDialog(false)
        setSelectedTaskForStop(null)
        loadTrainingTasks(false)
        toast({
          title: "停止成功",
          description: "训练任务已成功停止",
        })
      } else {
        console.error('Failed to stop training task')
        toast({
          variant: "destructive",
          title: "停止失败",
          description: "无法停止训练任务，请稍后重试",
        })
      }
    } catch (error) {
      console.error('Error stopping training task:', error)
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "停止训练任务时发生错误",
      })
    }
  }

  // 查看训练任务数据集
  const handleViewDataset = async (taskId: string) => {
    setSelectedTaskForDataset(taskId)
    setShowDatasetDialog(true)
    setDatasetLoading(true)
    setDatasetInfo(null)
    
    try {
      const response = await fetch(`/api/proxy/api/v1/unified_training/tasks/${taskId}/datasets`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setDatasetInfo(data)
      } else {
        toast({
          variant: "destructive",
          title: "获取失败",
          description: "无法获取数据集信息，请稍后重试",
        })
        console.error('Failed to fetch dataset info')
      }
    } catch (error) {
      console.error('Error fetching dataset info:', error)
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "获取数据集信息时发生错误",
      })
    } finally {
      setDatasetLoading(false)
    }
  }

  // 查看训练任务日志
  const handleViewLogs = async (taskId: string) => {
    setSelectedTaskForLogs(taskId)
    setShowLogsDialog(true)
    setLogsLoading(true)
    setLogsInfo(null)
    
    try {
      // 立即获取一次日志数据
      await fetchLogsData(taskId)
      
      // 开始轮询日志数据
      startLogsPolling(taskId)
      
    } catch (error) {
      console.error('Error initializing training logs:', error)
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "获取训练日志时发生错误",
      })
    } finally {
      setLogsLoading(false)
    }
  }

  // 轮询间隔ID
  const lossPollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const logsPollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 获取日志数据
  const fetchLogsData = async (taskId: string) => {
    try {
      const response = await fetch(`/api/proxy/api/v1/unified_training/training_logs?task_id=${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLogsInfo(data)
      } else {
        console.error('Failed to fetch training logs')
      }
    } catch (error) {
      console.error('Error fetching training logs:', error)
    }
  }

  // 获取loss数据
  const fetchLossData = async (taskId: string) => {
    try {
      const response = await fetch(`/api/proxy/api/v1/unified_training/tasks/${taskId}/loss_data`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const lossData = await response.json()
        setLossData(lossData)
      } else {
        console.error('Failed to fetch loss data')
      }
    } catch (error) {
      console.error('Error fetching loss data:', error)
    }
  }

  // 获取eval结果数据
  const fetchEvalResults = async (taskId: string) => {
    try {
      const response = await fetch(`/api/proxy/api/v1/unified_training/tasks/${taskId}/eval_results`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const evalData = await response.json()
        setEvalResults(evalData)
      } else {
        console.error('Failed to fetch eval results')
      }
    } catch (error) {
      console.error('Error fetching eval results:', error)
    }
  }

  // 获取单个任务状态
  const fetchTaskStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/proxy/api/v1/unified_training/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const taskData = await response.json()
        return taskData.data || taskData
      }
    } catch (error) {
      console.error('Error fetching task status:', error)
    }
    return null
  }

  // 开始轮询loss数据和任务状态
  const startLossPolling = (taskId: string) => {
    // 清除之前的轮询
    if (lossPollingIntervalRef.current) {
      clearInterval(lossPollingIntervalRef.current)
    }
    
    // 每3秒轮询一次
    lossPollingIntervalRef.current = setInterval(async () => {
      // 获取最新的loss数据
      await fetchLossData(taskId)
      
      // 获取最新的任务状态
      const currentTask = await fetchTaskStatus(taskId)
      if (!currentTask) {
        // 如果无法获取任务状态，停止轮询
        stopLossPolling()
        return
      }
      
      const isTaskRunning = currentTask.status?.toLowerCase() === 'running'
      const isTaskCompleted = currentTask.status?.toLowerCase() === 'succeeded' || 
                             currentTask.status?.toLowerCase() === 'completed'
      
      // 如果任务已完成，获取eval结果并停止轮询
      if (isTaskCompleted) {
        if (!evalResults) {
          await fetchEvalResults(taskId)
        }
        // 停止轮询
        stopLossPolling()
        return
      }
      
      // 如果任务不再运行中（可能是失败、停止等状态），也停止轮询
      if (!isTaskRunning) {
        stopLossPolling()
        return
      }
    }, 3000)
  }

  // 开始轮询日志数据
  const startLogsPolling = (taskId: string) => {
    // 清除之前的轮询
    if (logsPollingIntervalRef.current) {
      clearInterval(logsPollingIntervalRef.current)
    }
    
    // 每5秒轮询一次日志数据
    logsPollingIntervalRef.current = setInterval(async () => {
      await fetchLogsData(taskId)
    }, 5000)
  }

  // 停止日志轮询
  const stopLogsPolling = () => {
    if (logsPollingIntervalRef.current) {
      clearInterval(logsPollingIntervalRef.current)
      logsPollingIntervalRef.current = null
    }
  }

  // 停止Loss轮询
  const stopLossPolling = () => {
    if (lossPollingIntervalRef.current) {
      clearInterval(lossPollingIntervalRef.current)
      lossPollingIntervalRef.current = null
    }
  }

  // 查看训练任务结果
  const handleViewResults = async (taskId: string) => {
    setSelectedTaskForResults(taskId)
    setShowResultsDialog(true)
    setResultsLoading(true)
    setLossData(null)
    setEvalResults(null)
    
    try {
      // 查找当前任务的状态
      const currentTask = models.find(model => model.task_id === taskId)
      const isTaskRunning = currentTask && currentTask.status?.toLowerCase() === 'running'
      const isTaskCompleted = currentTask && 
        (currentTask.status?.toLowerCase() === 'succeeded' || 
         currentTask.status?.toLowerCase() === 'completed')
      
      // 立即获取loss数据
      await fetchLossData(taskId)
      
      // 如果任务正在运行，开始轮询loss数据
      if (isTaskRunning) {
        startLossPolling(taskId)
      }
      
      // 如果任务已完成，获取eval结果
      if (isTaskCompleted) {
        await fetchEvalResults(taskId)
      }
      
    } catch (error) {
      console.error('Error initializing training results:', error)
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "获取训练结果时发生错误",
      })
    } finally {
      setResultsLoading(false)
    }
  }

  // 打开删除训练任务确认对话框
  const handleDeleteTraining = (taskId: string) => {
    setSelectedTaskForDelete(taskId)
    setShowDeleteTaskDialog(true)
  }

  // 确认删除训练任务
  const handleConfirmDeleteTraining = async () => {
    if (!selectedTaskForDelete) return

    try {
      const response = await fetch(`/api/proxy/api/v1/unified_training/tasks/${selectedTaskForDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        // 关闭对话框并刷新任务列表
        setShowDeleteTaskDialog(false)
        setSelectedTaskForDelete(null)
        loadTrainingTasks(false)
        toast({
          title: "删除成功",
          description: "训练任务已删除",
        })
      } else {
        toast({
          variant: "destructive",
          title: "删除失败",
          description: "删除训练任务失败",
        })
      }
    } catch (error) {
      console.error('Error deleting training task:', error)
    }
  }

  // 打开删除部署确认对话框
  const handleDeleteDeployment = (deployment: any) => {
    setSelectedDeploymentForDelete(deployment)
    setShowDeleteDeploymentDialog(true)
  }

  // 确认删除部署
  const handleConfirmDeleteDeployment = async () => {
    if (!selectedDeploymentForDelete) return

    try {
      const requestBody = {
        docker_server_id: selectedDeploymentForDelete.docker_server_id,
        model_deploy_id: selectedDeploymentForDelete.id
      }
      
      console.log('Deleting model deployment with params:', requestBody)
      
      const response = await fetch('/api/proxy/api/v1/model_deploy/stop_model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          // 关闭对话框并刷新部署列表
          setShowDeleteDeploymentDialog(false)
          setSelectedDeploymentForDelete(null)
          loadDeployments(false)
          toast({
            title: "删除成功",
            description: "模型部署已删除",
          })
        } else {
          toast({
            variant: "destructive",
            title: "删除失败",
            description: data.msg,
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "删除失败",
          description: "删除模型部署失败",
        })
      }
    } catch (error) {
      console.error('Error deleting deployment:', error)
      toast({
        variant: "destructive",
        title: "删除失败",
        description: "删除模型部署时发生错误",
      })
    }
  }

  // 部署微调模型 - 打开部署对话框
  const handleDeployTrainedModel = (model: any) => {
    // 预填充部署表单数据
    setDeployFormData({
      docker_server_id: '',
      model_type: model.train_type === 'embedding' ? 0 : model.train_type === 'reranker' ? 1 : 0,
      model_path: model.output_dir || model.model_path || `/data/output/${model.task_id}`,
      svc_port: '',
      gpus_cfg: '',
      run_cfg: '',
      config_name: '',
      model_name: model.task_name || model.model_name || `trained_model_${model.task_id}`,
      embedding_dim: 1024
    })
    
    // 设置选中的模型用于部署
    setSelectedModelForDeploy(model)
    
    // 打开部署对话框
    setShowDeployDialog(true)
    
    // 每次打开对话框时都刷新Docker服务器列表
    loadDockerServers(true)
  }

  // 打开部署模型对话框
  const handleDeployModel = (model: any) => {
    // 检查是否有Docker服务器
    if (dockerServers.length === 0) {
      if (confirm('暂无可用的Docker服务器，是否前往添加Docker服务器？')) {
        setActiveTab('docker')
      }
      return
    }
    
    setSelectedModelForDeploy(model)
    setDeployFormData({
      docker_server_id: '',
      model_type: 0,
      model_path: model.final_model_path || model.output_dir || '',
      svc_port: '',
      gpus_cfg: '',
      run_cfg: '',
      config_name: '',
      model_name: '',
      embedding_dim: 1024
    })
    setShowDeployDialog(true)
    // 每次打开对话框时都刷新Docker服务器列表
    loadDockerServers(true)
  }

  // 确认部署模型
  const handleConfirmDeployModel = async () => {
    if (!deployFormData.docker_server_id) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请选择Docker服务器",
      })
      return
    }

    if (!deployFormData.model_path.trim()) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请输入模型路径",
      })
      return
    }

    try {
      const requestBody = {
        docker_server_id: deployFormData.docker_server_id,
        model_path: deployFormData.model_path,
        model_type: deployFormData.model_type,
        ...(deployFormData.svc_port && { svc_port: deployFormData.svc_port }),
        ...(deployFormData.gpus_cfg && { gpus_cfg: deployFormData.gpus_cfg }),
        ...(deployFormData.run_cfg && { run_cfg: deployFormData.run_cfg }),
        ...(deployFormData.config_name && { config_name: deployFormData.config_name }),
        ...(deployFormData.model_name && { model_name: deployFormData.model_name }),
        ...(deployFormData.model_type === 0 && deployFormData.embedding_dim && { embedding_dim: deployFormData.embedding_dim })
      }

      console.log('Deploying model with params:', requestBody)

      const response = await fetch('/api/proxy/api/v1/model_deploy/one_click_deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          // 重置表单
          setDeployFormData({
            docker_server_id: '',
            model_type: 0,
            model_path: '',
            svc_port: '',
            gpus_cfg: '',
            run_cfg: '',
            config_name: '',
            model_name: '',
            embedding_dim: 1024
          })
          setSelectedModelForDeploy(null)
          // 关闭对话框
          setShowDeployDialog(false)
          // 重新加载训练任务列表
          loadTrainingTasks(false)
          toast({
            variant: "success",
            title: "部署成功",
            description: "模型部署成功",
          })
        } else {
          toast({
            variant: "destructive",
            title: "部署失败",
            description: data.msg,
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "部署失败",
          description: "模型部署失败",
        })
      }
    } catch (error) {
      console.error('Error deploying model:', error)
      toast({
        variant: "destructive",
        title: "部署失败",
        description: "模型部署时发生错误",
      })
    }
  }

  // 添加Docker服务器
  const handleAddDockerServer = async () => {
    if (!dockerFormData.server_name || !dockerFormData.srv_base_url) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请填写服务器名称和服务器地址",
      })
      return
    }

    try {
      const response = await fetch('/api/proxy/api/v1/docker_servers/add_docker_server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dockerFormData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          // 重置表单
          setDockerFormData({ server_name: '', srv_base_url: '' })
          // 关闭对话框
          setShowAddDockerDialog(false)
          // 重新加载Docker服务器列表
          loadDockerServers(false)
        } else {
          toast({
            variant: "destructive",
            title: "添加失败",
            description: data.msg,
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "添加失败",
          description: "添加Docker服务器失败",
        })
      }
    } catch (error) {
      console.error('Error adding docker server:', error)
      toast({
        variant: "destructive",
        title: "添加失败",
        description: "添加Docker服务器时发生错误",
      })
    }
  }

  // 编辑Docker服务器
  const handleEditDockerServer = (server: any) => {
    setSelectedDockerServer(server)
    setDockerFormData({
      server_name: server.server_name || server.name || '',
      srv_base_url: server.srv_base_url || server.base_url || server.url || ''
    })
    setShowEditDockerDialog(true)
  }

  // 更新Docker服务器
  const handleUpdateDockerServer = async () => {
    if (!dockerFormData.server_name || !dockerFormData.srv_base_url) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请填写服务器名称和服务器地址",
      })
      return
    }

    try {
      const response = await fetch('/api/proxy/api/v1/docker_servers/edit_docker_server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedDockerServer.id || selectedDockerServer.server_id,
          server_name: dockerFormData.server_name,
          srv_base_url: dockerFormData.srv_base_url
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          // 重置表单
          setDockerFormData({ server_name: '', srv_base_url: '' })
          setSelectedDockerServer(null)
          // 关闭对话框
          setShowEditDockerDialog(false)
          // 重新加载Docker服务器列表
          loadDockerServers(false)
        } else {
          toast({
            variant: "destructive",
            title: "更新失败",
            description: data.msg,
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "更新失败",
          description: "更新Docker服务器失败",
        })
      }
    } catch (error) {
      console.error('Error updating docker server:', error)
      toast({
        variant: "destructive",
        title: "更新失败",
        description: "更新Docker服务器时发生错误",
      })
    }
  }

  // 删除Docker服务器
  const handleDeleteDockerServer = (server: any) => {
    setSelectedDockerServer(server)
    setShowDeleteDockerDialog(true)
  }

  // 打开删除模型确认对话框
  const handleDeleteModel = (model: any) => {
    setSelectedModelForDelete(model)
    setShowDeleteModelDialog(true)
  }

  // 确认删除模型
  const handleConfirmDeleteModel = async () => {
    if (!selectedModelForDelete) return

    try {
      const requestBody = {
        model_id: selectedModelForDelete.id || selectedModelForDelete.model_id
      }

      console.log('Deleting model with params:', requestBody)

      const response = await fetch('/api/proxy/api/v1/models/delete_model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          // 关闭对话框并重新加载模型列表
          setShowDeleteModelDialog(false)
          setSelectedModelForDelete(null)
          loadModelList(false, modelConfigNameFilter, modelTypeFilter, currentModelPage)
          toast({
            title: "删除成功",
            description: "模型配置已删除",
          })
        } else {
          toast({
            variant: "destructive",
            title: "删除失败",
            description: data.msg,
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "删除失败",
          description: "删除模型失败",
        })
      }
    } catch (error) {
      console.error('Error deleting model:', error)
      toast({
        variant: "destructive",
        title: "删除失败",
        description: "删除模型时发生错误",
      })
    }
  }

  // 添加模型
  const handleAddModel = async () => {
    if (!addModelFormData.config_name.trim() || 
        !addModelFormData.model_base_url.trim() || 
        !addModelFormData.model_name.trim() || 
        !addModelFormData.model_api_key.trim() ||
        (addModelFormData.model_type === 'embedding' && !addModelFormData.embedding_dim)) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请填写所有必填字段",
      })
      return
    }

    try {
      const requestBody = {
        config_name: addModelFormData.config_name,
        model_base_url: addModelFormData.model_base_url,
        model_name: addModelFormData.model_name,
        model_api_key: addModelFormData.model_api_key,
        model_type: addModelFormData.model_type,
        ...(addModelFormData.model_type === 'embedding' && { embedding_dim: addModelFormData.embedding_dim })
      }

      console.log('Adding model with params:', requestBody)

      const response = await fetch('/api/proxy/api/v1/models/add_model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          // 重置表单
          setAddModelFormData({
            config_name: '',
            model_base_url: '',
            model_name: '',
            model_api_key: '',
            model_type: 'embedding',
            embedding_dim: 1024
          })
          // 关闭对话框
          setShowAddModelDialog(false)
          // 重新加载模型列表
          loadModelList(false, modelConfigNameFilter, modelTypeFilter, currentModelPage)
          toast({
            variant: "success",
            title: "添加成功",
            description: "模型添加成功",
          })
        } else {
          toast({
            variant: "destructive",
            title: "添加失败",
            description: data.msg,
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "添加失败",
          description: "添加模型失败",
        })
      }
    } catch (error) {
      console.error('Error adding model:', error)
      toast({
        variant: "destructive",
        title: "添加失败",
        description: "添加模型时发生错误",
      })
    }
  }

  // 确认删除Docker服务器
  const handleConfirmDeleteDockerServer = async () => {
    try {
      const response = await fetch('/api/proxy/api/v1/docker_servers/delete_docker_server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedDockerServer.id || selectedDockerServer.server_id
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          setSelectedDockerServer(null)
          // 关闭对话框
          setShowDeleteDockerDialog(false)
          // 重新加载Docker服务器列表
          loadDockerServers(false)
        } else {
          toast({
            variant: "destructive",
            title: "删除失败",
            description: data.msg,
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "删除失败",
          description: "删除Docker服务器失败",
        })
      }
    } catch (error) {
      console.error('Error deleting docker server:', error)
      toast({
        variant: "destructive",
        title: "删除失败",
        description: "删除Docker服务器时发生错误",
      })
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-100 flex flex-col">
      
      <header className="bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm shrink-0">
        <div className="container mx-auto px-6 py-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="hover:bg-white/60 backdrop-blur-sm transition-all duration-200 border border-transparent hover:border-white/30"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    模型训练中心
                  </h1>
                  <p className="text-sm text-gray-500">模型微调、训练与部署管理</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* 移动到模型训练tab内部 */}
            </div>
          </div>
          
          {/* 导航标签页 */}
          <div className="flex items-center gap-1 bg-slate-100/80 backdrop-blur-sm p-1 rounded-lg w-fit">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="h-9 px-4 rounded-md text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-white/50"
            >
              <FileText className="h-4 w-4 mr-2" />
              知识库管理
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-9 px-4 rounded-md text-sm font-medium bg-white shadow-sm text-slate-800"
            >
              <Brain className="h-4 w-4 mr-2" />
              模型训练
            </Button>
          </div>
          
          {/* 模型训练中心子导航 */}
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-lg w-fit mt-4">
            <Button
              variant={activeTab === 'training' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('training')}
              className={`h-9 px-4 rounded-md text-sm font-medium ${
                activeTab === 'training' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <Brain className="h-4 w-4 mr-2" />
              模型微调
            </Button>
            <Button
              variant={activeTab === 'deployment' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('deployment')}
              className={`h-9 px-4 rounded-md text-sm font-medium ${
                activeTab === 'deployment' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <Rocket className="h-4 w-4 mr-2" />
              已部署模型
            </Button>
            <Button
              variant={activeTab === 'docker' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('docker')}
              className={`h-9 px-4 rounded-md text-sm font-medium ${
                activeTab === 'docker' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <Server className="h-4 w-4 mr-2" />
              部署服务器
            </Button>
            <Button
              variant={activeTab === 'models' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('models')}
              className={`h-9 px-4 rounded-md text-sm font-medium ${
                activeTab === 'models' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <List className="h-4 w-4 mr-2" />
              外部模型
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto px-6 py-6 h-full flex flex-col">
          
          {/* 根据选中的tab显示不同内容 */}
          {activeTab === 'training' && (
            /* 模型训练任务列表 */
            <div className="flex-1 overflow-hidden">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm h-full flex flex-col">
                <div className="p-6 border-b border-gray-200/50 shrink-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">模型微调任务</h3>
                      <p className="text-sm text-gray-600 mt-1">管理您的模型微调、训练和部署任务</p>
                    </div>
                    <Button
                      onClick={() => router.push('/models/fine-tuning')}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      创建微调任务
                    </Button>
                  </div>
                </div>


                {loading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600">加载训练任务中...</p>
                    </div>
                  </div>
                ) : models.length === 0 ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Brain className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="text-xl font-semibold text-gray-800 mb-2">暂无训练任务</h4>
                      <p className="text-gray-600 mb-6 max-w-md">
                        点击右上角的"创建微调任务"按钮开始创建您的模型训练任务。
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                      <table className="w-full caption-bottom text-sm min-w-[900px]">
                        <thead className="sticky top-0 bg-white/60 backdrop-blur-sm z-20 shadow-sm border-b border-gray-200/50">
                        <TableRow className="hover:bg-gray-50/50 border-0">
                          <TableHead className="text-gray-700 font-semibold min-w-[120px]">任务名称</TableHead>
                          <TableHead className="text-gray-700 font-semibold min-w-[100px]">训练类型</TableHead>
                          <TableHead className="text-gray-700 font-semibold min-w-[80px]">状态</TableHead>
                          <TableHead className="text-gray-700 font-semibold min-w-[100px]">进度</TableHead>
                          <TableHead className="text-gray-700 font-semibold min-w-[150px]">基础模型</TableHead>
                          <TableHead className="text-gray-700 font-semibold min-w-[150px] max-w-[180px]">失败原因</TableHead>
                          <TableHead className="text-gray-700 font-semibold min-w-[160px]">创建时间</TableHead>
                          <TableHead className="text-gray-700 font-semibold min-w-[150px] text-center">操作</TableHead>
                        </TableRow>
                      </thead>
                    <TableBody>
                      {models.map((model, index) => (
                        <TableRow key={model.task_id || model.id || index} className="border-0 hover:bg-purple-50/30 transition-colors duration-200">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-r from-purple-500 to-pink-500">
                              <Brain className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{model.task_name || model.model_name || `任务 ${model.task_id}`}</div>
                              <div className="text-sm text-gray-500">ID: {model.task_id}</div>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${
                            model.train_type === 'embedding' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                            model.train_type === 'reranker' ? 'bg-green-100 text-green-700 border-green-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {model.train_type || 'unknown'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className={`text-xs border ${getStatusColor(model.status)}`}>
                            {model.status?.toLowerCase() === 'running' ? '运行中' :
                             model.status?.toLowerCase() === 'succeeded' ? '已完成' :
                             model.status?.toLowerCase() === 'completed' ? '已完成' :
                             model.status?.toLowerCase() === 'deployed' ? '已部署' :
                             model.status?.toLowerCase() === 'failed' ? '失败' :
                             model.status?.toLowerCase() === 'pending' ? '等待中' :
                             model.status?.toLowerCase() === 'stopped' ? '已停止' : model.status || '未知'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                {model.progress !== undefined ? 
                                  (typeof model.progress === 'number' ? 
                                    (model.progress < 1 ? `${(model.progress * 100).toFixed(1)}%` : `${Math.round(model.progress)}%`) :
                                    `${model.progress}%`) : 
                                 model.status?.toLowerCase() === 'succeeded' ? '100%' :
                                 model.status?.toLowerCase() === 'running' ? '进行中' :
                                 model.status?.toLowerCase() === 'failed' ? '失败' : '0%'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${model.progress !== undefined ? 
                                          (typeof model.progress === 'number' ? 
                                            (model.progress < 1 ? model.progress * 100 : Math.min(model.progress, 100)) : 
                                            parseFloat(model.progress) || 0) :
                                          model.status?.toLowerCase() === 'succeeded' ? 100 :
                                          model.status?.toLowerCase() === 'running' ? 50 :
                                          model.status?.toLowerCase() === 'failed' ? 25 : 0}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {model.model_name_or_path || 'distilbert-base-uncased'}
                          </code>
                        </TableCell>

                        <TableCell>
                          {model.status?.toLowerCase() === 'failed' && model.error_message ? (
                            <div className="max-w-sm">
                              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                                <div className="flex items-start gap-1">
                                  <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                  <span className="break-words leading-relaxed">{model.error_message}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>

                        <TableCell className="text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-sm">
                              {model.created_at ? formatDate(model.created_at) :
                               model.created_time ? formatDate(model.created_time) :
                               model.create_time ? formatDate(model.create_time) : '未知'}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 whitespace-nowrap">
                          <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-3 hover:bg-green-100 hover:text-green-600 whitespace-nowrap"
                                  title="查看训练日志"
                                  onClick={() => handleViewLogs(model.task_id)}
                                >
                                  <FileText className="h-4 w-4 mr-1" />日志
                                </Button>
                            {model.status?.toLowerCase() === 'running' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-3 hover:bg-blue-100 hover:text-blue-600 whitespace-nowrap"
                                  title="查看数据集"
                                  onClick={() => handleViewDataset(model.task_id)}
                                >
                                  <Database className="h-4 w-4 mr-1" />数据集
                                </Button>
                               
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-3 hover:bg-red-100 hover:text-red-600 whitespace-nowrap"
                                  title="停止训练"
                                  onClick={() => handleStopTraining(model.task_id)}
                                >
                                  <StopCircle className="h-4 w-4 mr-1" />停止
                                </Button>
                              </>
                            )}
                            {(model.status?.toLowerCase() === 'running' || 
                              model.status?.toLowerCase() === 'succeeded' || 
                              model.status?.toLowerCase() === 'completed') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 hover:bg-orange-100 hover:text-orange-600 whitespace-nowrap"
                                title="查看结果"
                                onClick={() => handleViewResults(model.task_id)}
                              >
                                <BarChart className="h-4 w-4 mr-1" />结果
                              </Button>
                            )}
                            {(model.status?.toLowerCase() === 'succeeded' || model.status?.toLowerCase() === 'completed') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 hover:bg-purple-100 hover:text-purple-600 whitespace-nowrap"
                                title="部署模型"
                                onClick={() => handleDeployTrainedModel(model)}
                              >
                                <Rocket className="h-4 w-4 mr-1" />部署
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        </TableRow>
                      ))}
                      </TableBody>
                      </table>
                  </div>
                )}
                
                {/* 微调任务分页控件 - 参照模型列表样式 */}
                {allModels.length > 0 && totalTrainingPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>第 {currentTrainingPage} 页，共 {totalTrainingPages} 页</span>
                        </div>
                        {allModels.length > 0 && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <span>共</span>
                            <span className="font-medium text-purple-600">{allModels.length}</span>
                            <span>条记录</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTrainingPageChange(Math.max(1, currentTrainingPage - 1))}
                          disabled={currentTrainingPage <= 1}
                          className="h-9 px-3 text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          上一页
                        </Button>

                        {totalTrainingPages <= 7 ? (
                          Array.from({ length: totalTrainingPages }, (_, i) => (
                            <Button
                              key={i + 1}
                              variant={currentTrainingPage === i + 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleTrainingPageChange(i + 1)}
                              className={`h-9 w-9 p-0 transition-all duration-200 ${
                                currentTrainingPage === i + 1 
                                  ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700 shadow-sm' 
                                  : 'bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600'
                              }`}
                            >
                              <span className="text-sm font-medium">{i + 1}</span>
                            </Button>
                          ))
                        ) : (
                            <>
                              {currentTrainingPage > 3 && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTrainingPageChange(1)}
                                    className="h-9 w-9 p-0 bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600"
                                  >
                                    <span className="text-sm font-medium">1</span>
                                  </Button>
                                  {currentTrainingPage > 4 && <span className="px-2 text-gray-400 text-sm">•••</span>}
                                </>
                              )}

                              {Array.from({ length: Math.min(5, totalTrainingPages) }, (_, i) => {
                                const page = Math.max(1, Math.min(totalTrainingPages - 4, currentTrainingPage - 2)) + i;
                                if (page > totalTrainingPages) return null;
                                return (
                                  <Button
                                    key={page}
                                    variant={currentTrainingPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleTrainingPageChange(page)}
                                    className={`h-9 w-9 p-0 transition-all duration-200 ${
                                      currentTrainingPage === page 
                                        ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700 shadow-md' 
                                        : 'bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600'
                                    }`}
                                  >
                                    <span className="text-sm font-medium">{page}</span>
                                  </Button>
                                );
                              })}

                              {currentTrainingPage < totalTrainingPages - 2 && (
                                <>
                                  {currentTrainingPage < totalTrainingPages - 3 && <span className="px-2 text-gray-400 text-sm">•••</span>}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTrainingPageChange(totalTrainingPages)}
                                    className="h-9 w-9 p-0 bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600"
                                  >
                                    <span className="text-sm font-medium">{totalTrainingPages}</span>
                                  </Button>
                                </>
                              )}
                            </>
                          )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTrainingPageChange(Math.min(totalTrainingPages, currentTrainingPage + 1))}
                          disabled={currentTrainingPage >= totalTrainingPages}
                          className="h-9 px-3 text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          下一页
                        </Button>
                      </div>

                      {totalTrainingPages > 7 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">跳转到</span>
                          <Input
                            type="number"
                            min={1}
                            max={totalTrainingPages}
                            value={currentTrainingPage}
                            onChange={(e) => {
                              const page = Math.max(1, Math.min(totalTrainingPages, parseInt(e.target.value) || 1))
                              handleTrainingPageChange(page)
                            }}
                            className="w-16 h-8 text-center text-sm"
                          />
                          <span className="text-sm text-gray-600">页</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'deployment' && (
            <div className="flex-1 overflow-hidden">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm h-full flex flex-col">
                <div className="p-6 shrink-0">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">模型部署管理</h3>
                      <p className="text-sm text-gray-600 mt-1">部署训练完成的模型到推理服务</p>
                    </div>
                    <Button
                      onClick={() => {
                        console.log('dianji===============');
                        console.log('dianji=====123123==========');
                        console.log('dianji===============');
                        setSelectedModelForDeploy(completedModels.length > 0 ? completedModels[0] : null)
                        setShowDeployDialog(true)
                      }}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      部署模型
                    </Button>
                  </div>
                </div>

                <div className="px-6 pb-4 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <Select
                      value={deploymentModelTypeFilter}
                      onValueChange={(value) => {
                        setDeploymentModelTypeFilter(value)
                        setCurrentDeployPage(1) // 重置到第一页
                      }}
                    >
                      <SelectTrigger className="pl-10 bg-white/70 border-gray-200 focus:border-purple-400 focus:bg-white">
                        <SelectValue placeholder="选择模型类型筛选..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部类型</SelectItem>
                        <SelectItem value="0">embedding</SelectItem>
                        <SelectItem value="1">reranker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {deploymentsLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600">加载部署列表中...</p>
                    </div>
                  </div>
                ) : filteredDeployments.length === 0 ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Rocket className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="text-xl font-semibold text-gray-800 mb-2">
                        {deployments.length === 0 ? '暂无部署记录' : '暂无匹配的部署记录'}
                      </h4>
                      <p className="text-gray-600 mb-6 max-w-md">
                        {deployments.length === 0 
                          ? '点击右上角的"模型部署"按钮开始部署您的模型到Docker服务器。'
                          : '请尝试更改筛选条件以查看其他部署记录。'
                        }
                      </p>
                      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-purple-600 font-medium mb-2">可部署模型</div>
                          <div className="text-2xl font-bold text-purple-700">{completedModels.length}</div>
                        </div>
                        <div 
                          className={`bg-green-50 p-4 rounded-lg ${dockerServers.length === 0 ? 'cursor-pointer hover:bg-green-100 transition-colors' : ''}`}
                          onClick={() => {
                            if (dockerServers.length === 0) {
                              setActiveTab('docker')
                            }
                          }}
                        >
                          <div className="text-green-600 font-medium mb-2">Docker服务器</div>
                          <div className="text-2xl font-bold text-green-700">{dockerServers.length}</div>
                          {dockerServers.length === 0 && (
                            <div className="text-xs text-green-600 mt-1">点击添加服务器</div>
                          )}
                        </div>
                      </div> */}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                      <table className="w-full caption-bottom text-sm min-w-[950px]">
                        <thead className="sticky top-0 bg-white/60 backdrop-blur-sm z-20 shadow-sm border-b border-gray-200/50">
                          <TableRow className="hover:bg-gray-50/50 border-0">
                            <TableHead className="text-gray-700 font-semibold min-w-[280px]">模型名称</TableHead>
                            <TableHead className="text-gray-700 font-semibold min-w-[120px]">模型类型</TableHead>
                            <TableHead className="text-gray-700 font-semibold min-w-[150px]">创建时间</TableHead>
                            <TableHead className="text-gray-700 font-semibold min-w-[150px]">部署ID</TableHead>
                            <TableHead className="text-gray-700 font-semibold min-w-[150px]">Container ID</TableHead>
                            <TableHead className="text-gray-700 font-semibold min-w-[120px]">操作</TableHead>
                          </TableRow>
                        </thead>
                        <tbody>
                          {filteredDeployments.map((deployment, index) => (
                            <TableRow key={deployment.id || index} className="border-0 hover:bg-purple-50/30 transition-colors duration-200">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-r from-purple-500 to-pink-500">
                                    <Rocket className="h-5 w-5 text-white" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-900 truncate max-w-[200px]" title={deployment.model_name || deployment.model_path?.split('/').pop() || '未知模型'}>
                                      {deployment.model_name || deployment.model_path?.split('/').pop() || '未知模型'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {deployment.model_path ? `路径: ${deployment.model_path}` : '部署模型'}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-xs ${
                                  deployment.model_type === 0 ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                  deployment.model_type === 1 ? 'bg-green-100 text-green-700 border-green-200' :
                                  'bg-gray-100 text-gray-700 border-gray-200'
                                }`}>
                                  {deployment.model_type === 0 ? 'embedding' : deployment.model_type === 1 ? 'reranker' : '未知'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span className="text-sm">
                                    {deployment.create_time ? formatDate(deployment.create_time) :
                                     deployment.created_time ? formatDate(deployment.created_time) :
                                     deployment.created_at ? formatDate(deployment.created_at) : '未知'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {deployment.id || `deploy_${index + 1}`}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                  {deployment.container_id ? deployment.container_id.slice(0, 12) : 'N/A'}
                                </code>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-3 hover:bg-red-100 hover:text-red-600"
                                    title="删除部署"
                                    onClick={() => handleDeleteDeployment(deployment)}
                                  >
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    删除
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </tbody>
                      </table>
                  </div>
                )}
                
                {/* 分页控件 - 只要有数据就显示 */}
                {filteredDeployments.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>第 {currentDeployPage} 页，共 {totalDeployPages} 页</span>
                        </div>
                        {deployments.length > 0 && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <span>共</span>
                            <span className="font-medium text-purple-600">{deployments.length}</span>
                            <span>条记录</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentDeployPage(prev => Math.max(1, prev - 1))}
                          disabled={currentDeployPage <= 1}
                          className="h-9 px-4 bg-white hover:bg-purple-50 border-purple-200 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          <span className="text-sm">‹ 上一页</span>
                        </Button>
                        
                        {/* 页码显示 - 智能显示页码 */}
                        <div className="flex items-center gap-1">
                          {totalDeployPages <= 7 ? (
                            // 页数少时显示所有页码
                            Array.from({ length: totalDeployPages }, (_, i) => (
                              <Button
                                key={i + 1}
                                variant={currentDeployPage === i + 1 ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentDeployPage(i + 1)}
                                className={`h-9 w-9 p-0 transition-all duration-200 ${
                                  currentDeployPage === i + 1 
                                    ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700 shadow-md' 
                                    : 'bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600'
                                }`}
                              >
                                <span className="text-sm font-medium">{i + 1}</span>
                              </Button>
                            ))
                          ) : (
                            // 页数多时智能显示
                            <>
                              {currentDeployPage > 3 && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentDeployPage(1)}
                                    className="h-9 w-9 p-0 bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600 transition-all duration-200"
                                  >
                                    <span className="text-sm font-medium">1</span>
                                  </Button>
                                  {currentDeployPage > 4 && <span className="px-2 text-gray-400 text-sm">•••</span>}
                                </>
                              )}
                              
                              {Array.from({ length: Math.min(5, totalDeployPages) }, (_, i) => {
                                const page = Math.max(1, Math.min(totalDeployPages - 4, currentDeployPage - 2)) + i;
                                if (page > totalDeployPages) return null;
                                return (
                                  <Button
                                    key={page}
                                    variant={currentDeployPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentDeployPage(page)}
                                    className={`h-9 w-9 p-0 transition-all duration-200 ${
                                      currentDeployPage === page 
                                        ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700 shadow-md' 
                                        : 'bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600'
                                    }`}
                                  >
                                    <span className="text-sm font-medium">{page}</span>
                                  </Button>
                                );
                              })}
                              
                              {currentDeployPage < totalDeployPages - 2 && (
                                <>
                                  {currentDeployPage < totalDeployPages - 3 && <span className="px-2 text-gray-400 text-sm">•••</span>}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentDeployPage(totalDeployPages)}
                                    className="h-9 w-9 p-0 bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600 transition-all duration-200"
                                  >
                                    <span className="text-sm font-medium">{totalDeployPages}</span>
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentDeployPage(prev => Math.min(totalDeployPages, prev + 1))}
                          disabled={currentDeployPage >= totalDeployPages}
                          className="h-9 px-4 bg-white hover:bg-purple-50 border-purple-200 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          <span className="text-sm">下一页 ›</span>
                        </Button>
                        
                        {/* 快速跳转 */}
                        {totalDeployPages > 7 && (
                          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-200">
                            <span className="text-sm text-gray-500">跳转</span>
                            <input
                              type="number"
                              min="1"
                              max={totalDeployPages}
                              value={currentDeployPage}
                              onChange={(e) => {
                                const page = Math.max(1, Math.min(totalDeployPages, parseInt(e.target.value) || 1))
                                setCurrentDeployPage(page)
                              }}
                              className="w-16 h-8 px-2 text-center text-sm border border-gray-200 rounded focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
                            />
                            <span className="text-sm text-gray-500">页</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'docker' && (
            /* Docker服务器管理 */
            <div className="flex-1 overflow-hidden">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm h-full flex flex-col">
                <div className="p-6 border-b border-gray-200/50 shrink-0">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Docker服务器管理</h3>
                      <p className="text-sm text-gray-600 mt-1">监控和管理Docker容器化的模型服务</p>
                    </div>
                    <Button
                      onClick={() => setShowAddDockerDialog(true)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      添加Docker服务器
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="搜索服务器名称或地址..."
                        value={dockerSearchQuery}
                        onChange={(e) => setDockerSearchQuery(e.target.value)}
                        className="pl-10 bg-white/70 border-gray-200 focus:border-purple-400 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {dockerLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600">加载Docker服务器中...</p>
                    </div>
                  </div>
                ) : filteredDockerServers.length === 0 ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Server className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="text-xl font-semibold text-gray-800 mb-2">
                        {dockerServers.length === 0 ? '暂无Docker服务器' : '未找到匹配的Docker服务器'}
                      </h4>
                      <p className="text-gray-600 mb-6 max-w-md">
                        {dockerServers.length === 0 
                          ? '点击右上角的"添加Docker服务器"按钮开始添加您的服务器。'
                          : '请尝试更改搜索条件以查看其他服务器。'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                      <table className="w-full caption-bottom text-sm min-w-[800px]">
                        <thead className="sticky top-0 bg-white/60 backdrop-blur-sm z-20 shadow-sm border-b border-gray-200/50">
                        <TableRow className="hover:bg-gray-50/50 border-0">
                          <TableHead className="text-gray-700 font-semibold min-w-[280px]">服务器名称</TableHead>
                          <TableHead className="text-gray-700 font-semibold min-w-[300px]">服务器地址</TableHead>
                          <TableHead className="text-gray-700 font-semibold min-w-[160px]">创建时间</TableHead>
                          <TableHead className="text-right text-gray-700 font-semibold min-w-[200px]">操作</TableHead>
                        </TableRow>
                      </thead>
                    <TableBody>
                      {filteredDockerServers.map((server, index) => (
                        <TableRow key={server.id || server.server_name || index} className="border-0 hover:bg-purple-50/30 transition-colors duration-200">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-r from-purple-500 to-pink-500">
                              <Server className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{server.server_name || server.name || `服务器-${index + 1}`}</div>
                              <div className="text-sm text-gray-500">ID: {server.id || server.server_id || `srv-${index}`}</div>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <code className="text-xs bg-purple-50 px-2 py-1 rounded text-purple-700">
                            {server.srv_base_url || server.base_url || server.url || 'N/A'}
                          </code>
                        </TableCell>

                        <TableCell className="text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-sm">
                              {server.created_at ? formatDate(server.created_at) :
                               server.start_time ? formatDate(server.start_time) :
                               server.create_time ? formatDate(server.create_time) : '未知'}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-3 hover:bg-purple-100 hover:text-purple-600"
                              title="编辑服务器"
                              onClick={() => handleEditDockerServer(server)}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-3 hover:bg-red-100 hover:text-red-600"
                              title="删除服务器"
                              onClick={() => handleDeleteDockerServer(server)}
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        </TableCell>
                        </TableRow>
                      ))}
                      </TableBody>
                      </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            /* 模型列表 */
            <div className="flex-1 overflow-hidden">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm h-full flex flex-col">
                <div className="p-6 border-b border-gray-200/50 shrink-0">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">模型列表</h3>
                      <p className="text-sm text-gray-600 mt-1">查看和管理可用的模型</p>
                    </div>
                    <Button
                      onClick={() => setShowAddModelDialog(true)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all duration-200 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      添加模型
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="搜索配置名称..."
                        value={modelConfigNameFilter}
                        onChange={(e) => setModelConfigNameFilter(e.target.value)}
                        className="bg-white/70 border-gray-200 focus:border-purple-400 focus:bg-white"
                      />
                    </div>
                    <div className="w-48">
                      <Select
                        value={modelTypeFilter}
                        onValueChange={setModelTypeFilter}
                      >
                        <SelectTrigger className="bg-white/70 border-gray-200 focus:border-purple-400 focus:bg-white">
                          <SelectValue placeholder="选择模型类型..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部类型</SelectItem>
                          <SelectItem value="embedding">Embedding</SelectItem>
                          <SelectItem value="reranker">Reranker</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {modelListLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600">加载模型列表中...</p>
                    </div>
                  </div>
                ) : modelList.length === 0 ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <List className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="text-xl font-semibold text-gray-800 mb-2">暂无模型</h4>
                      <p className="text-gray-600 mb-6 max-w-md">
                        系统中暂时没有可用的模型，点击右上角的"添加模型"按钮开始添加模型配置。
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                      <table className="w-full caption-bottom text-sm min-w-[800px]">
                        <thead className="sticky top-0 bg-white/60 backdrop-blur-sm z-20 shadow-sm border-b border-gray-200/50">
                          <TableRow className="hover:bg-gray-50/50 border-0">
                            <TableHead className="text-gray-700 font-semibold min-w-[200px]">配置名称</TableHead>
                            <TableHead className="text-gray-700 font-semibold min-w-[120px]">模型类型</TableHead>
                            <TableHead className="text-gray-700 font-semibold min-w-[150px]">创建时间</TableHead>
                            <TableHead className="text-gray-700 font-semibold min-w-[100px] text-right">操作</TableHead>
                          </TableRow>
                        </thead>
                        <TableBody>
                          {modelList.map((model, index) => (
                            <TableRow key={model.config_name || model.id || index} className="border-0 hover:bg-purple-50/30 transition-colors duration-200">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-r from-purple-500 to-pink-500">
                                    <List className="h-5 w-5 text-white" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-800">{model.config_name || model.name || '未命名配置'}</div>
                                    <div className="text-sm text-gray-500">ID: {model.id || `config_${index + 1}`}</div>
                                  </div>
                                </div>
                              </TableCell>
                              
                              <TableCell>
                                <Badge variant="outline" className={`text-xs ${
                                  model.model_type === 'embedding' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                  model.model_type === 'reranker' ? 'bg-green-100 text-green-700 border-green-200' :
                                  'bg-gray-100 text-gray-700 border-gray-200'
                                }`}>
                                  {model.model_type || 'unknown'}
                                </Badge>
                              </TableCell>

                              <TableCell className="text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span className="text-sm">
                                    {model.create_time ? formatDate(model.create_time) :
                                     model.created_at ? formatDate(model.created_at) :
                                     model.created_time ? formatDate(model.created_time) : '未知'}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-3 hover:bg-red-100 hover:text-red-600"
                                  title="删除模型"
                                  onClick={() => handleDeleteModel(model)}
                                >
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  删除
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </table>
                  </div>
                )}
                
                {/* 分页控件 - 只要有数据就显示 */}
                {modelList.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>第 {currentModelPage} 页，共 {totalModelPages} 页</span>
                        </div>
                        {modelList.length > 0 && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <span>共</span>
                            <span className="font-medium text-purple-600">{modelList.length}</span>
                            <span>条记录</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentModelPage(prev => Math.max(1, prev - 1))}
                          disabled={currentModelPage <= 1}
                          className="h-9 px-3 text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          上一页
                        </Button>

                        {totalModelPages <= 7 ? (
                          Array.from({ length: totalModelPages }, (_, i) => (
                            <Button
                              key={i + 1}
                              variant={currentModelPage === i + 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentModelPage(i + 1)}
                              className={`h-9 w-9 p-0 transition-all duration-200 ${
                                currentModelPage === i + 1 
                                  ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700 shadow-sm' 
                                  : 'bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600'
                              }`}
                            >
                              <span className="text-sm font-medium">{i + 1}</span>
                            </Button>
                          ))
                        ) : (
                            <>
                              {currentModelPage > 3 && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentModelPage(1)}
                                    className="h-9 w-9 p-0 bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600"
                                  >
                                    <span className="text-sm font-medium">1</span>
                                  </Button>
                                  {currentModelPage > 4 && <span className="px-2 text-gray-400 text-sm">•••</span>}
                                </>
                              )}

                              {Array.from({ length: Math.min(5, totalModelPages) }, (_, i) => {
                                const page = Math.max(1, Math.min(totalModelPages - 4, currentModelPage - 2)) + i;
                                if (page > totalModelPages) return null;
                                return (
                                  <Button
                                    key={page}
                                    variant={currentModelPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentModelPage(page)}
                                    className={`h-9 w-9 p-0 transition-all duration-200 ${
                                      currentModelPage === page 
                                        ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700 shadow-md' 
                                        : 'bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600'
                                    }`}
                                  >
                                    <span className="text-sm font-medium">{page}</span>
                                  </Button>
                                );
                              })}

                              {currentModelPage < totalModelPages - 2 && (
                                <>
                                  {currentModelPage < totalModelPages - 3 && <span className="px-2 text-gray-400 text-sm">•••</span>}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentModelPage(totalModelPages)}
                                    className="h-9 w-9 p-0 bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600"
                                  >
                                    <span className="text-sm font-medium">{totalModelPages}</span>
                                  </Button>
                                </>
                              )}
                            </>
                          )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentModelPage(prev => Math.min(totalModelPages, prev + 1))}
                          disabled={currentModelPage >= totalModelPages}
                          className="h-9 px-3 text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          下一页
                        </Button>
                        </div>

                        {totalModelPages > 7 && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">跳转到</span>
                            <Input
                              type="number"
                              min={1}
                              max={totalModelPages}
                              value={currentModelPage}
                              onChange={(e) => {
                                const page = Math.max(1, Math.min(totalModelPages, parseInt(e.target.value) || 1))
                                setCurrentModelPage(page)
                              }}
                              className="w-16 h-8 text-center text-sm"
                            />
                            <span className="text-sm text-gray-600">页</span>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 添加Docker服务器对话框 */}
      {showAddDockerDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) setShowAddDockerDialog(false)
        }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">添加Docker服务器</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddDockerDialog(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="server_name" className="text-sm font-medium text-gray-700">
                  服务器名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="server_name"
                  type="text"
                  placeholder="例如：105docker"
                  value={dockerFormData.server_name}
                  onChange={(e) => setDockerFormData(prev => ({ ...prev, server_name: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="srv_base_url" className="text-sm font-medium text-gray-700">
                  服务器地址 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="srv_base_url"
                  type="text"
                  placeholder="输入服务器地址"
                  value={dockerFormData.srv_base_url}
                  onChange={(e) => setDockerFormData(prev => ({ ...prev, srv_base_url: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddDockerDialog(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleAddDockerServer}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                添加
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑Docker服务器对话框 */}
      {showEditDockerDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) setShowEditDockerDialog(false)
        }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">编辑Docker服务器</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditDockerDialog(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_server_name" className="text-sm font-medium text-gray-700">
                  服务器名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_server_name"
                  type="text"
                  placeholder="例如：105docker"
                  value={dockerFormData.server_name}
                  onChange={(e) => setDockerFormData(prev => ({ ...prev, server_name: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_srv_base_url" className="text-sm font-medium text-gray-700">
                  服务器地址 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_srv_base_url"
                  type="text"
                  placeholder="输入服务器地址"
                  value={dockerFormData.srv_base_url}
                  onChange={(e) => setDockerFormData(prev => ({ ...prev, srv_base_url: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowEditDockerDialog(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleUpdateDockerServer}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                更新
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除Docker服务器确认对话框 */}
      {showDeleteDockerDialog && selectedDockerServer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) setShowDeleteDockerDialog(false)
        }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">确认删除</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDockerDialog(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                ✕
              </Button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                确定要删除Docker服务器 <strong>"{selectedDockerServer.server_name || selectedDockerServer.name}"</strong> 吗？
              </p>
              <p className="text-sm text-gray-500">
                此操作不可撤销，请谨慎操作。
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDockerDialog(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmDeleteDockerServer}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 模型部署对话框 */}
      {showDeployDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) setShowDeployDialog(false)
        }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">部署模型</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeployDialog(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* 必填字段 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    模型路径 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={deployFormData.model_path}
                    onChange={(e) => setDeployFormData(prev => ({ ...prev, model_path: e.target.value }))}
                    placeholder="例如：/data/model/swift/Qwen/Qwen3-Reranker-4B"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    模型类型 <span className="text-red-500">*</span>
                  </Label>
                  <Select value={deployFormData.model_type.toString()} onValueChange={(value) => setDeployFormData(prev => ({ ...prev, model_type: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择模型类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Embedding模型</SelectItem>
                      <SelectItem value="1">Reranker模型</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Docker服务器 <span className="text-red-500">*</span>
                </Label>
                <Select value={deployFormData.docker_server_id} onValueChange={(value) => setDeployFormData(prev => ({ ...prev, docker_server_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择Docker服务器" />
                  </SelectTrigger>
                  <SelectContent>
                    {dockerServers.length === 0 ? (
                      <SelectItem value="no-server" disabled>
                        暂无可用的Docker服务器，请先添加服务器
                      </SelectItem>
                    ) : (
                      dockerServers
                        .filter(server => (server.id || server.server_id)) // 过滤掉没有有效ID的服务器
                        .map((server) => {
                          const serverId = server.id || server.server_id
                          return (
                            <SelectItem key={serverId} value={serverId}>
                              {server.server_name || server.name} ({server.srv_base_url || server.base_url})
                            </SelectItem>
                          )
                        })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* 可选字段 */}
              <div className="border-t pt-4">
                <div className="mb-3">
                  <Label className="text-sm font-medium text-gray-600">高级配置（可选）</Label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">配置名称</Label>
                    <Input
                      value={deployFormData.config_name}
                      onChange={(e) => setDeployFormData(prev => ({ ...prev, config_name: e.target.value }))}
                      placeholder="例如：my-reranker-config"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">模型名称</Label>
                    <Input
                      value={deployFormData.model_name}
                      onChange={(e) => setDeployFormData(prev => ({ ...prev, model_name: e.target.value }))}
                      placeholder="例如：Qwen3-Reranker"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">服务端口</Label>
                    <Input
                      value={deployFormData.svc_port}
                      onChange={(e) => setDeployFormData(prev => ({ ...prev, svc_port: e.target.value }))}
                      placeholder="服务端口，不传则docker自动分配"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">GPU配置</Label>
                    <Input
                      value={deployFormData.gpus_cfg}
                      onChange={(e) => setDeployFormData(prev => ({ ...prev, gpus_cfg: e.target.value }))}
                      placeholder="格式: 'device=all' 或 'device=0,1'"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium text-gray-700">运行配置</Label>
                  <Textarea
                    value={deployFormData.run_cfg}
                    onChange={(e) => setDeployFormData(prev => ({ ...prev, run_cfg: e.target.value }))}
                    placeholder="例如：--hf-overrides {...}"
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>

                {/* 只有embedding模型才显示模型维度 */}
                {deployFormData.model_type === 0 && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-sm font-medium text-gray-700">模型维度</Label>
                    <Input
                      type="number"
                      min="1"
                      value={deployFormData.embedding_dim}
                      onChange={(e) => setDeployFormData(prev => ({ ...prev, embedding_dim: parseInt(e.target.value) || 1024 }))}
                      placeholder="默认1024"
                      className="text-xs"
                    />
                    <p className="text-xs text-gray-500">Embedding模型的向量维度，默认为1024</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowDeployDialog(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmDeployModel}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                部署
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 添加模型对话框 */}
      {showAddModelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) setShowAddModelDialog(false)
        }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">添加模型</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddModelDialog(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="config_name" className="text-sm font-medium text-gray-700">
                  配置名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="config_name"
                  type="text"
                  placeholder="例如：embedding-model1"
                  value={addModelFormData.config_name}
                  onChange={(e) => setAddModelFormData(prev => ({ ...prev, config_name: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model_base_url" className="text-sm font-medium text-gray-700">
                  模型Base URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="model_base_url"
                  type="text"
                  placeholder="输入服务器地址"
                  value={addModelFormData.model_base_url}
                  onChange={(e) => setAddModelFormData(prev => ({ ...prev, model_base_url: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model_name" className="text-sm font-medium text-gray-700">
                  模型名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="model_name"
                  type="text"
                  placeholder="例如：model1"
                  value={addModelFormData.model_name}
                  onChange={(e) => setAddModelFormData(prev => ({ ...prev, model_name: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model_api_key" className="text-sm font-medium text-gray-700">
                  API密钥 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="model_api_key"
                  type="password"
                  placeholder="输入API密钥..."
                  value={addModelFormData.model_api_key}
                  onChange={(e) => setAddModelFormData(prev => ({ ...prev, model_api_key: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model_type" className="text-sm font-medium text-gray-700">
                  模型类型 <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={addModelFormData.model_type} 
                  onValueChange={(value) => setAddModelFormData(prev => ({ ...prev, model_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="embedding">Embedding</SelectItem>
                    <SelectItem value="reranker">Reranker</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 只有embedding模型才显示模型维度 */}
              {addModelFormData.model_type === 'embedding' && (
                <div className="space-y-2">
                  <Label htmlFor="embedding_dim" className="text-sm font-medium text-gray-700">
                    模型维度 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="embedding_dim"
                    type="number"
                    min="1"
                    placeholder="默认1024"
                    value={addModelFormData.embedding_dim}
                    onChange={(e) => setAddModelFormData(prev => ({ ...prev, embedding_dim: parseInt(e.target.value) || 1024 }))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModelDialog(false)
                  // 重置表单
                  setAddModelFormData({
                    config_name: '',
                    model_base_url: '',
                    model_name: '',
                    model_api_key: '',
                    model_type: 'embedding',
                    embedding_dim: 1024
                  })
                }}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleAddModel}
                disabled={!addModelFormData.config_name.trim() || 
                         !addModelFormData.model_base_url.trim() || 
                         !addModelFormData.model_name.trim() || 
                         !addModelFormData.model_api_key.trim() ||
                         (addModelFormData.model_type === 'embedding' && !addModelFormData.embedding_dim)}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white"
              >
                添加模型
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除模型确认对话框 */}
      {showDeleteModelDialog && selectedModelForDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) setShowDeleteModelDialog(false)
        }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">确认删除</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModelDialog(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                ✕
              </Button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                确定要删除模型配置 <strong>"{selectedModelForDelete.config_name || selectedModelForDelete.name || '未知模型'}"</strong> 吗？
              </p>
              <p className="text-sm text-gray-500">
                此操作不可撤销，请谨慎操作。
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModelDialog(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmDeleteModel}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除训练任务确认对话框 */}
      {showDeleteTaskDialog && selectedTaskForDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) setShowDeleteTaskDialog(false)
        }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">确认删除</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteTaskDialog(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                ✕
              </Button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                确定要删除训练任务 <strong>"{selectedTaskForDelete}"</strong> 吗？
              </p>
              <p className="text-sm text-gray-500">
                此操作不可撤销，请谨慎操作。
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteTaskDialog(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmDeleteTraining}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 停止训练任务确认对话框 */}
      {showStopTaskDialog && selectedTaskForStop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) setShowStopTaskDialog(false)
        }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">确认停止</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStopTaskDialog(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                ✕
              </Button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                确定要停止训练任务 <strong>"{selectedTaskForStop}"</strong> 吗？
              </p>
              <p className="text-sm text-gray-500">
                停止后该任务将无法继续训练，请谨慎操作。
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowStopTaskDialog(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmStopTraining}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                确认停止
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 数据集查看对话框 */}
      {showDatasetDialog && selectedTaskForDataset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => {
          if (e.target === e.currentTarget) setShowDatasetDialog(false)
        }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200/50">
            {/* 头部区域 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-blue-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Database className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      数据集信息
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      任务ID: <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{selectedTaskForDataset}</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDatasetDialog(false)}
                  className="h-10 w-10 p-0 hover:bg-white/60 rounded-xl transition-all duration-200"
                >
                  <span className="text-gray-500 hover:text-gray-700 text-lg">✕</span>
                </Button>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-8">

              {datasetLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                      <Database className="h-6 w-6 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-gray-600 mt-4 font-medium">正在加载数据集信息...</p>
                    <p className="text-gray-400 text-sm mt-1">请稍候片刻</p>
                  </div>
                </div>
              ) : datasetInfo ? (
                <div className="space-y-6">
                  {datasetInfo.code === 200 ? (
                    <div className="space-y-6">
                      {/* 基本信息卡片 */}
                      {datasetInfo.data && (
                        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                              <FileText className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold text-blue-900">数据集基本信息</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {datasetInfo.data.dataset_name && (
                              <div className="bg-white/80 rounded-xl p-4 border border-blue-200/50 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-600">数据集名称</span>
                                  <Database className="h-4 w-4 text-blue-400" />
                                </div>
                                <p className="font-mono text-blue-700 font-semibold mt-2 text-base">{datasetInfo.data.dataset_name}</p>
                              </div>
                            )}
                            
                            {datasetInfo.data.dataset_path && (
                              <div className="bg-white/80 rounded-xl p-4 border border-blue-200/50 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-600">数据集路径</span>
                                  <FileText className="h-4 w-4 text-blue-400" />
                                </div>
                                <p className="font-mono text-blue-700 font-medium mt-2 text-sm break-all">{datasetInfo.data.dataset_path}</p>
                              </div>
                            )}
                            
                            {datasetInfo.data.total_samples !== undefined && (
                              <div className="bg-white/80 rounded-xl p-4 border border-blue-200/50 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-600">总样本数</span>
                                  <div className="w-4 h-4 bg-blue-400 rounded-sm flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">#</span>
                                  </div>
                                </div>
                                <p className="text-2xl font-bold text-blue-700 mt-2">{datasetInfo.data.total_samples.toLocaleString()}</p>
                              </div>
                            )}
                            
                            {datasetInfo.data.train_samples !== undefined && (
                              <div className="bg-white/80 rounded-xl p-4 border border-green-200/50 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-600">训练样本数</span>
                                  <div className="w-4 h-4 bg-green-400 rounded-sm flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">T</span>
                                  </div>
                                </div>
                                <p className="text-2xl font-bold text-green-700 mt-2">{datasetInfo.data.train_samples.toLocaleString()}</p>
                              </div>
                            )}
                            
                            {datasetInfo.data.val_samples !== undefined && (
                              <div className="bg-white/80 rounded-xl p-4 border border-orange-200/50 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-600">验证样本数</span>
                                  <div className="w-4 h-4 bg-orange-400 rounded-sm flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">V</span>
                                  </div>
                                </div>
                                <p className="text-2xl font-bold text-orange-700 mt-2">{datasetInfo.data.val_samples.toLocaleString()}</p>
                              </div>
                            )}
                            
                            {datasetInfo.data.dataset_size && (
                              <div className="bg-white/80 rounded-xl p-4 border border-purple-200/50 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-600">数据集大小</span>
                                  <div className="w-4 h-4 bg-purple-400 rounded-sm flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">S</span>
                                  </div>
                                </div>
                                <p className="font-mono text-purple-700 font-semibold mt-2 text-base">{datasetInfo.data.dataset_size}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {/* 详细JSON数据 */}
                    <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          <h4 className="text-lg font-semibold text-slate-900">完整数据集信息</h4>
                        </div>
                        <button
                          onClick={() => {
                            const jsonString = JSON.stringify(datasetInfo.data, null, 2)
                            navigator.clipboard.writeText(jsonString).then(() => {
                              toast({
                                title: "复制成功",
                                description: "数据集信息已复制到剪贴板",
                              })
                            }).catch(() => {
                              // 备选方案
                              const textArea = document.createElement('textarea')
                              textArea.value = jsonString
                              document.body.appendChild(textArea)
                              textArea.select()
                              try {
                                document.execCommand('copy')
                                toast({
                                  title: "复制成功", 
                                  description: "数据集信息已复制到剪贴板",
                                })
                              } catch (err) {
                                toast({
                                  variant: "destructive",
                                  title: "复制失败",
                                  description: "无法复制到剪贴板",
                                })
                              }
                              document.body.removeChild(textArea)
                            })
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 text-white rounded-xl transition-all duration-200 font-medium text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <span>📋</span>
                          复制JSON
                        </button>
                      </div>
                      <div className="bg-white/80 rounded-xl border border-slate-200/80 backdrop-blur-sm overflow-hidden">
                        <pre className="p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto text-slate-700 leading-relaxed">
                          {JSON.stringify(datasetInfo.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-red-50 via-rose-50 to-red-50 rounded-2xl p-6 border border-red-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">!</span>
                      </div>
                      <h4 className="text-lg font-semibold text-red-900">获取失败</h4>
                    </div>
                    <p className="text-red-700 bg-white/60 rounded-xl p-4 border border-red-200/50">
                      获取数据集信息失败: {datasetInfo.msg || '未知错误'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-50 via-slate-50 to-gray-50 rounded-2xl p-8 border border-gray-200 shadow-sm">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Database className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">暂无数据集信息</h4>
                  <p className="text-gray-500 text-sm">未找到相关的数据集信息</p>
                </div>
              </div>
            )}

            </div>

            {/* 底部操作区域 */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-8 py-6 border-t border-gray-200/50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <span>💡 提示：可点击复制按钮保存完整数据集信息</span>
                </div>
                <Button
                  onClick={() => setShowDatasetDialog(false)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <span className="mr-2">✨</span>
                  关闭
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 训练日志查看对话框 */}
      {showLogsDialog && selectedTaskForLogs && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            stopLogsPolling()
            setShowLogsDialog(false)
          }
        }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200/50">
            {/* 头部区域 */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-8 py-6 border-b border-green-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      训练日志
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      任务ID: <span className="font-mono text-green-600 bg-green-50 px-2 py-1 rounded-md">{selectedTaskForLogs}</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    stopLogsPolling()
                    setShowLogsDialog(false)
                  }}
                  className="h-10 w-10 p-0 hover:bg-white/60 rounded-xl transition-all duration-200"
                >
                  <span className="text-gray-500 hover:text-gray-700 text-lg">✕</span>
                </Button>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-8">
              {logsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-green-100 border-t-green-500 rounded-full animate-spin mx-auto"></div>
                      <FileText className="h-6 w-6 text-green-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-gray-600 mt-4 font-medium">正在加载训练日志...</p>
                    <p className="text-gray-400 text-sm mt-1">请稍候片刻</p>
                  </div>
                </div>
              ) : logsInfo ? (
                <div className="space-y-6">
                  {logsInfo.code === 200 ? (
                    <div className="space-y-6">
                      {/* 日志基本信息 */}
                      {logsInfo.data && (
                        <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 rounded-2xl p-6 border border-green-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                              <FileText className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold text-green-900">日志信息</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {logsInfo.data.log_file && (
                              <div className="bg-white/80 rounded-xl p-4 border border-green-200/50 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-600">日志文件</span>
                                  <FileText className="h-4 w-4 text-green-400" />
                                </div>
                                <p className="font-mono text-green-700 font-medium mt-2 text-sm break-all">{logsInfo.data.log_file}</p>
                              </div>
                            )}
                            
                            {logsInfo.data.log_size && (
                              <div className="bg-white/80 rounded-xl p-4 border border-green-200/50 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-600">文件大小</span>
                                  <div className="w-4 h-4 bg-green-400 rounded-sm flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">S</span>
                                  </div>
                                </div>
                                <p className="text-2xl font-bold text-green-700 mt-2">{logsInfo.data.log_size}</p>
                              </div>
                            )}
                            
                            {logsInfo.data.last_updated && (
                              <div className="bg-white/80 rounded-xl p-4 border border-green-200/50 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-600">最后更新</span>
                                  <div className="w-4 h-4 bg-green-400 rounded-sm flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">T</span>
                                  </div>
                                </div>
                                <p className="font-mono text-green-700 font-semibold mt-2 text-base">{formatDate(logsInfo.data.last_updated)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 日志内容 */}
                      {logsInfo.data && logsInfo.data.logs && (
                        <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg flex items-center justify-center">
                                <FileText className="h-4 w-4 text-white" />
                              </div>
                              <h4 className="text-lg font-semibold text-slate-900">训练日志内容</h4>
                            </div>
                            <button
                              onClick={() => {
                                const logContent = Array.isArray(logsInfo.data.logs) ? logsInfo.data.logs.join('\n') : logsInfo.data.logs
                                navigator.clipboard.writeText(logContent).then(() => {
                                  toast({
                                    title: "复制成功",
                                    description: "训练日志已复制到剪贴板",
                                  })
                                }).catch(() => {
                                  const textArea = document.createElement('textarea')
                                  textArea.value = logContent
                                  document.body.appendChild(textArea)
                                  textArea.select()
                                  try {
                                    document.execCommand('copy')
                                    toast({
                                      title: "复制成功", 
                                      description: "训练日志已复制到剪贴板",
                                    })
                                  } catch (err) {
                                    toast({
                                      variant: "destructive",
                                      title: "复制失败",
                                      description: "无法复制到剪贴板",
                                    })
                                  }
                                  document.body.removeChild(textArea)
                                })
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 text-white rounded-xl transition-all duration-200 font-medium text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              <span>📋</span>
                              复制日志
                            </button>
                          </div>
                          <div className="bg-black rounded-xl border border-slate-200/80 overflow-hidden">
                            <pre className="p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto text-green-400 bg-black leading-relaxed">
                              {Array.isArray(logsInfo.data.logs) ? logsInfo.data.logs.join('\n') : logsInfo.data.logs}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* 完整JSON数据 */}
                      <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg flex items-center justify-center">
                              <FileText className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold text-slate-900">完整日志数据</h4>
                          </div>
                          <button
                            onClick={() => {
                              const jsonString = JSON.stringify(logsInfo.data, null, 2)
                              navigator.clipboard.writeText(jsonString).then(() => {
                                toast({
                                  title: "复制成功",
                                  description: "日志数据已复制到剪贴板",
                                })
                              }).catch(() => {
                                const textArea = document.createElement('textarea')
                                textArea.value = jsonString
                                document.body.appendChild(textArea)
                                textArea.select()
                                try {
                                  document.execCommand('copy')
                                  toast({
                                    title: "复制成功", 
                                    description: "日志数据已复制到剪贴板",
                                  })
                                } catch (err) {
                                  toast({
                                    variant: "destructive",
                                    title: "复制失败",
                                    description: "无法复制到剪贴板",
                                  })
                                }
                                document.body.removeChild(textArea)
                              })
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 text-white rounded-xl transition-all duration-200 font-medium text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <span>📋</span>
                            复制JSON
                          </button>
                        </div>
                        <div className="bg-white/80 rounded-xl border border-slate-200/80 backdrop-blur-sm overflow-hidden">
                          <pre className="p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto text-slate-700 leading-relaxed">
                            {JSON.stringify(logsInfo.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-red-50 via-rose-50 to-red-50 rounded-2xl p-6 border border-red-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm font-bold">!</span>
                        </div>
                        <h4 className="text-lg font-semibold text-red-900">获取失败</h4>
                      </div>
                      <p className="text-red-700 bg-white/60 rounded-xl p-4 border border-red-200/50">
                        获取训练日志失败: {logsInfo.msg || '未知错误'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 via-slate-50 to-gray-50 rounded-2xl p-8 border border-gray-200 shadow-sm">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-700 mb-2">暂无训练日志</h4>
                    <p className="text-gray-500 text-sm">未找到相关的训练日志信息</p>
                  </div>
                </div>
              )}
            </div>

            {/* 底部操作区域 */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-8 py-6 border-t border-gray-200/50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <span>💡 提示：可点击复制按钮保存完整训练日志</span>
                </div>
                <Button
                  onClick={() => {
                    stopLogsPolling()
                    setShowLogsDialog(false)
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <span className="mr-2">✨</span>
                  关闭
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除部署确认对话框 */}
      {showDeleteDeploymentDialog && selectedDeploymentForDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) setShowDeleteDeploymentDialog(false)
        }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">确认删除</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDeploymentDialog(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                ✕
              </Button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                确定要删除模型部署 <strong>"{selectedDeploymentForDelete.config_name || selectedDeploymentForDelete.model_name || selectedDeploymentForDelete.name || selectedDeploymentForDelete.id}"</strong> 吗？
              </p>
              <p className="text-sm text-gray-500">
                此操作不可撤销，请谨慎操作。
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDeploymentDialog(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmDeleteDeployment}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 训练结果查看对话框 */}
      {showResultsDialog && selectedTaskForResults && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            stopLossPolling()
            setShowResultsDialog(false)
          }
        }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200/50">
            {/* 头部区域 */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-8 py-6 border-b border-orange-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      训练结果
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      任务ID: <span className="font-mono text-orange-600 bg-orange-50 px-2 py-1 rounded-md">{selectedTaskForResults}</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    stopLossPolling()
                    setShowResultsDialog(false)
                  }}
                  className="h-10 w-10 p-0 hover:bg-white/60 rounded-xl transition-all duration-200"
                >
                  <span className="text-gray-500 hover:text-gray-700 text-lg">✕</span>
                </Button>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-8">
              {resultsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
                      <BarChart className="h-6 w-6 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-gray-600 mt-4 font-medium">正在加载训练结果...</p>
                    <p className="text-gray-400 text-sm mt-1">请稍候片刻</p>
                  </div>
                </div>
              ) : (lossData || evalResults) ? (
                <div className="space-y-6">
                  {/* 最终训练结果 */}
                  {evalResults && evalResults.data && (
                    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 rounded-2xl p-6 border border-green-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <h4 className="text-lg font-semibold text-green-900">最终训练结果</h4>
                      </div>
                      

                      {/* 完整的eval_results数据表格 */}
                      <div className="mb-6 bg-white/80 rounded-xl border border-green-200/50 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-3 border-b border-green-200">
                          <h5 className="text-md font-semibold text-green-800 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            评估结果详情
                          </h5>
                        </div>
                        <div className="p-4">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-green-200">
                                  <th className="text-left py-2 px-3 font-medium text-green-800">指标</th>
                                  <th className="text-right py-2 px-3 font-medium text-green-800">数值</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-green-100">
                                {evalResults.data.task_id && (
                                  <tr>
                                    <td className="py-2 px-3 text-gray-700">任务ID</td>
                                    <td className="py-2 px-3 text-right font-mono text-green-600 text-xs">{evalResults.data.task_id}</td>
                                  </tr>
                                )}
                                {evalResults.data.task_name && (
                                  <tr>
                                    <td className="py-2 px-3 text-gray-700">任务名称</td>
                                    <td className="py-2 px-3 text-right font-medium text-green-700">{evalResults.data.task_name}</td>
                                  </tr>
                                )}
                                {evalResults.data.task_status && (
                                  <tr>
                                    <td className="py-2 px-3 text-gray-700">任务状态</td>
                                    <td className="py-2 px-3 text-right">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        evalResults.data.task_status.toLowerCase() === 'succeeded' 
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-gray-100 text-gray-700'
                                      }`}>
                                        {evalResults.data.task_status}
                                      </span>
                                    </td>
                                  </tr>
                                )}
                                {evalResults.data.train_type && (
                                  <tr>
                                    <td className="py-2 px-3 text-gray-700">训练类型</td>
                                    <td className="py-2 px-3 text-right">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        evalResults.data.train_type === 'embedding' 
                                          ? 'bg-purple-100 text-purple-700'
                                          : 'bg-green-100 text-green-700'
                                      }`}>
                                        {evalResults.data.train_type === 'embedding' ? 'Embedding' : 'Reranker'}
                                      </span>
                                    </td>
                                  </tr>
                                )}
                                {evalResults.data.best_train_loss !== undefined && (
                                  <tr>
                                    <td className="py-2 px-3 text-gray-700">最佳训练Loss</td>
                                    <td className="py-2 px-3 text-right font-mono text-green-600">{evalResults.data.best_train_loss != null ? evalResults.data.best_train_loss.toFixed(6) : 'N/A'}</td>
                                  </tr>
                                )}
                                {evalResults.data.best_eval_loss !== undefined && (
                                  <tr>
                                    <td className="py-2 px-3 text-gray-700">最佳评估Loss</td>
                                    <td className="py-2 px-3 text-right font-mono text-green-600">{evalResults.data.best_eval_loss != null ? evalResults.data.best_eval_loss.toFixed(6) : 'N/A'}</td>
                                  </tr>
                                )}
                                {evalResults.data.evaluation_summary && (
                                  <>
                                    {typeof evalResults.data.evaluation_summary === 'object' ? (
                                      <>
                                        {evalResults.data.evaluation_summary.total_datasets && (
                                          <tr>
                                            <td className="py-2 px-3 text-gray-700">总数据集数</td>
                                            <td className="py-2 px-3 text-right font-mono text-green-600">{evalResults.data.evaluation_summary.total_datasets}</td>
                                          </tr>
                                        )}
                                        {evalResults.data.evaluation_summary.datasets_with_base_results && (
                                          <tr>
                                            <td className="py-2 px-3 text-gray-700">基础结果数据集</td>
                                            <td className="py-2 px-3 text-right font-mono text-green-600">{evalResults.data.evaluation_summary.datasets_with_base_results}</td>
                                          </tr>
                                        )}
                                        {evalResults.data.evaluation_summary.datasets_with_final_results && (
                                          <tr>
                                            <td className="py-2 px-3 text-gray-700">最终结果数据集</td>
                                            <td className="py-2 px-3 text-right font-mono text-green-600">{evalResults.data.evaluation_summary.datasets_with_final_results}</td>
                                          </tr>
                                        )}
                                      </>
                                    ) : (
                                      <tr>
                                        <td className="py-2 px-3 text-gray-700">评估摘要</td>
                                        <td className="py-2 px-3 text-right text-gray-600 max-w-xs truncate" title={evalResults.data.evaluation_summary}>
                                          {evalResults.data.evaluation_summary}
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {evalResults.data.final_eval_loss !== undefined && (
                          <div className="bg-white/80 rounded-xl p-4 border border-green-200/50 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">最终评估Loss</span>
                              <TrendingUp className="h-4 w-4 text-green-400" />
                            </div>
                            <p className="font-mono text-green-700 font-medium mt-2 text-sm">{evalResults.data.final_eval_loss != null ? evalResults.data.final_eval_loss.toFixed(6) : 'N/A'}</p>
                          </div>
                        )}
                        {evalResults.data.eval_accuracy !== undefined && (
                          <div className="bg-white/80 rounded-xl p-4 border border-green-200/50 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">评估准确率</span>
                              <div className="w-4 h-4 bg-green-400 rounded-sm flex items-center justify-center">
                                <span className="text-white text-xs font-bold">%</span>
                              </div>
                            </div>
                            <p className="text-2xl font-bold text-green-700 mt-2">{evalResults.data.eval_accuracy != null ? (evalResults.data.eval_accuracy * 100).toFixed(2) : 'N/A'}%</p>
                          </div>
                        )}
                        {evalResults.data.eval_f1 !== undefined && (
                          <div className="bg-white/80 rounded-xl p-4 border border-green-200/50 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">F1分数</span>
                              <div className="w-4 h-4 bg-green-400 rounded-sm flex items-center justify-center">
                                <span className="text-white text-xs font-bold">F</span>
                              </div>
                            </div>
                            <p className="font-mono text-green-700 font-semibold mt-2 text-base">{evalResults.data.eval_f1 != null ? evalResults.data.eval_f1.toFixed(4) : 'N/A'}</p>
                          </div>
                        )}
                        {evalResults.data.best_model_step !== undefined && (
                          <div className="bg-white/80 rounded-xl p-4 border border-green-200/50 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">最佳模型步骤</span>
                              <div className="w-4 h-4 bg-green-400 rounded-sm flex items-center justify-center">
                                <span className="text-white text-xs font-bold">S</span>
                              </div>
                            </div>
                            <p className="text-2xl font-bold text-green-700 mt-2">{evalResults.data.best_model_step}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Eval和Test结果表格 */}
                      <div className="mt-6 space-y-6">
                        {/* Eval结果表格 */}
                        {evalResults.data.eval_results?.eval && evalResults.data.eval_results.eval.length > 0 && (
                          <div className="bg-white/60 rounded-xl p-5 border border-green-200/50">
                            <h5 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              Eval 评估结果
                            </h5>
                            
                            {/* 使用表格格式显示 */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-green-200">
                                    <th className="text-left py-3 px-4 font-medium text-green-800">指标</th>
                                    <th className="text-center py-3 px-4 font-medium text-blue-700">Base Results</th>
                                    <th className="text-center py-3 px-4 font-medium text-green-700">Final Results</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* 动态生成行，每个指标一行 */}
                                  {(() => {
                                    // eval_results.eval 是数组，取第一个元素
                                    const evalData = evalResults.data.eval_results.eval?.[0];
                                    if (!evalData) return <tr><td colSpan={3} className="py-4 text-center text-gray-500">暂无数据</td></tr>;
                                    
                                    const baseResults = evalData.base_eval_results || {};
                                    const finalResults = evalData.final_eval_results || {};
                                    
                                    // 获取所有唯一的指标名称
                                    const allMetrics = [...new Set([...Object.keys(baseResults), ...Object.keys(finalResults)])];
                                    
                                    return allMetrics.map(metric => {
                                      const baseValue = baseResults[metric];
                                      const finalValue = finalResults[metric];
                                      
                                      return (
                                        <tr key={metric} className="border-b border-green-100">
                                          <td className="py-2 px-4 font-medium text-gray-700 text-xs">{metric}</td>
                                          <td className="py-2 px-4 text-center">
                                            <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                                              {baseValue !== undefined && baseValue !== null ? (typeof baseValue === 'number' ? baseValue.toFixed(6) : baseValue) : '-'}
                                            </span>
                                          </td>
                                          <td className="py-2 px-4 text-center">
                                            <span className="font-mono text-green-600 bg-green-50 px-2 py-1 rounded text-sm">
                                              {finalValue !== undefined && finalValue !== null ? (typeof finalValue === 'number' ? finalValue.toFixed(6) : finalValue) : '-'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        {/* Test结果表格 */}
                        {evalResults.data.eval_results?.test && evalResults.data.eval_results.test.length > 0 && (
                          <div className="bg-white/60 rounded-xl p-5 border border-green-200/50">
                            <h5 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              Test 评估结果
                            </h5>
                            
                            {/* 使用表格格式显示 */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-green-200">
                                    <th className="text-left py-3 px-4 font-medium text-green-800">指标</th>
                                    <th className="text-center py-3 px-4 font-medium text-purple-700">Base Results</th>
                                    <th className="text-center py-3 px-4 font-medium text-green-700">Final Results</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* 动态生成行，每个指标一行 */}
                                  {(() => {
                                    // eval_results.test 是数组，取第一个元素
                                    const testData = evalResults.data.eval_results.test?.[0];
                                    if (!testData) return <tr><td colSpan={3} className="py-4 text-center text-gray-500">暂无数据</td></tr>;
                                    
                                    const baseResults = testData.base_eval_results || {};
                                    const finalResults = testData.final_eval_results || {};
                                    
                                    // 获取所有唯一的指标名称
                                    const allMetrics = [...new Set([...Object.keys(baseResults), ...Object.keys(finalResults)])];
                                    
                                    return allMetrics.map(metric => {
                                      const baseValue = baseResults[metric];
                                      const finalValue = finalResults[metric];
                                      
                                      return (
                                        <tr key={metric} className="border-b border-green-100">
                                          <td className="py-2 px-4 font-medium text-gray-700 text-xs">{metric}</td>
                                          <td className="py-2 px-4 text-center">
                                            <span className="font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded text-sm">
                                              {baseValue !== undefined && baseValue !== null ? (typeof baseValue === 'number' ? baseValue.toFixed(6) : baseValue) : '-'}
                                            </span>
                                          </td>
                                          <td className="py-2 px-4 text-center">
                                            <span className="font-mono text-green-600 bg-green-50 px-2 py-1 rounded text-sm">
                                              {finalValue !== undefined && finalValue !== null ? (typeof finalValue === 'number' ? finalValue.toFixed(6) : finalValue) : '-'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}


                  {/* Loss 曲线图 */}
                  <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900">Loss 变化曲线</h4>
                    </div>
                    <div>
                      {lossData ? (
                        (() => {
                          // 尝试多种可能的数据路径
                          let lossHistory = null;
                          
                          if (lossData.data && lossData.data.loss_data) {
                            lossHistory = lossData.data.loss_data;
                          } else if (lossData.data && lossData.data.loss_history) {
                            lossHistory = lossData.data.loss_history;
                          } else if (lossData.loss_data) {
                            lossHistory = lossData.loss_data;
                          } else if (lossData.loss_history) {
                            lossHistory = lossData.loss_history;
                          } else if (Array.isArray(lossData.data)) {
                            lossHistory = lossData.data;
                          } else if (Array.isArray(lossData)) {
                            lossHistory = lossData;
                          }
                          
                          if (!lossHistory || !Array.isArray(lossHistory) || lossHistory.length === 0) {
                            return (
                              <div className="text-center py-8">
                                <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">暂无Loss历史数据</p>
                              </div>
                            );
                          }

                          // 处理loss和eval_loss数据，提取数值
                          const processedData = lossHistory.map((item: any, index: number) => {
                            const step = item.step || item.epoch || index + 1;
                            
                            // 提取训练loss
                            let trainLoss = null;
                            if (typeof item === 'number') {
                              trainLoss = item;
                            } else if (typeof item.loss === 'number') {
                              trainLoss = item.loss;
                            } else if (typeof item.train_loss === 'number') {
                              trainLoss = item.train_loss;
                            } else if (typeof item.value === 'number') {
                              trainLoss = item.value;
                            }
                            
                            // 提取验证loss
                            let evalLoss = null;
                            if (typeof item.eval_loss === 'number') {
                              evalLoss = item.eval_loss;
                            } else if (typeof item.val_loss === 'number') {
                              evalLoss = item.val_loss;
                            } else if (typeof item.validation_loss === 'number') {
                              evalLoss = item.validation_loss;
                            }
                            
                            return {
                              step,
                              trainLoss: trainLoss ? parseFloat(trainLoss.toString()) : null,
                              evalLoss: evalLoss ? parseFloat(evalLoss.toString()) : null
                            };
                          });

                          // 分别过滤有效数据
                          const trainLossData = processedData.filter((item: any) => item.trainLoss !== null && !isNaN(item.trainLoss));
                          const evalLossData = processedData.filter((item: any) => item.evalLoss !== null && !isNaN(item.evalLoss));

                          if (trainLossData.length === 0 && evalLossData.length === 0) {
                            return (
                              <div className="text-center py-8">
                                <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">无有效的Loss数值数据</p>
                              </div>
                            );
                          }

                          // 计算所有loss值的范围，用于统一坐标轴
                          const allLossValues = [
                            ...trainLossData.map(item => item.trainLoss),
                            ...evalLossData.map(item => item.evalLoss)
                          ].filter(val => val !== null);
                          
                          const maxLoss = Math.max(...allLossValues);
                          const minLoss = Math.min(...allLossValues);
                          const lossRange = maxLoss - minLoss;
                          const padding = lossRange * 0.1; // 10% padding
                          
                          // 获取所有step的范围
                          const allSteps = [...new Set([...trainLossData.map(item => item.step), ...evalLossData.map(item => item.step)])];
                          const maxStep = Math.max(...allSteps);
                          const minStep = Math.min(...allSteps);
                          const stepRange = maxStep - minStep;
                          
                          const chartWidth = 800;
                          const chartHeight = 400;
                          const chartPadding = 60;
                          
                          const xScale = stepRange > 0 ? (chartWidth - 2 * chartPadding) / stepRange : 0;
                          const yScale = (chartHeight - 2 * chartPadding) / (lossRange + 2 * padding);
                          
                          // 生成训练loss路径
                          const trainLossPath = trainLossData.length > 0 ? trainLossData.map((item: any, index: number) => {
                            const x = chartPadding + (item.step - minStep) * xScale;
                            const y = chartHeight - chartPadding - ((item.trainLoss - minLoss + padding) * yScale);
                            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                          }).join(' ') : '';
                          
                          // 生成验证loss路径
                          const evalLossPath = evalLossData.length > 0 ? evalLossData.map((item: any, index: number) => {
                            const x = chartPadding + (item.step - minStep) * xScale;
                            const y = chartHeight - chartPadding - ((item.evalLoss - minLoss + padding) * yScale);
                            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                          }).join(' ') : '';

                          // 生成网格线
                          const gridLines = [];
                          const yTicks = 6;
                          for (let i = 0; i <= yTicks; i++) {
                            const y = chartPadding + (i * (chartHeight - 2 * chartPadding) / yTicks);
                            const value = maxLoss + padding - (i * (lossRange + 2 * padding) / yTicks);
                            gridLines.push({ y, value });
                          }

                          return (
                            <div className="space-y-4">
                              <div className="w-full overflow-x-auto">
                                <svg width={chartWidth} height={chartHeight} className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-slate-200">
                                  <defs>
                                    <linearGradient id="trainLossGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/>
                                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/>
                                    </linearGradient>
                                    <linearGradient id="evalLossGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2"/>
                                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05"/>
                                    </linearGradient>
                                  </defs>
                                  
                                  {/* 网格线 */}
                                  {gridLines.map((line, i) => (
                                    <g key={i}>
                                      <line 
                                        x1={chartPadding} 
                                        y1={line.y} 
                                        x2={chartWidth - chartPadding} 
                                        y2={line.y} 
                                        stroke="#e5e7eb" 
                                        strokeWidth="1"
                                        strokeDasharray="2,2"
                                      />
                                      <text 
                                        x={chartPadding - 10} 
                                        y={line.y + 4} 
                                        fontSize="10" 
                                        fill="#6b7280" 
                                        textAnchor="end"
                                      >
                                        {line.value != null ? line.value.toFixed(4) : '0'}
                                      </text>
                                    </g>
                                  ))}
                                  
                                  {/* X轴 */}
                                  <line 
                                    x1={chartPadding} 
                                    y1={chartHeight - chartPadding} 
                                    x2={chartWidth - chartPadding} 
                                    y2={chartHeight - chartPadding} 
                                    stroke="#374151" 
                                    strokeWidth="2"
                                  />
                                  
                                  {/* Y轴 */}
                                  <line 
                                    x1={chartPadding} 
                                    y1={chartPadding} 
                                    x2={chartPadding} 
                                    y2={chartHeight - chartPadding} 
                                    stroke="#374151" 
                                    strokeWidth="2"
                                  />
                                  
                                  {/* 训练loss填充区域 */}
                                  {trainLossData.length > 0 && (
                                    <path
                                      d={`${trainLossPath} L ${chartPadding + (trainLossData[trainLossData.length - 1].step - minStep) * xScale} ${chartHeight - chartPadding} L ${chartPadding + (trainLossData[0].step - minStep) * xScale} ${chartHeight - chartPadding} Z`}
                                      fill="url(#trainLossGradient)"
                                    />
                                  )}
                                  
                                  {/* 验证loss填充区域 */}
                                  {evalLossData.length > 0 && (
                                    <path
                                      d={`${evalLossPath} L ${chartPadding + (evalLossData[evalLossData.length - 1].step - minStep) * xScale} ${chartHeight - chartPadding} L ${chartPadding + (evalLossData[0].step - minStep) * xScale} ${chartHeight - chartPadding} Z`}
                                      fill="url(#evalLossGradient)"
                                    />
                                  )}
                                  
                                  {/* 训练loss曲线 */}
                                  {trainLossData.length > 0 && (
                                    <path
                                      d={trainLossPath}
                                      fill="none"
                                      stroke="#3b82f6"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  )}
                                  
                                  {/* 验证loss曲线 */}
                                  {evalLossData.length > 0 && (
                                    <path
                                      d={evalLossPath}
                                      fill="none"
                                      stroke="#ef4444"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  )}
                                  
                                  {/* 训练loss数据点 */}
                                  {trainLossData.map((item: any, index: number) => {
                                    const x = chartPadding + (item.step - minStep) * xScale;
                                    const y = chartHeight - chartPadding - ((item.trainLoss - minLoss + padding) * yScale);
                                    return (
                                      <circle
                                        key={`train-${index}`}
                                        cx={x}
                                        cy={y}
                                        r="4"
                                        fill="#3b82f6"
                                        stroke="#ffffff"
                                        strokeWidth="2"
                                      />
                                    );
                                  })}
                                  
                                  {/* 验证loss数据点 */}
                                  {evalLossData.map((item: any, index: number) => {
                                    const x = chartPadding + (item.step - minStep) * xScale;
                                    const y = chartHeight - chartPadding - ((item.evalLoss - minLoss + padding) * yScale);
                                    return (
                                      <circle
                                        key={`eval-${index}`}
                                        cx={x}
                                        cy={y}
                                        r="4"
                                        fill="#ef4444"
                                        stroke="#ffffff"
                                        strokeWidth="2"
                                      />
                                    );
                                  })}
                                  
                                  {/* X轴标签 */}
                                  {allSteps.filter((step, index) => index % Math.max(1, Math.floor(allSteps.length / 10)) === 0).map((step) => {
                                    const x = chartPadding + (step - minStep) * xScale;
                                    return (
                                      <text
                                        key={step}
                                        x={x}
                                        y={chartHeight - chartPadding + 20}
                                        fontSize="10"
                                        fill="#6b7280"
                                        textAnchor="middle"
                                      >
                                        {step}
                                      </text>
                                    );
                                  })}
                                  
                                  {/* 标题和标签 */}
                                  <text
                                    x={chartWidth / 2}
                                    y={chartHeight - 10}
                                    fontSize="12"
                                    fill="#374151"
                                    textAnchor="middle"
                                    fontWeight="500"
                                  >
                                    训练步骤
                                  </text>
                                  
                                  <text
                                    x={20}
                                    y={chartHeight / 2}
                                    fontSize="12"
                                    fill="#374151"
                                    textAnchor="middle"
                                    fontWeight="500"
                                    transform={`rotate(-90, 20, ${chartHeight / 2})`}
                                  >
                                    Loss 值
                                  </text>
                                </svg>
                              </div>
                              
                              {/* 图表说明 */}
                              <div className="flex items-center justify-between text-xs text-gray-600 bg-slate-50 rounded-lg p-3">
                                <div className="flex items-center gap-6">
                                  {trainLossData.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                      <span>训练Loss ({trainLossData.length}点)</span>
                                    </div>
                                  )}
                                  {evalLossData.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                      <span>验证Loss ({evalLossData.length}点)</span>
                                    </div>
                                  )}
                                  <div>范围: {minLoss != null ? minLoss.toFixed(6) : '0'} - {maxLoss != null ? maxLoss.toFixed(6) : '0'}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-center py-8">
                          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">暂无Loss数据</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-gray-600 font-medium">未能获取训练结果数据</p>
                    <p className="text-gray-400 text-sm mt-1">请稍后重试</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}