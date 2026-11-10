/**
 * Utility functions for working with actions in Teacharium widgets
 */

import type { TeachariumWidgetApi } from "../teacharium-widget-api";

/**
 * Action configuration type
 */
export interface ActionConfiguration {
  actionType: string;
  parameters: Record<string, unknown>;
}

/**
 * Execute multiple actions in sequence
 *
 * @param api - The TeachariumWidgetApi instance
 * @param actions - Array of action configurations to execute
 *
 * @example
 * ```typescript
 * executeActions(api, [
 *   { actionType: "setVariable", parameters: { variableName: "score", value: 10 } },
 *   { actionType: "showFeedback", parameters: { message: "Great!", variant: "correct" } },
 *   { actionType: "nextStep", parameters: {} }
 * ]);
 * ```
 */
export function executeActions(
  api: TeachariumWidgetApi,
  actions: ActionConfiguration[],
): void {
  if (!actions || actions.length === 0) {
    return;
  }

  actions.forEach((action) => {
    if (!action.actionType) {
      console.warn("Skipping action with no actionType:", action);
      return;
    }

    try {
      api.events.emit({
        type: action.actionType,
        params: action.parameters || {},
      });
    } catch (error) {
      console.error(`Error executing action ${action.actionType}:`, error);
    }
  });
}

/**
 * Execute a single action
 *
 * @param api - The TeachariumWidgetApi instance
 * @param action - Action configuration to execute
 *
 * @example
 * ```typescript
 * executeAction(api, {
 *   actionType: "nextStep",
 *   parameters: {}
 * });
 * ```
 */
export function executeAction(
  api: TeachariumWidgetApi,
  action: ActionConfiguration,
): void {
  if (!action || !action.actionType) {
    console.warn("Cannot execute action with no actionType:", action);
    return;
  }

  try {
    api.events.emit({
      type: action.actionType,
      params: action.parameters || {},
    });
  } catch (error) {
    console.error(`Error executing action ${action.actionType}:`, error);
  }
}
