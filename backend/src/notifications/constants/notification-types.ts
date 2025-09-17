export const NotificationTypes = {
  EMAIL: 'EMAIL',
  IN_APP: 'IN_APP',
} as const;

export type NotificationType =
  (typeof NotificationTypes)[keyof typeof NotificationTypes];

export const NotificationTypeList = Object.values(
  NotificationTypes,
) as NotificationType[];
