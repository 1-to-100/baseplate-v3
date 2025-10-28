import { ArticleStatusType, UserStatusType } from 'src/common/constants/status';

export const toBoolean = ({ value }: { value: any }): boolean | undefined => {
  if (value === '1' || value === 1 || value === true || value === 'true')
    return true;
  if (value === '0' || value === 0 || value === false || value === 'false')
    return false;
  return undefined;
};

export const eachNumberTransformer = ({
  value,
}: {
  value: unknown;
}): number[] => {
  if (Array.isArray(value)) {
    return value.filter((v) => !isNaN(Number(v))).map((v) => Number(v));
  } else if (typeof value === 'string' && !isNaN(Number(value))) {
    return [Number(value)];
  } else if (typeof value === 'number') {
    return [value];
  }
  return [];
};

export const eachStringTransformer = ({
  value,
}: {
  value: unknown;
}): string[] => {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string');
  } else if (typeof value === 'string') {
    return [value];
  }
  return [];
};

export const eachUserStatusTransformer = ({
  value,
}: {
  value: unknown;
}): UserStatusType[] => {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string') as UserStatusType[];
  } else if (typeof value === 'string') {
    return [value as UserStatusType];
  }
  return [];
};

export const eachArticleStatusTransformer = ({
  value,
}: {
  value: unknown;
}): ArticleStatusType[] => {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string') as ArticleStatusType[];
  } else if (typeof value === 'string') {
    return [value as ArticleStatusType];
  }
  return [];
};
