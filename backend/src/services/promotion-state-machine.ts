import { ErrorCode } from '../utils/errors';

/**
 * Promotion status enum (matches Prisma enum)
 */
export type PromotionStatus = 'Programada' | 'Activa' | 'Finalizada';

/**
 * Extended status including Deleted for state machine purposes
 */
export type PromotionState = PromotionStatus | 'Deleted';

/**
 * Result of a state transition validation
 */
export interface TransitionResult {
  allowed: boolean;
  error?: StateTransitionError;
}

/**
 * Custom error for invalid state transitions
 */
export class StateTransitionError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly fromState: PromotionState;
  public readonly toState: PromotionState;

  constructor(message: string, fromState: PromotionState, toState: PromotionState) {
    super(message);
    this.name = 'StateTransitionError';
    this.code = ErrorCode.INVALID_STATE_TRANSITION;
    this.statusCode = 409;
    this.fromState = fromState;
    this.toState = toState;
  }
}

/**
 * State machine for promotion lifecycle transitions
 * 
 * Valid transitions:
 * - Programada -> Activa (via activate, requires date validation)
 * - Programada -> Deleted (via soft delete)
 * - Activa -> Finalizada (via finalize)
 * - Finalizada: IMMUTABLE - no transitions allowed
 * - Deleted: TERMINAL - no transitions allowed
 */
export class PromotionStateMachine {
  // Define valid direct transitions (without additional validation)
  private readonly validTransitions: Record<PromotionState, PromotionState[]> = {
    Programada: ['Activa', 'Deleted'],
    Activa: ['Finalizada'],
    Finalizada: [],
    Deleted: [],
  };

  /**
   * Check if a direct transition between states is valid (without additional business rules)
   */
  canTransition(fromState: PromotionState, toState: PromotionState): TransitionResult {
    // Validate states
    if (!this.isValidState(fromState)) {
      return {
        allowed: false,
        error: new StateTransitionError(
          `Invalid source state: ${fromState as string}`,
          fromState,
          toState
        ),
      };
    }

    if (!this.isValidState(toState)) {
      return {
        allowed: false,
        error: new StateTransitionError(
          `Invalid target state: ${toState as string}`,
          fromState,
          toState
        ),
      };
    }

    // Same state is not a transition
    if (fromState === toState) {
      return {
        allowed: false,
        error: new StateTransitionError(
          'Cannot transition to the same state',
          fromState,
          toState
        ),
      };
    }

    // Check if transition is in valid transitions map
    const allowedTargets = this.validTransitions[fromState];
    if (!allowedTargets.includes(toState)) {
      return {
        allowed: false,
        error: new StateTransitionError(
          `Invalid transition from ${fromState} to ${toState}`,
          fromState,
          toState
        ),
      };
    }

    return { allowed: true };
  }

  /**
   * Validate activation transition (Programada -> Activa)
   * Requires: status is Programada AND current date is within [startDate, endDate]
   */
  validateActivate(
    currentStatus: PromotionStatus,
    startDate: Date,
    endDate: Date,
    currentDate: Date = new Date()
  ): TransitionResult {
    // Check if current status is Programada
    if (currentStatus !== 'Programada') {
      return {
        allowed: false,
        error: new StateTransitionError(
          'Only Programada promotions can be activated',
          currentStatus,
          'Activa'
        ),
      };
    }

    // Check date range: currentDate must be within [startDate, endDate] (inclusive)
    const startOfDay = this.startOfDayUTC(startDate);
    const endOfDay = this.endOfDayUTC(endDate);
    const currentDay = this.startOfDayUTC(currentDate);

    if (currentDay < startOfDay || currentDay > endOfDay) {
      return {
        allowed: false,
        error: new StateTransitionError(
          'Promotion cannot be activated outside its validity period',
          currentStatus,
          'Activa'
        ),
      };
    }

    return { allowed: true };
  }

  /**
   * Validate finalize transition (Activa -> Finalizada)
   * Requires: status is Activa
   */
  validateFinalize(currentStatus: PromotionStatus): TransitionResult {
    if (currentStatus !== 'Activa') {
      return {
        allowed: false,
        error: new StateTransitionError(
          'Only Activa promotions can be finalized',
          currentStatus,
          'Finalizada'
        ),
      };
    }
    return { allowed: true };
  }

  /**
   * Validate soft delete transition (Programada -> Deleted)
   * Requires: status is Programada
   */
  validateDelete(currentStatus: PromotionStatus): TransitionResult {
    if (currentStatus !== 'Programada') {
      return {
        allowed: false,
        error: new StateTransitionError(
          'Only Programada promotions can be deleted',
          currentStatus,
          'Deleted'
        ),
      };
    }
    return { allowed: true };
  }

  /**
   * Validate update operation
   * Requires: status is NOT Finalizada (Finalizada is immutable)
   */
  validateUpdate(currentStatus: PromotionStatus): TransitionResult {
    // Validate that status is a known promotion status
    if (!['Programada', 'Activa', 'Finalizada'].includes(currentStatus)) {
      return {
        allowed: false,
        error: new StateTransitionError(
          `Invalid promotion status: ${currentStatus}`,
          currentStatus,
          currentStatus
        ),
      };
    }

    if (currentStatus === 'Finalizada') {
      return {
        allowed: false,
        error: new StateTransitionError(
          'Finalizada promotions cannot be modified',
          currentStatus,
          currentStatus
        ),
      };
    }
    return { allowed: true };
  }

  /**
   * Get all valid transitions from a given state
   */
  getValidTransitions(fromState: PromotionState): PromotionState[] {
    if (!this.isValidState(fromState)) {
      return [];
    }
    return [...this.validTransitions[fromState]];
  }

  /**
   * Check if a state is valid
   */
  private isValidState(state: string): state is PromotionState {
    return ['Programada', 'Activa', 'Finalizada', 'Deleted'].includes(state);
  }

  /**
   * Get start of day in UTC (00:00:00.000)
   */
  private startOfDayUTC(date: Date): Date {
    const result = new Date(date);
    result.setUTCHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get end of day in UTC (23:59:59.999)
   */
  private endOfDayUTC(date: Date): Date {
    const result = new Date(date);
    result.setUTCHours(23, 59, 59, 999);
    return result;
  }
}