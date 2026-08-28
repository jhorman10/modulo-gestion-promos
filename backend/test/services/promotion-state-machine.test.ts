/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  PromotionStateMachine, 
  StateTransitionError 
} from '../../src/services/promotion-state-machine';

describe('PromotionStateMachine', () => {
  let stateMachine: PromotionStateMachine;

  beforeEach(() => {
    stateMachine = new PromotionStateMachine();
  });

  describe('canTransition', () => {
    it('should allow Programada -> Activa transition', () => {
      const result = stateMachine.canTransition('Programada', 'Activa');
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow Activa -> Finalizada transition', () => {
      const result = stateMachine.canTransition('Activa', 'Finalizada');
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow Programada -> Deleted (soft delete) transition', () => {
      const result = stateMachine.canTransition('Programada', 'Deleted');
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject Activa -> Activa (same state)', () => {
      const result = stateMachine.canTransition('Activa', 'Activa');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject Programada -> Finalizada (skipping Activa)', () => {
      const result = stateMachine.canTransition('Programada', 'Finalizada');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('should reject Finalizada -> Activa (backward transition)', () => {
      const result = stateMachine.canTransition('Finalizada', 'Activa');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('should reject Finalizada -> Programada (backward transition)', () => {
      const result = stateMachine.canTransition('Finalizada', 'Programada');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject Activa -> Programada (backward transition)', () => {
      const result = stateMachine.canTransition('Activa', 'Programada');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject Finalizada -> Deleted (finalized cannot be deleted)', () => {
      const result = stateMachine.canTransition('Finalizada', 'Deleted');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject Activa -> Deleted (active cannot be deleted)', () => {
      const result = stateMachine.canTransition('Activa', 'Deleted');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject Deleted -> any state (deleted is terminal)', () => {
      const result = stateMachine.canTransition('Deleted', 'Programada');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject unknown from state', () => {
      const result = stateMachine.canTransition('Unknown', 'Activa');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject unknown to state', () => {
      const result = stateMachine.canTransition('Programada', 'Unknown');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateActivate', () => {
    const now = new Date('2026-09-15T12:00:00.000Z');

    it('should allow activation when status is Programada and date is within range', () => {
      const result = stateMachine.validateActivate(
        'Programada',
        new Date('2026-09-01T00:00:00.000Z'),
        new Date('2026-09-30T23:59:59.000Z'),
        now
      );
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject activation when status is not Programada', () => {
      const result = stateMachine.validateActivate(
        'Activa',
        new Date('2026-09-01T00:00:00.000Z'),
        new Date('2026-09-30T23:59:59.000Z'),
        now
      );
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_STATE_TRANSITION');
      expect(result.error?.message).toContain('Programada');
    });

    it('should reject activation when current date is before start_date', () => {
      const futureStart = new Date('2026-10-01T00:00:00.000Z');
      const result = stateMachine.validateActivate(
        'Programada',
        futureStart,
        new Date('2026-10-30T23:59:59.000Z'),
        now
      );
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_STATE_TRANSITION');
      expect(result.error?.message).toContain('validity period');
    });

    it('should reject activation when current date is after end_date', () => {
      const pastEnd = new Date('2026-08-30T23:59:59.000Z');
      const result = stateMachine.validateActivate(
        'Programada',
        new Date('2026-08-01T00:00:00.000Z'),
        pastEnd,
        now
      );
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_STATE_TRANSITION');
      expect(result.error?.message).toContain('validity period');
    });

    it('should allow activation when current date equals start_date', () => {
      const result = stateMachine.validateActivate(
        'Programada',
        now,
        new Date('2026-09-30T23:59:59.000Z'),
        now
      );
      expect(result.allowed).toBe(true);
    });

    it('should allow activation when current date equals end_date', () => {
      const result = stateMachine.validateActivate(
        'Programada',
        new Date('2026-09-01T00:00:00.000Z'),
        now,
        now
      );
      expect(result.allowed).toBe(true);
    });

    it('should reject activation for Finalizada status', () => {
      const result = stateMachine.validateActivate(
        'Finalizada',
        new Date('2026-09-01T00:00:00.000Z'),
        new Date('2026-09-30T23:59:59.000Z'),
        now
      );
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateFinalize', () => {
    it('should allow finalize when status is Activa', () => {
      const result = stateMachine.validateFinalize('Activa');
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject finalize when status is Programada', () => {
      const result = stateMachine.validateFinalize('Programada');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_STATE_TRANSITION');
      expect(result.error?.message).toContain('Activa');
    });

    it('should reject finalize when status is Finalizada', () => {
      const result = stateMachine.validateFinalize('Finalizada');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('should reject finalize for unknown status', () => {
      const result = stateMachine.validateFinalize('Unknown');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateDelete', () => {
    it('should allow delete when status is Programada', () => {
      const result = stateMachine.validateDelete('Programada');
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject delete when status is Activa', () => {
      const result = stateMachine.validateDelete('Activa');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_STATE_TRANSITION');
      expect(result.error?.message).toContain('Programada');
    });

    it('should reject delete when status is Finalizada', () => {
      const result = stateMachine.validateDelete('Finalizada');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('should reject delete for unknown status', () => {
      const result = stateMachine.validateDelete('Unknown');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateUpdate', () => {
    it('should allow update when status is Programada', () => {
      const result = stateMachine.validateUpdate('Programada');
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow update when status is Activa', () => {
      const result = stateMachine.validateUpdate('Activa');
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject update when status is Finalizada', () => {
      const result = stateMachine.validateUpdate('Finalizada');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_STATE_TRANSITION');
      expect(result.error?.message).toContain('Finalizada');
    });

    it('should reject update for unknown status', () => {
      const result = stateMachine.validateUpdate('Unknown');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getValidTransitions', () => {
    it('should return Activa and Deleted for Programada', () => {
      const transitions = stateMachine.getValidTransitions('Programada');
      expect(transitions).toContain('Activa');
      expect(transitions).toContain('Deleted');
      expect(transitions).not.toContain('Finalizada');
    });

    it('should return Finalizada for Activa', () => {
      const transitions = stateMachine.getValidTransitions('Activa');
      expect(transitions).toContain('Finalizada');
      expect(transitions).not.toContain('Programada');
      expect(transitions).not.toContain('Deleted');
    });

    it('should return empty array for Finalizada (immutable)', () => {
      const transitions = stateMachine.getValidTransitions('Finalizada');
      expect(transitions).toEqual([]);
    });

    it('should return empty array for Deleted (terminal)', () => {
      const transitions = stateMachine.getValidTransitions('Deleted');
      expect(transitions).toEqual([]);
    });

    it('should return empty array for unknown state', () => {
      const transitions = stateMachine.getValidTransitions('Unknown');
      expect(transitions).toEqual([]);
    });
  });

  describe('StateTransitionError', () => {
    it('should create error with correct properties', () => {
      const error = new StateTransitionError('Test message', 'Programada', 'Finalizada');
      expect(error.message).toBe('Test message');
      expect(error.fromState).toBe('Programada');
      expect(error.toState).toBe('Finalizada');
      expect(error.code).toBe('INVALID_STATE_TRANSITION');
      expect(error.statusCode).toBe(409);
    });
  });
});