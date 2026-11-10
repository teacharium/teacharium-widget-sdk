/* eslint-disable @typescript-eslint/no-explicit-any */

import type React from "react";

export interface MediaUrlResult {
  data: string | null | undefined;
  isLoading?: boolean;
  error?: Error | null;
}

export interface VideoUrlResult {
  hlsStreamUrl: string | null | undefined;
  mp4Url: string | null | undefined;
  thumbnailUrl: string | null | undefined;
  isLoading?: boolean;
  error?: Error | null;
}

export type VoiceType =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "sage"
  | "shimmer"
  | "verse";

export interface VoiceoverData {
  enabled: boolean;
  voice: VoiceType;
  speed?: number;
  showPlayButton: boolean;
  cached?: boolean;
  content?: string;
  contentHash?: string;
}

// Event source constants
export const EVENT_SOURCE_PLAYER = "player";
export const EVENT_SOURCE_FOOTER = "footer";

type EventListener<T = any> = (event: T) => void;

// Base event interface with mandatory type field
export interface BaseEvent {
  type: string;
  timestamp?: string; // Auto-added by emit
  emittedBy?: string; // Optional source identifier
}

export type VariableValue = string | number | boolean;

export interface UseNumberExpressions {
  (expressions: string[], defaultValues?: number[]): number[];
}

/**
 * Resolve Handlebars templates ({{variable}}, {{#if}}) against lesson
 * variables. Results are plain text, for rendering through React or storing.
 * Pass `{ escapeHtml: true }` when a result is inserted as markup (e.g. via
 * dangerouslySetInnerHTML), so variable values can't break or inject markup.
 */
export interface UseStringExpressions {
  (
    expressions: (string | undefined)[],
    defaultValues?: string[],
    options?: { escapeHtml?: boolean },
  ): string[];
}

export interface UseVariableValues {
  (names: Array<string | null | undefined>): (VariableValue | undefined)[];
}

export interface UseUpdateVariables {
  (values: Record<string, VariableValue>): void;
}

export interface ConditionValue {
  /** Freeform boolean expression evaluated by mathjs (e.g. "{{score}} >= 80 and {{attempts}} > 0") */
  expression?: string;
  /** @deprecated Use expression instead */
  leftOperand?: string;
  /** @deprecated Use expression instead */
  operator?: string;
  /** @deprecated Use expression instead */
  rightOperand?: string;
  /** @deprecated Use expression instead */
  type?: "string" | "number";
}

export interface UseConditionEvaluationResult {
  result: boolean | null;
  hasError: boolean;
}

export interface UseConditionEvaluation {
  (condition: ConditionValue): UseConditionEvaluationResult;
}

export interface EvaluateCondition {
  (condition: ConditionValue | undefined): UseConditionEvaluationResult;
}

export type ItemType = "instructional" | "practice" | "scored";

export interface CurrentAnswer {
  humanReadable: string;
  machineReadable: string | number;
}

export interface ItemStatus {
  correct: boolean;
  attempted: boolean;
  currentAnswer?: CurrentAnswer;
  maxScore: number;
  currentScore: number;
}

export interface ItemData {
  widgetId: string;
  widgetName?: string;
  stepId: string;
  type: ItemType;
  status: ItemStatus;
}

export interface ItemUpdateApi {
  updateCorrect: (correct: boolean) => void;
  updateAttempted: (attempted: boolean) => void;
  updateAnswer: (answer: CurrentAnswer | undefined) => void;
  updateStatus: (updates: Partial<ItemStatus>) => void;
  updateScore: (currentScore: number, maxScore?: number) => void;
  updateMaxScore: (maxScore: number) => void;
}

export interface UseIsItemOptions {
  stepId: string;
  type?: ItemType;
  maxScore?: number;
  widgetName?: string;
}

/**
 * Hook for widgets to register as items and get the update API.
 * When used via api.hooks.useIsItem (curried version), widgets can optionally pass configuration.
 */
export interface UseIsItem {
  (options?: {
    widgetId?: string;
    options?: Omit<UseIsItemOptions, "stepId">;
  }): ItemUpdateApi;
}

// Widget state types for persistent state management
export type SetWidgetState<T> = (value: T | ((prev: T) => T)) => void;

export interface UseWidgetStateObjectResult<T extends Record<string, unknown>> {
  state: T;
  updateState: (updates: Partial<T>) => void;
  resetState: () => void;
  setState: (newState: T | ((prev: T) => T)) => void;
}

export interface UseWidgetState {
  <T>(key: string, initialValue: T): [T, SetWidgetState<T>];
}

export interface UseWidgetStateObject {
  <T extends Record<string, unknown>>(
    initialState: T,
  ): UseWidgetStateObjectResult<T>;
}

/**
 * Hook for registering sub-items with custom IDs (e.g., rows in a matrix).
 * Requires passing a custom widget ID and optional type.
 */
export interface UseIsItemWithId {
  (
    customWidgetId: string,
    options?: { type?: ItemType; maxScore?: number; widgetName?: string },
  ): ItemUpdateApi;
}

export interface ItemsContextValue {
  items: Map<string, ItemData>;
  registerItem: (
    widgetId: string,
    stepId: string,
    type?: ItemType,
    maxScore?: number,
    widgetName?: string,
  ) => void;
  unregisterItem: (widgetId: string) => void;
  getItems: () => ItemData[];
  getItemsByStepId: (stepId: string) => ItemData[];
  getItemUpdateApi: (widgetId: string) => ItemUpdateApi;
}

export interface UseItemsContext {
  (): ItemsContextValue;
}

export interface UseLessonEventEmitter {
  (): <T extends BaseEvent = BaseEvent>(event: T) => void;
}

export interface UseLessonEventSubscription {
  <T = any>(
    eventType: string,
    listener: EventListener<T>,
    priority?: number,
    deps?: React.DependencyList,
  ): void;
}

export interface TeachariumWidgetApi {
  isEditing: boolean;

  playerMode: "editing" | "preview" | "playbook" | "player" | "review";

  stepId: string | undefined;

  /**
   * Whether the player is in review mode (showing completed work).
   * When true, widgets should disable interactions but show content.
   */
  isReviewMode: boolean;

  events: {
    /**
     * Emit an event with type and params
     * Example: api.events.emit({ type: "nextStep", params: {} })
     */
    emit<T extends BaseEvent = BaseEvent>(event: T): void;
    subscribe<T extends BaseEvent = BaseEvent>(
      eventType: string,
      listener: EventListener<T>,
    ): () => void;
    unsubscribe(eventType: string, listener: EventListener): void;
  };

  React: any;

  updateVariables: (values: Record<string, VariableValue>) => void;

  hooks: {
    useNumberExpressions: UseNumberExpressions;
    useStringExpressions: UseStringExpressions;
    useVariableValues: UseVariableValues;
    useConditionEvaluation: UseConditionEvaluation;
    useIsItem: UseIsItem;
    useIsItemWithId: UseIsItemWithId;
    useItemsContext: UseItemsContext;
    useLessonEventEmitter: UseLessonEventEmitter;
    useLessonEventSubscription: UseLessonEventSubscription;
    useResolvedMediaUrl: (mediaId: string | undefined) => MediaUrlResult;
    useResolvedVoiceoverUrl: (
      contentHash: string | undefined,
      voice: string | undefined,
    ) => MediaUrlResult;

    useResolvedVideoUrls: (videoId: string | undefined) => VideoUrlResult;

    /**
     * Persistent widget state hook (replaces useState for state that should survive navigation).
     * State stored with this hook will:
     * - Persist when navigating away from a step
     * - Be restored when returning to the step (Previous button)
     * - Be included in session state for resume
     *
     * @example
     * const [selected, setSelected] = api.hooks.useWidgetState<string[]>("selected", []);
     */
    useWidgetState: UseWidgetState;

    /**
     * Persistent widget state hook with object shape.
     * Provides convenient methods for partial updates and reset.
     *
     * @example
     * const { state, updateState, resetState } = api.hooks.useWidgetStateObject({
     *   selected: [] as string[],
     *   showFeedback: false,
     *   isCorrect: undefined as boolean | undefined,
     * });
     */
    useWidgetStateObject: UseWidgetStateObject;
  };

  /**
   * Create a variable that can be either transient (runtime only) or persistent (lesson-wide)
   * By default, creates a transient variable automatically prefixed with the widget ID
   * Example: addVariable('selectedAnswer', 0) might create 'mcwidget1_selectedAnswer'
   *
   * For lesson-wide variables, pass { scope: "lesson", skipPrefix: true }
   * Example: addVariable('TotalTime', 0, "number", { scope: "lesson", skipPrefix: true })
   *
   * @param name - Base name for the variable (will be prefixed with widget ID unless skipPrefix is true)
   * @param initialValue - Initial value for the variable
   * @param type - Optional type specification (auto-inferred if not provided)
   * @param options - Optional configuration for the variable
   * @returns The full variable name that was created
   */
  addVariable: (
    name: string,
    initialValue: VariableValue,
    type?: "string" | "number" | "boolean",
    options?: {
      scope?: "lesson" | "step";
      skipPrefix?: boolean;
      description?: string;
    },
  ) => string;

  /**
   * Increment a numeric variable by a specified amount
   * @param name - Variable name to increment
   * @param amount - Amount to increment by (default: 1)
   */
  incrementVariable: (name: string, amount?: number) => void;

  /**
   * Decrement a numeric variable by a specified amount
   * @param name - Variable name to decrement
   * @param amount - Amount to decrement by (default: 1)
   */
  decrementVariable: (name: string, amount?: number) => void;

  /**
   * Subscribe to variable changes. Fires synchronously when any variable updates,
   * before React re-renders. Returns an unsubscribe function.
   *
   * @param handler - Called with (name, oldValue, newValue) on each change
   * @returns Unsubscribe function
   */
  onVariableChange: (
    handler: (
      name: string,
      oldValue: VariableValue,
      newValue: VariableValue,
    ) => void,
  ) => () => void;

  /**
   * Synchronously resolve a numeric expression (e.g. "score * 2 + bonus").
   * Uses mathjs + Handlebars under the hood with LRU caching.
   *
   * @param expression - The expression string to evaluate
   * @returns The numeric result, or null if evaluation fails
   */
  resolveNumber: (expression: string) => number | null;

  /**
   * Synchronously evaluate a condition against the current variable snapshot.
   * Unlike hooks.useConditionEvaluation (which is reactive/effect-driven),
   * this reads current values directly from the store — safe to call in
   * event handlers where effect-based state may be stale.
   */
  evaluateCondition: EvaluateCondition;
}
