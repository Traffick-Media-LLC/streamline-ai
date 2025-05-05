
import { v4 as uuidv4 } from "uuid";

/**
 * Generate a unique request ID for tracking a request through its lifecycle
 */
export const generateRequestId = (): string => {
  return uuidv4();
};

/**
 * Generate a shorter, URL-friendly unique ID
 */
export const generateShortId = (): string => {
  return uuidv4().split('-')[0];
};

/**
 * Generates an operation ID that combines component and activity
 */
export const generateOperationId = (
  component: string,
  activity: string
): string => {
  return `${component.toLowerCase()}_${activity.toLowerCase()}_${generateShortId()}`;
};
