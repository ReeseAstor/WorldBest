'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  color: string;
  avatar?: string;
  cursor?: {
    line: number;
    column: number;
    selection?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  };
  isActive: boolean;
  lastSeen: Date;
}

export interface CollaborationEvent {
  type: 'cursor_move' | 'text_change' | 'selection_change' | 'user_join' | 'user_leave' | 'user_typing';
  userId: string;
  data: any;
  timestamp: Date;
}

export interface CollaborationContextType {
  socket: Socket | null;
  isConnected: boolean;
  collaborators: Collaborator[];
  currentUser: Collaborator | null;
  joinRoom: (roomId: string, user: Omit<Collaborator, 'id'>) => void;
  leaveRoom: () => void;
  sendCursorMove: (cursor: Collaborator['cursor']) => void;
  sendTextChange: (change: { from: number; to: number; text: string }) => void;
  sendSelectionChange: (selection: Collaborator['cursor']['selection']) => void;
  sendTyping: (isTyping: boolean) => void;
  onEvent: (eventType: string, callback: (data: any) => void) => void;
  offEvent: (eventType: string, callback: (data: any) => void) => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export interface CollaborationProviderProps {
  children: React.ReactNode;
  serverUrl?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userColor?: string;
  userAvatar?: string;
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({
  children,
  serverUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  userId,
  userName,
  userEmail,
  userColor = '#3B82F6',
  userAvatar,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [currentUser, setCurrentUser] = useState<Collaborator | null>(null);
  const [eventListeners, setEventListeners] = useState<Map<string, Set<Function>>>(new Map());

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(serverUrl, {
      auth: {
        userId,
        userName,
        userEmail,
        userColor,
        userAvatar,
      },
    });

    newSocket.on('connect', () => {
      console.log('Connected to collaboration server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      setIsConnected(false);
    });

    newSocket.on('user_joined', (user: Collaborator) => {
      setCollaborators(prev => {
        const existing = prev.find(c => c.id === user.id);
        if (existing) {
          return prev.map(c => c.id === user.id ? { ...c, ...user, isActive: true } : c);
        }
        return [...prev, { ...user, isActive: true }];
      });
    });

    newSocket.on('user_left', (userId: string) => {
      setCollaborators(prev => 
        prev.map(c => c.id === userId ? { ...c, isActive: false, lastSeen: new Date() } : c)
      );
    });

    newSocket.on('collaborators_update', (users: Collaborator[]) => {
      setCollaborators(users);
    });

    newSocket.on('cursor_move', (data: { userId: string; cursor: Collaborator['cursor'] }) => {
      setCollaborators(prev => 
        prev.map(c => c.id === data.userId ? { ...c, cursor: data.cursor } : c)
      );
    });

    newSocket.on('text_change', (data: { userId: string; change: any }) => {
      // Handle text changes - this would typically be handled by the editor
      console.log('Text change from', data.userId, data.change);
    });

    newSocket.on('selection_change', (data: { userId: string; selection: any }) => {
      setCollaborators(prev => 
        prev.map(c => c.id === data.userId ? { 
          ...c, 
          cursor: { ...c.cursor, selection: data.selection } 
        } : c)
      );
    });

    newSocket.on('user_typing', (data: { userId: string; isTyping: boolean }) => {
      setCollaborators(prev => 
        prev.map(c => c.id === data.userId ? { ...c, isTyping: data.isTyping } : c)
      );
    });

    // Generic event listener
    newSocket.onAny((eventType: string, data: any) => {
      const listeners = eventListeners.get(eventType);
      if (listeners) {
        listeners.forEach(callback => callback(data));
      }
    });

    setSocket(newSocket);
    setCurrentUser({
      id: userId,
      name: userName,
      email: userEmail,
      color: userColor,
      avatar: userAvatar,
      isActive: true,
      lastSeen: new Date(),
    });

    return () => {
      newSocket.close();
    };
  }, [serverUrl, userId, userName, userEmail, userColor, userAvatar, eventListeners]);

  const joinRoom = useCallback((roomId: string, user: Omit<Collaborator, 'id'>) => {
    if (socket) {
      socket.emit('join_room', { roomId, user: { ...user, id: userId } });
    }
  }, [socket, userId]);

  const leaveRoom = useCallback(() => {
    if (socket) {
      socket.emit('leave_room');
    }
  }, [socket]);

  const sendCursorMove = useCallback((cursor: Collaborator['cursor']) => {
    if (socket) {
      socket.emit('cursor_move', { cursor });
    }
  }, [socket]);

  const sendTextChange = useCallback((change: { from: number; to: number; text: string }) => {
    if (socket) {
      socket.emit('text_change', { change });
    }
  }, [socket]);

  const sendSelectionChange = useCallback((selection: Collaborator['cursor']['selection']) => {
    if (socket) {
      socket.emit('selection_change', { selection });
    }
  }, [socket]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (socket) {
      socket.emit('user_typing', { isTyping });
    }
  }, [socket]);

  const onEvent = useCallback((eventType: string, callback: (data: any) => void) => {
    setEventListeners(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(eventType)) {
        newMap.set(eventType, new Set());
      }
      newMap.get(eventType)!.add(callback);
      return newMap;
    });
  }, []);

  const offEvent = useCallback((eventType: string, callback: (data: any) => void) => {
    setEventListeners(prev => {
      const newMap = new Map(prev);
      const listeners = newMap.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          newMap.delete(eventType);
        }
      }
      return newMap;
    });
  }, []);

  const value: CollaborationContextType = {
    socket,
    isConnected,
    collaborators,
    currentUser,
    joinRoom,
    leaveRoom,
    sendCursorMove,
    sendTextChange,
    sendSelectionChange,
    sendTyping,
    onEvent,
    offEvent,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

export const useCollaboration = (): CollaborationContextType => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};