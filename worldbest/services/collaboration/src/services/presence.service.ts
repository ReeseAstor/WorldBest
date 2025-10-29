import { 
  UserPresence, 
  CursorPosition, 
  TextSelection, 
  PresenceUpdate,
  Collaborator 
} from '../types/collaboration.types.js';
import { EventEmitter } from 'events';

export interface PresenceEvents {
  'presence-updated': (presence: UserPresence) => void;
  'cursor-moved': (userId: string, cursor: CursorPosition) => void;
  'selection-changed': (userId: string, selection: TextSelection) => void;
  'typing-started': (userId: string) => void;
  'typing-stopped': (userId: string) => void;
  'user-joined': (userId: string, presence: UserPresence) => void;
  'user-left': (userId: string) => void;
}

export class PresenceService extends EventEmitter {
  private activePresence: Map<string, UserPresence> = new Map(); // documentId:userId -> UserPresence
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private cursorColors: Map<string, string> = new Map();
  private readonly TYPING_TIMEOUT = 3000; // 3 seconds
  private readonly PRESENCE_TTL = 30000; // 30 seconds

  constructor() {
    super();
    this.startPresenceCleanup();
  }

  /**
   * Update user presence in a document
   */
  updatePresence(
    documentId: string,
    userId: string,
    username: string,
    update: Partial<PresenceUpdate>
  ): UserPresence {
    const presenceKey = `${documentId}:${userId}`;
    const existing = this.activePresence.get(presenceKey);

    const presence: UserPresence = {
      userId,
      username,
      documentId,
      cursor: update.cursor || existing?.cursor,
      selection: update.selection || existing?.selection,
      isTyping: update.isTyping ?? existing?.isTyping ?? false,
      lastSeen: new Date(),
      color: existing?.color || this.getUserColor(userId),
      metadata: {
        ...existing?.metadata,
        ...update
      }
    };

    // Store updated presence
    this.activePresence.set(presenceKey, presence);

    // Handle cursor movement
    if (update.cursor && this.cursorChanged(existing?.cursor, update.cursor)) {
      this.emit('cursor-moved', userId, update.cursor);
    }

    // Handle selection changes
    if (update.selection && this.selectionChanged(existing?.selection, update.selection)) {
      this.emit('selection-changed', userId, update.selection);
    }

    // Handle typing status
    if (update.isTyping !== undefined) {
      this.handleTypingStatus(userId, update.isTyping);
    }

    this.emit('presence-updated', presence);
    return presence;
  }

  /**
   * Get all active users in a document
   */
  getActiveUsers(documentId: string): UserPresence[] {
    const activeUsers: UserPresence[] = [];
    const cutoffTime = new Date(Date.now() - this.PRESENCE_TTL);

    for (const [key, presence] of this.activePresence.entries()) {
      if (key.startsWith(`${documentId}:`) && presence.lastSeen > cutoffTime) {
        activeUsers.push(presence);
      }
    }

    return activeUsers.sort((a, b) => a.username.localeCompare(b.username));
  }

  /**
   * Get specific user's presence in a document
   */
  getUserPresence(documentId: string, userId: string): UserPresence | null {
    const presenceKey = `${documentId}:${userId}`;
    const presence = this.activePresence.get(presenceKey);
    
    if (!presence) return null;

    // Check if presence is still valid
    const cutoffTime = new Date(Date.now() - this.PRESENCE_TTL);
    if (presence.lastSeen < cutoffTime) {
      this.activePresence.delete(presenceKey);
      return null;
    }

    return presence;
  }

  /**
   * Remove user from document presence
   */
  removeUserPresence(documentId: string, userId: string): boolean {
    const presenceKey = `${documentId}:${userId}`;
    const existed = this.activePresence.has(presenceKey);
    
    if (existed) {
      this.activePresence.delete(presenceKey);
      
      // Clear typing timeout if exists
      const typingKey = `${documentId}:${userId}`;
      const timeout = this.typingTimeouts.get(typingKey);
      if (timeout) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(typingKey);
      }

      this.emit('user-left', userId);
    }

    return existed;
  }

  /**
   * Get cursor positions for all users in a document
   */
  getCursorPositions(documentId: string): Array<{ userId: string; username: string; cursor: CursorPosition; color: string }> {
    const cursors: Array<{ userId: string; username: string; cursor: CursorPosition; color: string }> = [];
    
    for (const presence of this.getActiveUsers(documentId)) {
      if (presence.cursor) {
        cursors.push({
          userId: presence.userId,
          username: presence.username,
          cursor: presence.cursor,
          color: presence.color
        });
      }
    }

    return cursors;
  }

  /**
   * Get text selections for all users in a document
   */
  getSelections(documentId: string): Array<{ userId: string; username: string; selection: TextSelection; color: string }> {
    const selections: Array<{ userId: string; username: string; selection: TextSelection; color: string }> = [];
    
    for (const presence of this.getActiveUsers(documentId)) {
      if (presence.selection) {
        selections.push({
          userId: presence.userId,
          username: presence.username,
          selection: presence.selection,
          color: presence.color
        });
      }
    }

    return selections;
  }

  /**
   * Get users currently typing in a document
   */
  getTypingUsers(documentId: string): Array<{ userId: string; username: string; color: string }> {
    const typingUsers: Array<{ userId: string; username: string; color: string }> = [];
    
    for (const presence of this.getActiveUsers(documentId)) {
      if (presence.isTyping) {
        typingUsers.push({
          userId: presence.userId,
          username: presence.username,
          color: presence.color
        });
      }
    }

    return typingUsers;
  }

  /**
   * Set user as typing with auto-timeout
   */
  setTyping(documentId: string, userId: string, username: string): void {
    // Update presence to show typing
    this.updatePresence(documentId, userId, username, { isTyping: true });

    // Set or reset the typing timeout
    const typingKey = `${documentId}:${userId}`;
    const existingTimeout = this.typingTimeouts.get(typingKey);
    
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      this.setNotTyping(documentId, userId, username);
      this.typingTimeouts.delete(typingKey);
    }, this.TYPING_TIMEOUT);

    this.typingTimeouts.set(typingKey, timeout);
  }

  /**
   * Set user as not typing
   */
  setNotTyping(documentId: string, userId: string, username: string): void {
    const typingKey = `${documentId}:${userId}`;
    const timeout = this.typingTimeouts.get(typingKey);
    
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(typingKey);
    }

    this.updatePresence(documentId, userId, username, { isTyping: false });
  }

  /**
   * Handle user joining a document
   */
  userJoined(documentId: string, userId: string, username: string, collaborator?: Collaborator): UserPresence {
    const presence = this.updatePresence(documentId, userId, username, {
      cursor: undefined,
      selection: undefined,
      isTyping: false
    });

    this.emit('user-joined', userId, presence);
    return presence;
  }

  /**
   * Handle user leaving a document
   */
  userLeft(documentId: string, userId: string): void {
    this.removeUserPresence(documentId, userId);
  }

  /**
   * Get presence statistics for a document
   */
  getPresenceStats(documentId: string): {
    totalActiveUsers: number;
    usersWithCursors: number;
    usersWithSelections: number;
    typingUsers: number;
    averagePresenceAge: number;
  } {
    const activeUsers = this.getActiveUsers(documentId);
    const now = Date.now();
    
    let totalPresenceAge = 0;
    let usersWithCursors = 0;
    let usersWithSelections = 0;
    let typingUsers = 0;

    for (const presence of activeUsers) {
      totalPresenceAge += now - presence.lastSeen.getTime();
      
      if (presence.cursor) usersWithCursors++;
      if (presence.selection) usersWithSelections++;
      if (presence.isTyping) typingUsers++;
    }

    return {
      totalActiveUsers: activeUsers.length,
      usersWithCursors,
      usersWithSelections,
      typingUsers,
      averagePresenceAge: activeUsers.length > 0 ? totalPresenceAge / activeUsers.length : 0
    };
  }

  /**
   * Get a unique color for a user
   */
  private getUserColor(userId: string): string {
    let color = this.cursorColors.get(userId);
    
    if (!color) {
      color = this.generateUserColor(userId);
      this.cursorColors.set(userId, color);
    }

    return color;
  }

  /**
   * Generate a consistent color for a user based on their ID
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#AED6F1', '#F1948A', '#D2B4DE',
      '#A9DFBF', '#F9E79F', '#D5A6BD', '#A3E4D7', '#D6EAF8'
    ];

    // Create a hash from the user ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use the hash to select a color
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  /**
   * Check if cursor position has changed significantly
   */
  private cursorChanged(oldCursor?: CursorPosition, newCursor?: CursorPosition): boolean {
    if (!oldCursor && newCursor) return true;
    if (oldCursor && !newCursor) return true;
    if (!oldCursor && !newCursor) return false;

    return oldCursor!.line !== newCursor!.line || oldCursor!.column !== newCursor!.column;
  }

  /**
   * Check if text selection has changed
   */
  private selectionChanged(oldSelection?: TextSelection, newSelection?: TextSelection): boolean {
    if (!oldSelection && newSelection) return true;
    if (oldSelection && !newSelection) return true;
    if (!oldSelection && !newSelection) return false;

    const oldStart = oldSelection!.start;
    const oldEnd = oldSelection!.end;
    const newStart = newSelection!.start;
    const newEnd = newSelection!.end;

    return (
      oldStart.line !== newStart.line ||
      oldStart.column !== newStart.column ||
      oldEnd.line !== newEnd.line ||
      oldEnd.column !== newEnd.column
    );
  }

  /**
   * Handle typing status changes
   */
  private handleTypingStatus(userId: string, isTyping: boolean): void {
    if (isTyping) {
      this.emit('typing-started', userId);
    } else {
      this.emit('typing-stopped', userId);
    }
  }

  /**
   * Start presence cleanup timer
   */
  private startPresenceCleanup(): void {
    setInterval(() => {
      this.cleanupStalePresence();
    }, 10000); // Clean up every 10 seconds
  }

  /**
   * Remove stale presence data
   */
  private cleanupStalePresence(): void {
    const cutoffTime = new Date(Date.now() - this.PRESENCE_TTL);
    const toRemove: string[] = [];

    for (const [key, presence] of this.activePresence.entries()) {
      if (presence.lastSeen < cutoffTime) {
        toRemove.push(key);
      }
    }

    for (const key of toRemove) {
      const presence = this.activePresence.get(key);
      this.activePresence.delete(key);
      
      if (presence) {
        this.emit('user-left', presence.userId);
      }
    }

    // Clean up typing timeouts
    for (const [key, timeout] of this.typingTimeouts.entries()) {
      const [documentId, userId] = key.split(':');
      const presenceKey = `${documentId}:${userId}`;
      
      if (!this.activePresence.has(presenceKey)) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }
    }
  }

  /**
   * Clear all presence data for a document
   */
  clearDocumentPresence(documentId: string): void {
    const toRemove: string[] = [];

    for (const [key] of this.activePresence.entries()) {
      if (key.startsWith(`${documentId}:`)) {
        toRemove.push(key);
      }
    }

    for (const key of toRemove) {
      this.activePresence.delete(key);
    }

    // Clear typing timeouts for the document
    for (const [key, timeout] of this.typingTimeouts.entries()) {
      if (key.startsWith(`${documentId}:`)) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }
    }
  }

  /**
   * Get all presence data (for debugging/monitoring)
   */
  getAllPresence(): Map<string, UserPresence> {
    return new Map(this.activePresence);
  }

  /**
   * Calculate cursor distance between two positions
   */
  calculateCursorDistance(pos1: CursorPosition, pos2: CursorPosition): number {
    const lineDiff = Math.abs(pos1.line - pos2.line);
    const colDiff = Math.abs(pos1.column - pos2.column);
    
    // Weight line differences more heavily than column differences
    return lineDiff * 100 + colDiff;
  }

  /**
   * Find users with cursors near a given position
   */
  findNearbyUsers(
    documentId: string, 
    position: CursorPosition, 
    maxDistance: number = 500
  ): Array<{ userId: string; username: string; distance: number; color: string }> {
    const nearbyUsers: Array<{ userId: string; username: string; distance: number; color: string }> = [];
    
    for (const presence of this.getActiveUsers(documentId)) {
      if (presence.cursor) {
        const distance = this.calculateCursorDistance(position, presence.cursor);
        
        if (distance <= maxDistance) {
          nearbyUsers.push({
            userId: presence.userId,
            username: presence.username,
            distance,
            color: presence.color
          });
        }
      }
    }

    return nearbyUsers.sort((a, b) => a.distance - b.distance);
  }
}