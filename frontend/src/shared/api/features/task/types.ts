export interface TaskSubtask {
  id: number
  taskId: number
  title: string
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: number
  conversationId: number | null
  title: string
  description: string | null
  status: "todo" | "in_progress" | "completed"
  priority: "low" | "medium" | "high"
  dueDate: string | null
  createdById: number
  assignedToId: number | null
  createdAt: string
  updatedAt: string
  subtasks: TaskSubtask[]
  creator: {
    id: number
    displayName: string
    avatar: string | null
  }
  assignee: {
    id: number
    displayName: string
    avatar: string | null
  } | null
}

export interface CreateTaskPayload {
  title: string
  description?: string
  conversationId?: number
  dueDate?: string | null
  priority?: "low" | "medium" | "high"
  assignedToId?: number | null
}

export interface UpdateTaskPayload {
  title?: string
  description?: string | null
  status?: "todo" | "in_progress" | "completed"
  priority?: "low" | "medium" | "high"
  dueDate?: string | null
  assignedToId?: number | null
}

export interface CreateSubtaskPayload {
  title: string
}

export interface UpdateSubtaskPayload {
  title?: string
  isCompleted?: boolean
}
