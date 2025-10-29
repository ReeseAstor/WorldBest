import { 
  Comment, 
  CommentThread, 
  CommentPosition, 
  CommentStatus, 
  CommentReaction 
} from '../types/collaboration.types.js';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export interface CommentEvents {
  'comment-added': (comment: Comment) => void;
  'comment-updated': (comment: Comment) => void;
  'comment-resolved': (commentId: string, resolvedBy: string) => void;
  'comment-deleted': (commentId: string, deletedBy: string) => void;
  'reply-added': (comment: Comment, parentId: string) => void;
  'reaction-added': (commentId: string, reaction: CommentReaction) => void;
  'reaction-removed': (commentId: string, userId: string, emoji: string) => void;
  'thread-resolved': (threadId: string, resolvedBy: string) => void;
}

export class CommentService extends EventEmitter {
  private comments: Map<string, Comment[]> = new Map(); // documentId -> Comment[]
  private threads: Map<string, CommentThread> = new Map(); // threadId -> CommentThread
  private userMentions: Map<string, string[]> = new Map(); // userId -> commentIds[]

  constructor() {
    super();
  }

  /**
   * Add a new comment to a document
   */
  async addComment(
    documentId: string,
    userId: string,
    username: string,
    content: string,
    position: CommentPosition,
    parentCommentId?: string
  ): Promise<Comment> {
    const comment: Comment = {
      id: uuidv4(),
      documentId,
      userId,
      username,
      content,
      position,
      status: CommentStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      reactions: []
    };

    // Handle threading
    if (parentCommentId) {
      const parentComment = await this.getComment(documentId, parentCommentId);
      if (parentComment) {
        // Create or update thread
        let thread = parentComment.thread;
        if (!thread) {
          thread = {
            id: uuidv4(),
            parentCommentId,
            replies: [],
            participants: [parentComment.userId],
            isResolved: false
          };
          parentComment.thread = thread;
          this.threads.set(thread.id, thread);
        }

        // Add reply to thread
        thread.replies.push(comment);
        if (!thread.participants.includes(userId)) {
          thread.participants.push(userId);
        }

        comment.thread = thread;
        this.emit('reply-added', comment, parentCommentId);
      }
    }

    // Add comment to document
    const documentComments = this.comments.get(documentId) || [];
    documentComments.push(comment);
    this.comments.set(documentId, documentComments);

    // Process mentions
    await this.processMentions(comment);

    this.emit('comment-added', comment);
    return comment;
  }

  /**
   * Update an existing comment
   */
  async updateComment(
    documentId: string,
    commentId: string,
    userId: string,
    newContent: string
  ): Promise<Comment | null> {
    const comment = await this.getComment(documentId, commentId);
    if (!comment || comment.userId !== userId) {
      return null;
    }

    comment.content = newContent;
    comment.updatedAt = new Date();

    // Reprocess mentions
    await this.processMentions(comment);

    this.emit('comment-updated', comment);
    return comment;
  }

  /**
   * Resolve a comment or thread
   */
  async resolveComment(
    documentId: string,
    commentId: string,
    resolvedBy: string
  ): Promise<boolean> {
    const comment = await this.getComment(documentId, commentId);
    if (!comment) return false;

    comment.status = CommentStatus.RESOLVED;
    comment.resolvedAt = new Date();
    comment.resolvedBy = resolvedBy;

    // If this comment has a thread, resolve the entire thread
    if (comment.thread) {
      comment.thread.isResolved = true;
      
      // Mark all replies as resolved
      for (const reply of comment.thread.replies) {
        reply.status = CommentStatus.RESOLVED;
        reply.resolvedAt = new Date();
        reply.resolvedBy = resolvedBy;
      }

      this.emit('thread-resolved', comment.thread.id, resolvedBy);
    }

    this.emit('comment-resolved', commentId, resolvedBy);
    return true;
  }

  /**
   * Delete a comment
   */
  async deleteComment(
    documentId: string,
    commentId: string,
    userId: string
  ): Promise<boolean> {
    const documentComments = this.comments.get(documentId) || [];
    const commentIndex = documentComments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) return false;
    
    const comment = documentComments[commentIndex];
    
    // Check permissions (user can delete their own comments)
    if (comment.userId !== userId) return false;

    // Mark as deleted instead of removing (to preserve thread structure)
    comment.status = CommentStatus.DELETED;
    comment.content = '[This comment has been deleted]';
    comment.updatedAt = new Date();

    this.emit('comment-deleted', commentId, userId);
    return true;
  }

  /**
   * Add a reaction to a comment
   */
  async addReaction(
    documentId: string,
    commentId: string,
    userId: string,
    emoji: string
  ): Promise<boolean> {
    const comment = await this.getComment(documentId, commentId);
    if (!comment) return false;

    // Check if user already reacted with this emoji
    const existingReaction = comment.reactions.find(
      r => r.userId === userId && r.emoji === emoji
    );

    if (existingReaction) return false;

    const reaction: CommentReaction = {
      userId,
      emoji,
      timestamp: new Date()
    };

    comment.reactions.push(reaction);
    this.emit('reaction-added', commentId, reaction);
    return true;
  }

  /**
   * Remove a reaction from a comment
   */
  async removeReaction(
    documentId: string,
    commentId: string,
    userId: string,
    emoji: string
  ): Promise<boolean> {
    const comment = await this.getComment(documentId, commentId);
    if (!comment) return false;

    const reactionIndex = comment.reactions.findIndex(
      r => r.userId === userId && r.emoji === emoji
    );

    if (reactionIndex === -1) return false;

    comment.reactions.splice(reactionIndex, 1);
    this.emit('reaction-removed', commentId, userId, emoji);
    return true;
  }

  /**
   * Get all comments for a document
   */
  async getComments(
    documentId: string,
    options: {
      includeResolved?: boolean;
      includeDeleted?: boolean;
      sortBy?: 'createdAt' | 'updatedAt' | 'position';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<Comment[]> {
    const { includeResolved = false, includeDeleted = false, sortBy = 'createdAt', sortOrder = 'asc' } = options;
    
    let comments = this.comments.get(documentId) || [];

    // Filter by status
    comments = comments.filter(comment => {
      if (!includeResolved && comment.status === CommentStatus.RESOLVED) return false;
      if (!includeDeleted && comment.status === CommentStatus.DELETED) return false;
      return true;
    });

    // Sort comments
    comments.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'position':
          comparison = a.position.start - b.position.start;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return comments;
  }

  /**
   * Get a specific comment
   */
  async getComment(documentId: string, commentId: string): Promise<Comment | null> {
    const documentComments = this.comments.get(documentId) || [];
    return documentComments.find(c => c.id === commentId) || null;
  }

  /**
   * Get comments by position range
   */
  async getCommentsByRange(
    documentId: string,
    startPosition: number,
    endPosition: number
  ): Promise<Comment[]> {
    const documentComments = this.comments.get(documentId) || [];
    
    return documentComments.filter(comment => {
      if (comment.status === CommentStatus.DELETED) return false;
      
      const commentStart = comment.position.start;
      const commentEnd = comment.position.end;
      
      // Check if comment overlaps with the range
      return (
        (commentStart >= startPosition && commentStart <= endPosition) ||
        (commentEnd >= startPosition && commentEnd <= endPosition) ||
        (commentStart <= startPosition && commentEnd >= endPosition)
      );
    });
  }

  /**
   * Get threaded comments structure
   */
  async getThreadedComments(documentId: string): Promise<Comment[]> {
    const comments = await this.getComments(documentId, { includeResolved: true });
    
    // Separate root comments from replies
    const rootComments = comments.filter(c => !c.thread?.parentCommentId);
    
    // Build threaded structure
    return rootComments.map(comment => {
      if (comment.thread) {
        // Sort replies by creation date
        comment.thread.replies.sort((a, b) => 
          a.createdAt.getTime() - b.createdAt.getTime()
        );
      }
      return comment;
    });
  }

  /**
   * Get comment thread by ID
   */
  async getThread(threadId: string): Promise<CommentThread | null> {
    return this.threads.get(threadId) || null;
  }

  /**
   * Search comments by content
   */
  async searchComments(
    documentId: string,
    query: string,
    options: {
      includeResolved?: boolean;
      includeDeleted?: boolean;
      caseSensitive?: boolean;
    } = {}
  ): Promise<Comment[]> {
    const { includeResolved = false, includeDeleted = false, caseSensitive = false } = options;
    
    const comments = await this.getComments(documentId, { includeResolved, includeDeleted });
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    
    return comments.filter(comment => {
      const content = caseSensitive ? comment.content : comment.content.toLowerCase();
      const username = caseSensitive ? comment.username : comment.username.toLowerCase();
      
      return content.includes(searchQuery) || username.includes(searchQuery);
    });
  }

  /**
   * Get comments by user
   */
  async getCommentsByUser(
    documentId: string,
    userId: string,
    includeResolved: boolean = false
  ): Promise<Comment[]> {
    const comments = await this.getComments(documentId, { includeResolved });
    return comments.filter(c => c.userId === userId);
  }

  /**
   * Get comment statistics for a document
   */
  async getCommentStats(documentId: string): Promise<{
    totalComments: number;
    activeComments: number;
    resolvedComments: number;
    deletedComments: number;
    totalThreads: number;
    resolvedThreads: number;
    topCommenters: Array<{ userId: string; username: string; count: number }>;
    averageResolutionTime: number;
  }> {
    const allComments = await this.getComments(documentId, { 
      includeResolved: true, 
      includeDeleted: true 
    });

    const activeComments = allComments.filter(c => c.status === CommentStatus.ACTIVE);
    const resolvedComments = allComments.filter(c => c.status === CommentStatus.RESOLVED);
    const deletedComments = allComments.filter(c => c.status === CommentStatus.DELETED);

    // Count threads
    const threads = new Set(allComments.map(c => c.thread?.id).filter(Boolean));
    const resolvedThreads = Array.from(this.threads.values()).filter(t => t.isResolved);

    // Top commenters
    const commenterCounts = new Map<string, { username: string; count: number }>();
    for (const comment of allComments) {
      if (comment.status !== CommentStatus.DELETED) {
        const existing = commenterCounts.get(comment.userId);
        if (existing) {
          existing.count++;
        } else {
          commenterCounts.set(comment.userId, { username: comment.username, count: 1 });
        }
      }
    }

    const topCommenters = Array.from(commenterCounts.entries())
      .map(([userId, data]) => ({ userId, username: data.username, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Average resolution time
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    
    for (const comment of resolvedComments) {
      if (comment.resolvedAt && comment.createdAt) {
        totalResolutionTime += comment.resolvedAt.getTime() - comment.createdAt.getTime();
        resolvedCount++;
      }
    }

    const averageResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

    return {
      totalComments: allComments.length,
      activeComments: activeComments.length,
      resolvedComments: resolvedComments.length,
      deletedComments: deletedComments.length,
      totalThreads: threads.size,
      resolvedThreads: resolvedThreads.length,
      topCommenters,
      averageResolutionTime
    };
  }

  /**
   * Process @mentions in comment content
   */
  private async processMentions(comment: Comment): Promise<void> {
    const mentionRegex = /@(\w+)/g;
    const mentions = comment.content.match(mentionRegex);
    
    if (mentions) {
      for (const mention of mentions) {
        const username = mention.substring(1); // Remove @
        // In a real implementation, this would look up the user ID by username
        // For now, we'll just store the username
        
        const userId = `user-${username}`; // Mock user ID
        const userMentions = this.userMentions.get(userId) || [];
        if (!userMentions.includes(comment.id)) {
          userMentions.push(comment.id);
          this.userMentions.set(userId, userMentions);
        }
      }
    }
  }

  /**
   * Get comments where a user is mentioned
   */
  async getMentions(userId: string): Promise<string[]> {
    return this.userMentions.get(userId) || [];
  }

  /**
   * Clear all comments for a document
   */
  async clearDocumentComments(documentId: string): Promise<void> {
    this.comments.delete(documentId);
    
    // Clean up threads for this document
    for (const [threadId, thread] of this.threads.entries()) {
      // Check if any comment in the thread belongs to this document
      const documentComments = this.comments.get(documentId) || [];
      const threadBelongsToDocument = documentComments.some(c => c.thread?.id === threadId);
      
      if (threadBelongsToDocument) {
        this.threads.delete(threadId);
      }
    }
  }

  /**
   * Export comments for a document
   */
  async exportComments(documentId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const comments = await this.getComments(documentId, { 
      includeResolved: true, 
      includeDeleted: false 
    });

    if (format === 'json') {
      return JSON.stringify(comments, null, 2);
    } else {
      // CSV format
      const headers = ['ID', 'User', 'Content', 'Position', 'Status', 'Created', 'Resolved'];
      const rows = comments.map(c => [
        c.id,
        c.username,
        c.content.replace(/"/g, '""'), // Escape quotes
        `${c.position.start}-${c.position.end}`,
        c.status,
        c.createdAt.toISOString(),
        c.resolvedAt ? c.resolvedAt.toISOString() : ''
      ]);

      return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }
  }

  /**
   * Get real-time comment activity
   */
  getRecentActivity(documentId: string, since: Date): Comment[] {
    const documentComments = this.comments.get(documentId) || [];
    return documentComments.filter(c => 
      c.createdAt > since || 
      (c.updatedAt > since && c.updatedAt.getTime() !== c.createdAt.getTime())
    ).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}
