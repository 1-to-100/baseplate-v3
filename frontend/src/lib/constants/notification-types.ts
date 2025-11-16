export const NotificationTypes = {
  email: 'email',
  in_app: 'in_app',
} as const;

export type NotificationType =
  (typeof NotificationTypes)[keyof typeof NotificationTypes];

export const NotificationTypeList = Object.values(
  NotificationTypes,
) as NotificationType[];

