import { NotificationType } from '@/notifications/constants/notification-types';
import { NotificationChannel } from '@/notifications/constants/notification-channel';

export const eachNotificationTypeTransformer = ({
  value,
}: {
  value: unknown;
}): NotificationType[] => {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string') as NotificationType[];
  } else if (typeof value === 'string') {
    return [value as NotificationType];
  }
  return [];
};

export const eachNotificationChannelTransformer = ({
  value,
}: {
  value: unknown;
}): NotificationChannel[] => {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string') as NotificationChannel[];
  } else if (typeof value === 'string') {
    return [value as NotificationChannel];
  }
  return [];
};
