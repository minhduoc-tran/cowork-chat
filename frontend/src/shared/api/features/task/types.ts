export interface TaskSubtask {
  id: number
  taskId: number
  title: string
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}

export interface TaskMember {
  id: number
  taskId: number
  userId: number
  role: "owner" | "assignee" | "watcher"
  addedAt: string
  user: {
    id: number
    displayName: string
    avatar: string | null
  }
}

export interface ConversationTag {
  id: number
  conversationId: number
  name: string
  color: string
  icon: string | null
  createdById: number
  createdAt: string
}

export interface TaskTag {
  id: number
  taskId: number
  tagId: number
  addedAt: string
  tag: ConversationTag
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
  estimatedValue: number | null
  estimatedUnit: "minutes" | "hours" | "days" | null
  createdAt: string
  updatedAt: string
  subtasks: TaskSubtask[]
  members: TaskMember[]
  tags: TaskTag[]
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
  estimatedValue?: number | null
  estimatedUnit?: "minutes" | "hours" | "days" | null
}

export interface UpdateTaskPayload {
  title?: string
  description?: string | null
  status?: "todo" | "in_progress" | "completed"
  priority?: "low" | "medium" | "high"
  dueDate?: string | null
  assignedToId?: number | null
  estimatedValue?: number | null
  estimatedUnit?: "minutes" | "hours" | "days" | null
}

export interface CreateSubtaskPayload {
  title: string
}

export interface UpdateSubtaskPayload {
  title?: string
  isCompleted?: boolean
}
