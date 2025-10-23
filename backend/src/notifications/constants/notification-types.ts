export const NotificationTypes = {
  EMAIL: 'email',
  IN_APP: 'in_app',
} as const;

export type NotificationType =
  (typeof NotificationTypes)[keyof typeof NotificationTypes];

export const NotificationTypeList = Object.values(
  NotificationTypes,
) as NotificationType[];
