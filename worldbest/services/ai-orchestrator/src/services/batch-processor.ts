import { EventEmitter } from 'events';
import { AICacheService } from './ai-cache';
import { AIPersona, AIIntent } from '@worldbest/shared-types';

interface BatchRequest {
  id: string;
  persona: AIPersona;
  intent: AIIntent;
  prompt: string;
  context?: any;
  priority: 'low' | 'normal' | 'high';
  userId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
}

interface BatchJob {
  id: string;
  requests: BatchRequest[];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  results: Array<{
    requestId: string;
    response?: string;
    error?: string;
    cached: boolean;
  }>;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
}

class BatchProcessor extends EventEmitter {
  private cacheService: AICacheService;
  private activeJobs: Map<string, BatchJob> = new Map();
  private requestQueue: BatchRequest[] = [];
  private processingQueue: BatchRequest[] = [];
  private maxConcurrent = 5;
  private maxBatchSize = 50;
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.cacheService = new AICacheService();
    this.startProcessing();
  }

  /**
   * Submit batch of AI requests
   */
  async submitBatch(requests: Omit<BatchRequest, 'id'>[]): Promise<string> {
    if (requests.length > this.maxBatchSize) {
      throw new Error(`Batch size exceeds maximum of ${this.maxBatchSize}`);
    }

    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const batchRequests: BatchRequest[] = requests.map((req, index) => ({
      ...req,
      id: `${jobId}_${index}`
    }));

    const job: BatchJob = {
      id: jobId,
      requests: batchRequests,
      status: 'queued',
      createdAt: new Date(),
      results: [],
      progress: {
        total: batchRequests.length,
        completed: 0,
        failed: 0
      }
    };

    this.activeJobs.set(jobId, job);
    
    // Sort requests by priority and add to queue
    const sortedRequests = batchRequests.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    this.requestQueue.push(...sortedRequests);
    
    this.emit('batchSubmitted', { jobId, requestCount: batchRequests.length });
    
    return jobId;
  }

  /**
   * Get batch job status
   */
  getBatchStatus(jobId: string): BatchJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Cancel batch job
   */
  cancelBatch(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status === 'completed') {
      return false;
    }

    // Remove pending requests from queue
    this.requestQueue = this.requestQueue.filter(req => !req.id.startsWith(jobId));
    
    // Update job status
    job.status = 'failed';
    job.completedAt = new Date();
    
    this.emit('batchCancelled', { jobId });
    
    return true;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    queueLength: number;
    processingCount: number;
    activeJobs: number;
    totalProcessed: number;
  } {
    return {
      queueLength: this.requestQueue.length,
      processingCount: this.processingQueue.length,
      activeJobs: this.activeJobs.size,
      totalProcessed: this.getTotalProcessedCount()
    };
  }

  /**
   * Start processing queue
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Check every second
  }

  /**
   * Process requests from queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue.length >= this.maxConcurrent || this.requestQueue.length === 0) {
      return;
    }

    const batchSize = Math.min(
      this.maxConcurrent - this.processingQueue.length,
      this.requestQueue.length
    );

    const requestsToProcess = this.requestQueue.splice(0, batchSize);
    this.processingQueue.push(...requestsToProcess);

    // Process requests concurrently
    const processingPromises = requestsToProcess.map(request => 
      this.processRequest(request)
    );

    await Promise.allSettled(processingPromises);
  }

  /**
   * Process individual request
   */
  private async processRequest(request: BatchRequest): Promise<void> {
    const jobId = request.id.split('_')[0] + '_' + request.id.split('_')[1];
    const job = this.activeJobs.get(jobId);
    
    if (!job) {
      this.removeFromProcessingQueue(request.id);
      return;
    }

    try {
      // Update job status if first request
      if (job.status === 'queued') {
        job.status = 'processing';
        job.startedAt = new Date();
        this.emit('batchStarted', { jobId });
      }

      // Check cache first
      const cacheKey = this.cacheService.generateCacheKey({
        persona: request.persona,
        intent: request.intent,
        prompt: request.prompt,
        model: 'gpt-4o-mini', // Default model for batch
        temperature: 0.7
      });

      let cached = await this.cacheService.getCachedResponse(cacheKey);
      let response: string;
      let fromCache = false;

      if (cached) {
        response = cached.content;
        fromCache = true;
        await this.cacheService.trackCacheHit(true);
      } else {
        // Process with AI (simplified - in real implementation call actual AI service)
        response = await this.callAIService(request);
        fromCache = false;
        await this.cacheService.trackCacheHit(false);

        // Cache the response
        await this.cacheService.cacheResponse(cacheKey, response, {
          model: 'gpt-4o-mini',
          persona: request.persona,
          intent: request.intent,
          temperature: 0.7,
          timestamp: Date.now(),
          usage: { promptTokens: 100, completionTokens: 200 } // Estimated
        });
      }

      // Add result to job
      job.results.push({
        requestId: request.id,
        response,
        cached: fromCache
      });

      job.progress.completed++;
      
      this.emit('requestCompleted', {
        jobId,
        requestId: request.id,
        cached: fromCache,
        progress: job.progress
      });

    } catch (error) {
      // Handle error
      job.results.push({
        requestId: request.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        cached: false
      });

      job.progress.failed++;
      
      this.emit('requestFailed', {
        jobId,
        requestId: request.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        progress: job.progress
      });
    } finally {
      this.removeFromProcessingQueue(request.id);
      
      // Check if job is complete
      if (job.progress.completed + job.progress.failed >= job.progress.total) {
        job.status = 'completed';
        job.completedAt = new Date();
        
        this.emit('batchCompleted', {
          jobId,
          results: job.results,
          progress: job.progress
        });

        // Clean up completed job after some time
        setTimeout(() => {
          this.activeJobs.delete(jobId);
        }, 300000); // 5 minutes
      }
    }
  }

  /**
   * Call AI service (simplified implementation)
   */
  private async callAIService(request: BatchRequest): Promise<string> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
    
    // Simulate response based on request
    return `AI response for ${request.intent} by ${request.persona}: ${request.prompt.substring(0, 50)}...`;
  }

  /**
   * Remove request from processing queue
   */
  private removeFromProcessingQueue(requestId: string): void {
    const index = this.processingQueue.findIndex(req => req.id === requestId);
    if (index !== -1) {
      this.processingQueue.splice(index, 1);
    }
  }

  /**
   * Get total processed count across all jobs
   */
  private getTotalProcessedCount(): number {
    let total = 0;
    for (const job of this.activeJobs.values()) {
      total += job.progress.completed + job.progress.failed;
    }
    return total;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    this.removeAllListeners();
    this.activeJobs.clear();
    this.requestQueue.length = 0;
    this.processingQueue.length = 0;
  }
}

export { BatchProcessor, BatchRequest, BatchJob };"