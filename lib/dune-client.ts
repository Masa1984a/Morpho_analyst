/**
 * Dune Analytics API Client
 * Provides methods to execute queries and retrieve results from Dune Analytics
 */

import type {
  DuneExecutionResponse,
  DuneStatusResponse,
  DuneResultResponse,
  DuneExecutionState,
  RetryConfig,
} from './types';

export class DuneAPIClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.dune.com/api/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DUNE_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('DUNE_API_KEY is required');
    }
  }

  /**
   * Execute a Dune query with optional parameters
   */
  async executeQuery(
    queryId: number,
    params?: Record<string, any>
  ): Promise<string> {
    const url = `${this.baseUrl}/query/${queryId}/execute`;

    const body: any = {};
    if (params) {
      body.query_parameters = params;
    }

    const response = await this.makeRequest<DuneExecutionResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dune-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    console.log(`✓ Query ${queryId} execution started: ${response.execution_id}`);
    return response.execution_id;
  }

  /**
   * Check execution status
   */
  async checkExecutionStatus(executionId: string): Promise<DuneStatusResponse> {
    const url = `${this.baseUrl}/execution/${executionId}/status`;

    const response = await this.makeRequest<DuneStatusResponse>(url, {
      method: 'GET',
      headers: {
        'x-dune-api-key': this.apiKey,
      },
    });

    return response;
  }

  /**
   * Get execution results
   */
  async getExecutionResults<T = any>(
    executionId: string
  ): Promise<DuneResultResponse<T>> {
    const url = `${this.baseUrl}/execution/${executionId}/results`;

    const response = await this.makeRequest<DuneResultResponse<T>>(url, {
      method: 'GET',
      headers: {
        'x-dune-api-key': this.apiKey,
      },
    });

    return response;
  }

  /**
   * Wait for query execution to complete
   */
  async waitForExecution(
    executionId: string,
    timeoutMs: number = 300000, // 5 minutes
    pollIntervalMs: number = 5000 // 5 seconds
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.checkExecutionStatus(executionId);
      const state = status.state;

      console.log(`  Execution status: ${state}`);

      if (state === 'QUERY_STATE_COMPLETED') {
        console.log('✓ Query execution completed');
        return true;
      }

      if (state === 'QUERY_STATE_FAILED' || state === 'QUERY_STATE_CANCELLED') {
        console.error(`✗ Query execution failed: ${state}`);
        return false;
      }

      // Wait before next poll
      await this.sleep(pollIntervalMs);
    }

    console.error('✗ Timeout: Query execution did not complete in time');
    return false;
  }

  /**
   * Execute query and wait for results (convenience method)
   */
  async executeAndWait<T = any>(
    queryId: number,
    params?: Record<string, any>,
    timeoutMs: number = 300000
  ): Promise<DuneResultResponse<T> | null> {
    try {
      // Execute query
      const executionId = await this.executeQuery(queryId, params);

      // Wait for completion
      const success = await this.waitForExecution(executionId, timeoutMs);

      if (!success) {
        return null;
      }

      // Get results
      const results = await this.getExecutionResults<T>(executionId);
      return results;
    } catch (error) {
      console.error('Error in executeAndWait:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request with error handling and retry logic
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit,
    retryConfig: RetryConfig = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 8000,
      backoffMultiplier: 2,
    }
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        // Handle rate limiting (429)
        if (response.status === 429) {
          if (attempt < retryConfig.maxRetries) {
            console.warn(
              `Rate limited (429). Retrying in ${delay}ms... (attempt ${attempt + 1}/${retryConfig.maxRetries})`
            );
            await this.sleep(delay);
            delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
            continue;
          }
        }

        // Handle other HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP ${response.status}: ${response.statusText} - ${errorText}`
          );
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;

        if (attempt < retryConfig.maxRetries) {
          console.warn(
            `Request failed: ${lastError.message}. Retrying in ${delay}ms... (attempt ${attempt + 1}/${retryConfig.maxRetries})`
          );
          await this.sleep(delay);
          delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create and return a Dune API client instance
 */
export function createDuneClient(apiKey?: string): DuneAPIClient {
  return new DuneAPIClient(apiKey);
}
