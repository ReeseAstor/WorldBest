import { Operation, OperationType, TransformResult, OperationResult, ConflictType } from '../types/collaboration.types.js';

export class OperationalTransform {
  /**
   * Transform two concurrent operations against each other
   * Based on the Operational Transform algorithm for conflict-free collaborative editing
   */
  static transform(op1: Operation, op2: Operation): { op1Prime: Operation; op2Prime: Operation } {
    // If operations are from the same client and same version, no transformation needed
    if (op1.clientId === op2.clientId && op1.version === op2.version) {
      return { op1Prime: op1, op2Prime: op2 };
    }

    let op1Prime = { ...op1 };
    let op2Prime = { ...op2 };

    // Transform based on operation types
    if (op1.type === OperationType.INSERT && op2.type === OperationType.INSERT) {
      [op1Prime, op2Prime] = this.transformInsertInsert(op1, op2);
    } else if (op1.type === OperationType.INSERT && op2.type === OperationType.DELETE) {
      [op1Prime, op2Prime] = this.transformInsertDelete(op1, op2);
    } else if (op1.type === OperationType.DELETE && op2.type === OperationType.INSERT) {
      [op2Prime, op1Prime] = this.transformInsertDelete(op2, op1);
    } else if (op1.type === OperationType.DELETE && op2.type === OperationType.DELETE) {
      [op1Prime, op2Prime] = this.transformDeleteDelete(op1, op2);
    }

    return { op1Prime, op2Prime };
  }

  /**
   * Transform two concurrent insert operations
   */
  private static transformInsertInsert(op1: Operation, op2: Operation): [Operation, Operation] {
    let op1Prime = { ...op1 };
    let op2Prime = { ...op2 };

    if (op1.position <= op2.position) {
      // op2 position shifts by the length of op1's content
      op2Prime.position = op2.position + (op1.content?.length || 0);
    } else {
      // op1 position shifts by the length of op2's content
      op1Prime.position = op1.position + (op2.content?.length || 0);
    }

    return [op1Prime, op2Prime];
  }

  /**
   * Transform insert and delete operations
   */
  private static transformInsertDelete(insert: Operation, deleteOp: Operation): [Operation, Operation] {
    let insertPrime = { ...insert };
    let deletePrime = { ...deleteOp };

    const deleteEnd = deleteOp.position + (deleteOp.length || 0);

    if (insert.position <= deleteOp.position) {
      // Insert happens before delete, adjust delete position
      deletePrime.position = deleteOp.position + (insert.content?.length || 0);
    } else if (insert.position >= deleteEnd) {
      // Insert happens after delete, adjust insert position
      insertPrime.position = insert.position - (deleteOp.length || 0);
    } else {
      // Insert happens within deleted range - complex case
      // Insert position becomes the delete position
      insertPrime.position = deleteOp.position;
      // Delete length might need adjustment
      deletePrime.length = (deleteOp.length || 0) + (insert.content?.length || 0);
    }

    return [insertPrime, deletePrime];
  }

  /**
   * Transform two concurrent delete operations
   */
  private static transformDeleteDelete(op1: Operation, op2: Operation): [Operation, Operation] {
    let op1Prime = { ...op1 };
    let op2Prime = { ...op2 };

    const op1End = op1.position + (op1.length || 0);
    const op2End = op2.position + (op2.length || 0);

    // Case 1: No overlap
    if (op1End <= op2.position) {
      // op1 is completely before op2
      op2Prime.position = op2.position - (op1.length || 0);
    } else if (op2End <= op1.position) {
      // op2 is completely before op1
      op1Prime.position = op1.position - (op2.length || 0);
    } else {
      // Case 2: Overlapping deletes - need to merge or resolve conflict
      const overlapStart = Math.max(op1.position, op2.position);
      const overlapEnd = Math.min(op1End, op2End);
      const overlapLength = overlapEnd - overlapStart;

      if (op1.position <= op2.position) {
        if (op1End >= op2End) {
          // op1 completely contains op2
          op1Prime.length = (op1.length || 0) - (op2.length || 0);
          op2Prime.length = 0; // op2 becomes no-op
        } else {
          // Partial overlap, op1 starts first
          op1Prime.length = (op1.length || 0) - overlapLength;
          op2Prime.position = op1.position;
          op2Prime.length = (op2.length || 0) - overlapLength;
        }
      } else {
        if (op2End >= op1End) {
          // op2 completely contains op1
          op2Prime.length = (op2.length || 0) - (op1.length || 0);
          op1Prime.length = 0; // op1 becomes no-op
        } else {
          // Partial overlap, op2 starts first
          op2Prime.length = (op2.length || 0) - overlapLength;
          op1Prime.position = op2.position;
          op1Prime.length = (op1.length || 0) - overlapLength;
        }
      }
    }

    return [op1Prime, op2Prime];
  }

  /**
   * Apply a series of operations to a document
   */
  static applyOperations(content: string, operations: Operation[]): string {
    let result = content;
    
    // Sort operations by position (descending for proper application)
    const sortedOps = [...operations].sort((a, b) => b.position - a.position);

    for (const op of sortedOps) {
      result = this.applyOperation(result, op);
    }

    return result;
  }

  /**
   * Apply a single operation to content
   */
  static applyOperation(content: string, operation: Operation): string {
    switch (operation.type) {
      case OperationType.INSERT:
        return this.applyInsert(content, operation);
      case OperationType.DELETE:
        return this.applyDelete(content, operation);
      case OperationType.RETAIN:
        return content; // Retain operations don't change content
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Apply insert operation
   */
  private static applyInsert(content: string, operation: Operation): string {
    const position = Math.max(0, Math.min(operation.position, content.length));
    const insertText = operation.content || '';
    
    return content.slice(0, position) + insertText + content.slice(position);
  }

  /**
   * Apply delete operation
   */
  private static applyDelete(content: string, operation: Operation): string {
    const start = Math.max(0, Math.min(operation.position, content.length));
    const length = operation.length || 0;
    const end = Math.min(start + length, content.length);
    
    return content.slice(0, start) + content.slice(end);
  }

  /**
   * Compose multiple operations into a single operation
   */
  static compose(operations: Operation[]): Operation {
    if (operations.length === 0) {
      throw new Error('Cannot compose empty operation list');
    }

    if (operations.length === 1) {
      return operations[0];
    }

    // Start with the first operation
    let composed = operations[0];

    for (let i = 1; i < operations.length; i++) {
      composed = this.composeTwo(composed, operations[i]);
    }

    return composed;
  }

  /**
   * Compose two operations into one
   */
  private static composeTwo(op1: Operation, op2: Operation): Operation {
    // Simple composition - in practice, this would be more complex
    // depending on the specific requirements
    
    if (op1.type === OperationType.INSERT && op2.type === OperationType.INSERT) {
      // Merge inserts if they're adjacent
      if (op1.position + (op1.content?.length || 0) === op2.position) {
        return {
          ...op1,
          content: (op1.content || '') + (op2.content || ''),
          timestamp: op2.timestamp
        };
      }
    }

    // If operations can't be composed, return the second one
    // In a real implementation, this would maintain both operations
    return op2;
  }

  /**
   * Check if an operation is valid
   */
  static validateOperation(operation: Operation, contentLength: number): boolean {
    switch (operation.type) {
      case OperationType.INSERT:
        return operation.position >= 0 && 
               operation.position <= contentLength && 
               operation.content !== undefined;
      
      case OperationType.DELETE:
        return operation.position >= 0 && 
               operation.position < contentLength && 
               (operation.length || 0) > 0 &&
               operation.position + (operation.length || 0) <= contentLength;
      
      case OperationType.RETAIN:
        return operation.position >= 0 && operation.position <= contentLength;
      
      default:
        return false;
    }
  }

  /**
   * Generate inverse operation (for undo functionality)
   */
  static invert(operation: Operation, content: string): Operation {
    switch (operation.type) {
      case OperationType.INSERT:
        return {
          ...operation,
          type: OperationType.DELETE,
          length: operation.content?.length || 0,
          content: undefined
        };
      
      case OperationType.DELETE:
        const deletedContent = content.slice(
          operation.position, 
          operation.position + (operation.length || 0)
        );
        return {
          ...operation,
          type: OperationType.INSERT,
          content: deletedContent,
          length: undefined
        };
      
      case OperationType.RETAIN:
        return operation; // Retain is its own inverse
      
      default:
        throw new Error(`Cannot invert operation of type: ${operation.type}`);
    }
  }

  /**
   * Calculate priority for conflict resolution
   */
  static calculatePriority(operation: Operation): number {
    // Priority based on timestamp, user ID, and operation type
    let priority = operation.timestamp.getTime();
    
    // Tie-breaker using user ID hash
    const userHash = this.hashString(operation.userId);
    priority += userHash / 1000000; // Small adjustment based on user
    
    // Operation type priority (insert > delete > retain)
    const typePriority = {
      [OperationType.INSERT]: 0.3,
      [OperationType.DELETE]: 0.2,
      [OperationType.RETAIN]: 0.1
    };
    
    priority += typePriority[operation.type] || 0;
    
    return priority;
  }

  /**
   * Simple string hash function
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Transform operation against a series of concurrent operations
   */
  static transformAgainstOperations(
    operation: Operation, 
    concurrentOps: Operation[]
  ): TransformResult {
    let transformedOp = { ...operation };
    let transformed = false;
    
    for (const concurrentOp of concurrentOps) {
      if (concurrentOp.clientId !== operation.clientId) {
        const result = this.transform(transformedOp, concurrentOp);
        transformedOp = result.op1Prime;
        transformed = true;
      }
    }
    
    return {
      operation: transformedOp,
      transformed,
      priority: this.calculatePriority(transformedOp)
    };
  }
}