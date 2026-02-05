import merge from 'lodash/merge';

/**
 * Deep merge objects. Uses lodash merge.
 * Does not mutate the target; returns a new object.
 * @param target Base object
 * @param sources Objects to merge into the base (later sources override earlier)
 * @returns New deeply merged object
 */
export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  return merge({}, target, ...sources) as T;
}
