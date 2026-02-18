export const NotificationChannel = {
  warning: 'warning',
  alert: 'alert',
  info: 'info',
  article: 'article',
  llm: 'llm',
} as const;

export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationChannelList = Object.values(NotificationChannel) as NotificationChannel[];
