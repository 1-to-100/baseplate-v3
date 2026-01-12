// Root feature export for portability
// This file re-exports all feature elements needed for other portions of the application
// to access and update the feature. Follows Baseplate Feature Registry specification.

export * from './lib/api';
export * from './lib/types';
export * from './lib/components';

// Export hooks if they exist
export * from './lib/api/strategy-foundation-hooks';
