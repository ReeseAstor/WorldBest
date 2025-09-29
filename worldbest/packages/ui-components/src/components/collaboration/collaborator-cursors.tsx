'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useCollaboration } from './collaboration-provider';
import { cn } from '../../lib/utils';

export interface CollaboratorCursorsProps {
  editorRef: React.RefObject<HTMLElement>;
  className?: string;
}

export const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = ({
  editorRef,
  className,
}) => {
  const { collaborators, currentUser } = useCollaboration();
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number; element: HTMLElement }>>(new Map());
  const cursorRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Update cursor positions when collaborators move their cursors
  useEffect(() => {
    const updateCursors = () => {
      if (!editorRef.current) return;

      const newCursors = new Map<string, { x: number; y: number; element: HTMLElement }>();

      collaborators.forEach(collaborator => {
        if (collaborator.id === currentUser?.id || !collaborator.cursor || !collaborator.isActive) {
          return;
        }

        // Convert cursor position to screen coordinates
        const position = getCursorPosition(editorRef.current!, collaborator.cursor);
        if (position) {
          newCursors.set(collaborator.id, position);
        }
      });

      setCursors(newCursors);
    };

    updateCursors();

    // Update cursors on scroll and resize
    const handleUpdate = () => {
      requestAnimationFrame(updateCursors);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [collaborators, currentUser, editorRef]);

  // Get cursor position from line/column to screen coordinates
  const getCursorPosition = (editor: HTMLElement, cursor: { line: number; column: number }) => {
    try {
      // This is a simplified implementation
      // In a real implementation, you'd need to map line/column to actual DOM positions
      const lineHeight = 20; // Approximate line height
      const charWidth = 8; // Approximate character width
      
      const x = cursor.column * charWidth;
      const y = cursor.line * lineHeight;

      return {
        x: x + editor.offsetLeft,
        y: y + editor.offsetTop,
        element: editor,
      };
    } catch (error) {
      console.error('Error calculating cursor position:', error);
      return null;
    }
  };

  return (
    <div className={cn('pointer-events-none absolute inset-0', className)}>
      {Array.from(cursors.entries()).map(([userId, position]) => {
        const collaborator = collaborators.find(c => c.id === userId);
        if (!collaborator) return null;

        return (
          <div
            key={userId}
            ref={el => {
              if (el) {
                cursorRefs.current.set(userId, el);
              }
            }}
            className="absolute transition-all duration-100 ease-out"
            style={{
              left: position.x,
              top: position.y,
              transform: 'translateY(-100%)',
            }}
          >
            {/* Cursor line */}
            <div
              className="w-0.5 h-5"
              style={{ backgroundColor: collaborator.color }}
            />
            
            {/* Cursor label */}
            <div
              className="absolute top-0 left-1 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};