import { corsHeaders } from './cors.ts'

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function createErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: error.code 
      }),
      {
        status: error.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  console.error('Unexpected error:', error)
  
  return new Response(
    JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

export function createSuccessResponse(data: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

