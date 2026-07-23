export interface WebSocketMessage {
  type: 'progress' | 'completed' | 'error' | 'connected';
  taskId?: string;
  data?: any;
  message?: string;
  progress?: number;
  timestamp: string;
}

export interface ProgressUpdate {
  taskId: string;
  progress: number;
  status: string;
  message: string;
}

export interface WebSocketClient {
  id: string;
  ws: any;
  subscribedTasks: Set<string>;
}
