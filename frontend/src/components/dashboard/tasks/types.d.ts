export interface DnDData {
  type: 'column' | 'task';
}

export interface Column {
  id: string;
  name: string;
  taskIds: string[];
}

export interface Task {
  id: string;
  author: { id: string; avatar: string; name: string; username: string };
  title: string;
  description?: string;
  columnId: string;
  createdAt: Date;
  category?: string;
  priority?: 'low' | 'mid' | 'high';
  dueDate?: Date;
  assignees?: { id: string; avatar: string; name: string; username: string }[];
  subtasks?: { id: string; title: string; done?: boolean }[];
  attachments?: { id: string; name: string; extension: 'png' | 'pdf'; size: string }[];
  comments?: Comment[];
  watchers?: number;
}

export interface Comment {
  id: string;
  author: { id: string; avatar: string; name: string; username: string };
  content: string;
  createdAt: Date;
  comments?: Comment[];
}
