import { vi } from 'vitest';
import type { CategoryValue } from '@churchtools-extensions/persistance';

/**
 * Mock implementation of PersistanceCategory for testing
 * Simulates in-memory storage with configurable network delays, error injection, and metrics tracking
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PersistenceError {
  type:
    | 'quota_exceeded'
    | 'network_timeout'
    | 'permission_denied'
    | 'not_found'
    | 'custom';
  message: string;
  afterCalls?: number; // Trigger error after N calls
  random?: boolean; // Randomly trigger error
  probability?: number; // Probability of error (0.0 - 1.0)
}

export interface NetworkDelayConfig {
  min: number; // Minimum delay in ms
  max: number; // Maximum delay in ms
  mode: 'off' | 'fast' | 'realistic';
}

export interface OperationMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
}

export interface PersistenceMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageDuration: number;
  operations: OperationMetrics[];
}

// ============================================================================
// Global Configuration
// ============================================================================

class MockPersistenceConfig {
  private networkDelay: NetworkDelayConfig = {
    min: 0,
    max: 0,
    mode: 'off',
  };
  private errorRate = 0;
  private quotaLimit = Infinity;
  private activeError: PersistenceError | null = null;
  private errorCallCount = 0;
  private globalMetrics: PersistenceMetrics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageDuration: 0,
    operations: [],
  };

  /**
   * Set network delay for all operations
   */
  setNetworkDelay(
    min: number,
    max: number,
    mode: NetworkDelayConfig['mode'] = 'realistic',
  ): void {
    this.networkDelay = { min, max, mode };
  }

  /**
   * Set random error rate (0.0 - 1.0)
   */
  setErrorRate(rate: number): void {
    if (rate < 0 || rate > 1) {
      throw new Error('Error rate must be between 0.0 and 1.0');
    }
    this.errorRate = rate;
  }

  /**
   * Set maximum number of records before quota exceeded error
   */
  setQuotaLimit(maxRecords: number): void {
    this.quotaLimit = maxRecords;
  }

  /**
   * Simulate a specific error scenario
   */
  simulateError(error: PersistenceError): void {
    this.activeError = error;
    this.errorCallCount = 0;
  }

  /**
   * Clear active error simulation
   */
  clearError(): void {
    this.activeError = null;
    this.errorCallCount = 0;
  }

  /**
   * Get current network delay
   */
  getNetworkDelay(): NetworkDelayConfig {
    return this.networkDelay;
  }

  /**
   * Check if should trigger an error
   */
  shouldTriggerError(): PersistenceError | null {
    // Check random error rate
    if (this.errorRate > 0 && Math.random() < this.errorRate) {
      return {
        type: 'network_timeout',
        message: 'Network timeout (random error)',
      };
    }

    // Check active error scenario
    if (this.activeError) {
      this.errorCallCount++;

      if (
        this.activeError.afterCalls &&
        this.errorCallCount < this.activeError.afterCalls
      ) {
        return null;
      }

      if (this.activeError.random && this.activeError.probability) {
        if (Math.random() < this.activeError.probability) {
          return this.activeError;
        }
        return null;
      }

      return this.activeError;
    }

    return null;
  }

  /**
   * Check if quota is exceeded
   */
  checkQuota(currentRecords: number): boolean {
    return currentRecords >= this.quotaLimit;
  }

  /**
   * Record operation metrics
   */
  recordMetric(metric: OperationMetrics): void {
    this.globalMetrics.operations.push(metric);
    this.globalMetrics.totalCalls++;

    if (metric.success) {
      this.globalMetrics.successfulCalls++;
    } else {
      this.globalMetrics.failedCalls++;
    }

    // Update average duration
    const totalDuration = this.globalMetrics.operations.reduce(
      (sum, op) => sum + op.duration,
      0,
    );
    this.globalMetrics.averageDuration =
      totalDuration / this.globalMetrics.totalCalls;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PersistenceMetrics {
    return { ...this.globalMetrics };
  }

  /**
   * Reset all configuration and metrics
   */
  reset(): void {
    this.networkDelay = { min: 0, max: 0, mode: 'off' };
    this.errorRate = 0;
    this.quotaLimit = Infinity;
    this.activeError = null;
    this.errorCallCount = 0;
    this.globalMetrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageDuration: 0,
      operations: [],
    };
  }
}

// Global singleton for mock configuration
export const mockPersistenceConfig = new MockPersistenceConfig();

// ============================================================================
// Pre-built Error Scenarios
// ============================================================================

export const PERSISTENCE_SCENARIOS = {
  quotaExceeded: {
    type: 'quota_exceeded' as const,
    message: 'Storage quota exceeded. Maximum number of records reached.',
    afterCalls: 100,
  },
  networkTimeout: {
    type: 'network_timeout' as const,
    message: 'Request timeout after 30 seconds',
  },
  permissionDenied: {
    type: 'permission_denied' as const,
    message: '403 Forbidden: Insufficient permissions',
    random: true,
    probability: 0.1,
  },
  notFound: {
    type: 'not_found' as const,
    message: 'Resource not found',
  },
} as const;

// ============================================================================
// Mock PersistanceCategory
// ============================================================================

export class MockPersistanceCategory<T = any> {
  private data = new Map<number, CategoryValue<T>>();
  private nextId = 1;
  private static instances: MockPersistanceCategory<any>[] = [];
  private instanceMetrics: PersistenceMetrics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageDuration: 0,
    operations: [],
  };

  constructor(_config: {
    extensionkey: string;
    categoryShorty: string;
    categoryName?: string;
  }) {
    MockPersistanceCategory.instances.push(this);
  }

  static async init<T>(config: {
    extensionkey: string;
    categoryShorty: string;
    categoryName?: string;
  }): Promise<MockPersistanceCategory<T>> {
    return new MockPersistanceCategory<T>(config);
  }

  static _resetAll(): void {
    MockPersistanceCategory.instances.forEach((instance) =>
      instance._clearData(),
    );
    MockPersistanceCategory.instances = [];
    mockPersistenceConfig.reset();
  }

  /**
   * Simulate network delay based on configuration
   */
  private async _simulateDelay(): Promise<void> {
    const delayConfig = mockPersistenceConfig.getNetworkDelay();

    if (delayConfig.mode === 'off') {
      return;
    }

    const delay =
      delayConfig.min + Math.random() * (delayConfig.max - delayConfig.min);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Execute an operation with metrics tracking and error simulation
   */
  private async _executeOperation<R>(
    operationName: string,
    operation: () => R | Promise<R>,
  ): Promise<R> {
    const startTime = Date.now();
    let success = true;
    let error: string | undefined;

    try {
      // Simulate network delay
      await this._simulateDelay();

      // Check for error scenarios
      const shouldError = mockPersistenceConfig.shouldTriggerError();
      if (shouldError) {
        throw new Error(shouldError.message);
      }

      // Execute the operation
      const result = await operation();

      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const endTime = Date.now();
      const metric: OperationMetrics = {
        operation: operationName,
        startTime,
        endTime,
        duration: endTime - startTime,
        success,
        error,
      };

      // Record metrics at both global and instance level
      mockPersistenceConfig.recordMetric(metric);
      this._recordInstanceMetric(metric);
    }
  }

  /**
   * Record metrics for this instance
   */
  private _recordInstanceMetric(metric: OperationMetrics): void {
    this.instanceMetrics.operations.push(metric);
    this.instanceMetrics.totalCalls++;

    if (metric.success) {
      this.instanceMetrics.successfulCalls++;
    } else {
      this.instanceMetrics.failedCalls++;
    }

    const totalDuration = this.instanceMetrics.operations.reduce(
      (sum, op) => sum + op.duration,
      0,
    );
    this.instanceMetrics.averageDuration =
      totalDuration / this.instanceMetrics.totalCalls;
  }

  async create(value: T): Promise<{ id: number }> {
    return this._executeOperation('create', () => {
      // Check quota
      if (mockPersistenceConfig.checkQuota(this.data.size)) {
        throw new Error(PERSISTENCE_SCENARIOS.quotaExceeded.message);
      }

      const id = this.nextId++;
      this.data.set(id, {
        id,
        value,
        raw: {} as any,
      });
      return { id };
    });
  }

  async list<U = T>(): Promise<CategoryValue<U>[]> {
    return this._executeOperation('list', () => {
      return Array.from(this.data.values()) as unknown as CategoryValue<U>[];
    });
  }

  async get(id: number): Promise<CategoryValue<T> | null> {
    return this._executeOperation('get', () => {
      return this.data.get(id) || null;
    });
  }

  async update(id: number, value: T): Promise<void> {
    return this._executeOperation('update', () => {
      if (!this.data.has(id)) {
        throw new Error(`Item with id ${id} not found`);
      }
      this.data.set(id, {
        id,
        value,
        raw: {} as any,
      });
    });
  }

  async delete(id: number): Promise<void> {
    return this._executeOperation('delete', () => {
      if (!this.data.has(id)) {
        throw new Error(`Item with id ${id} not found`);
      }
      this.data.delete(id);
    });
  }

  async deleteCategory(): Promise<void> {
    return this._executeOperation('deleteCategory', () => {
      this.data.clear();
    });
  }

  /**
   * Get metrics for this instance
   */
  getMetrics(): PersistenceMetrics {
    return { ...this.instanceMetrics };
  }

  /**
   * Wait for all pending operations to complete
   */
  async _waitForPendingOperations(): Promise<void> {
    // In this implementation, operations complete immediately
    // This is a placeholder for potential future async behavior
    await Promise.resolve();
  }

  /**
   * Get operation log for testing/debugging
   */
  _getOperationLog(): OperationMetrics[] {
    return [...this.instanceMetrics.operations];
  }

  /**
   * Seed data for testing
   */
  _seedData(items: Array<{ id?: number; value: T }>): void {
    items.forEach((item) => {
      const id = item.id ?? this.nextId++;
      this.data.set(id, {
        id,
        value: item.value,
        raw: {} as any,
      });
      if (id >= this.nextId) {
        this.nextId = id + 1;
      }
    });
  }

  /**
   * Clear all data for testing
   */
  _clearData(): void {
    this.data.clear();
    this.nextId = 1;
    this.instanceMetrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageDuration: 0,
      operations: [],
    };
  }

  /**
   * Get current data size
   */
  _getDataSize(): number {
    return this.data.size;
  }
}

// ============================================================================
// Vitest Mock Setup
// ============================================================================

export const mockPersistanceCategory = vi.fn(
  MockPersistanceCategory.init,
) as any;

vi.mock('@churchtools-extensions/persistance', () => ({
  PersistanceCategory: {
    init: mockPersistanceCategory,
  },
}));
