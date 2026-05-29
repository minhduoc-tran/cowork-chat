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
  position: number | null
  createdAt: string
  updatedAt: string
  subtasks: TaskSubtask[]
  members: TaskMember[]
  tags: TaskTag[]
  comments: TaskComment[]
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
  status?: string
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
  position?: number
}

export interface CreateSubtaskPayload {
  title: string
}

export interface UpdateSubtaskPayload {
  title?: string
  isCompleted?: boolean
}

export interface TaskComment {
  id: number
  taskId: number
  authorId: number
  parentId: number | null
  content: string
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  author: {
    id: number
    displayName: string
    avatar: string | null
  }
  replies?: TaskComment[]
}

export interface CreateCommentPayload {
  content: string
  parentId?: number
}

export interface UpdateCommentPayload {
  content: string
}

export interface TaskStatus {
  id: number
  conversationId: number | null
  key: string
  name: string
  color: string
  position: number
  createdAt: string
}

export interface CreateTaskStatusPayload {
  name: string
  color?: string
}

export interface UpdateTaskStatusPayload {
  name?: string
  color?: string
  position?: number
}
