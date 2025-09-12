import { NextResponse } from 'next/server'

// 默认的模型配置
const DEFAULT_MODELS = {
  embedding_models: [
    {
      model_id: "134428927614517505",
      model_name: "bge-large-zh-v1.5",
      description: "中文大型向量模型"
    }
  ],
  rerank_models: [
    {
      model_id: "134429030307856641", 
      model_name: "bge-reranker-base",
      description: "基础重排序模型"
    }
  ]
}

export async function GET() {
  return NextResponse.json({
    code: 200,
    msg: "success",
    data: DEFAULT_MODELS
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-token',
    }
  })
}