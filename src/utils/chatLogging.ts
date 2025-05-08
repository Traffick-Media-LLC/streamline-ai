
/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please use the new logging modules in src/utils/logging/ instead.
 */

// Re-export all logging utilities from the new modules
export * from './logging';

// Issue a console warning about deprecation
console.warn(
  '[DEPRECATION] The utils/chatLogging.ts file is deprecated and will be removed in a future version. ' +
  'Please use the new logging modules in src/utils/logging/ instead.'
);
