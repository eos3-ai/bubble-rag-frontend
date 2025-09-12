import { KnowledgeBase } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MoreVertical, FileText, Calendar, Edit, Trash2, Files, Copy, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface KnowledgeBaseCardProps {
  knowledgeBase: KnowledgeBase
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onChat: (id: string) => void
}

export function KnowledgeBaseCard({ 
  knowledgeBase, 
  onEdit, 
  onDelete, 
  onChat 
}: KnowledgeBaseCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  
  const copyKnowledgeBaseId = async () => {
    const kbId = knowledgeBase.coll_name || knowledgeBase.id || knowledgeBase.kb_name
    await navigator.clipboard.writeText(kbId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    
    toast({
      title: "复制成功",
      description: "知识库ID已复制到剪切板",
    })
  }
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{knowledgeBase.kb_name}</CardTitle>
            <CardDescription className="mt-1">
              {knowledgeBase.kb_desc || "暂无描述"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(knowledgeBase.id || knowledgeBase.kb_name)}
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full"
              title="编辑知识库"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">打开菜单</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/documents/${knowledgeBase.id || knowledgeBase.kb_name}`)}>
                  <Files className="mr-2 h-4 w-4" />
                  管理文档
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(knowledgeBase.id || knowledgeBase.kb_name)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <FileText className="mr-1 h-4 w-4" />
              {knowledgeBase.doc_count || 0} 个文档
            </div>
          </div>
          
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>创建时间: {new Date(knowledgeBase.create_time || knowledgeBase.created_at || new Date()).toLocaleDateString()}</span>
            </div>
            {(knowledgeBase.updated_at || knowledgeBase.update_time) && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>更新时间: {new Date(knowledgeBase.updated_at || knowledgeBase.update_time || new Date()).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground mb-1">集合标识</div>
              <div className="text-sm font-mono text-foreground">
                {knowledgeBase.coll_name || knowledgeBase.id || knowledgeBase.kb_name}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyKnowledgeBaseId}
              className="h-8 w-8 p-0 ml-2"
              title="复制集合标识"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={() => onChat(knowledgeBase.id || knowledgeBase.kb_name)}
        >
          开始问答
        </Button>
      </CardFooter>
    </Card>
  )
}