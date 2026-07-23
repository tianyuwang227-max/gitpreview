export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface RepoPreviewRequest {
  url: string;
  async?: boolean;
}

export interface RepoPreviewResponse {
  repo: {
    owner: string;
    name: string;
    fullName: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    url: string;
    defaultBranch: string;
    size: number;
  };
  screenshot: {
    imagePath: string;
    url: string;
    metadata: {
      width: number;
      height: number;
      format: string;
      fileSize: number;
    };
  };
}

export interface TaskResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: RepoPreviewResponse;
  error?: string;
  progress?: number;
}
