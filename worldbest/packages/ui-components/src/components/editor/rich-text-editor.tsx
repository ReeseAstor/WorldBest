'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Save,
  Wand2,
  Users,
  Eye,
  EyeOff,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  showToolbar?: boolean;
  showWordCount?: boolean;
  showCollaborators?: boolean;
  collaborators?: Array<{
    id: string;
    name: string;
    color: string;
    cursor?: { line: number; column: number };
  }>;
  onAIGenerate?: (prompt: string, context?: any) => Promise<string>;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  onSave,
  placeholder = 'Start writing...',
  readOnly = false,
  showToolbar = true,
  showWordCount = true,
  showCollaborators = false,
  collaborators = [],
  onAIGenerate,
  className,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Update word and character count
  useEffect(() => {
    const text = editorRef.current?.innerText || '';
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const chars = text.length;
    
    setWordCount(words);
    setCharCount(chars);
  }, [content]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onChange(newContent);
      
      // Add to history
      if (newContent !== history[historyIndex]) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newContent);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }
  }, [onChange, history, historyIndex]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline');
          break;
        case 's':
          e.preventDefault();
          onSave?.();
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          break;
        case 'y':
          e.preventDefault();
          redo();
          break;
        case 'k':
          e.preventDefault();
          const url = prompt('Enter URL:');
          if (url) {
            document.execCommand('createLink', false, url);
          }
          break;
      }
    }
  }, [onSave]);

  // Undo/Redo functionality
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (editorRef.current) {
        editorRef.current.innerHTML = history[newIndex];
        onChange(history[newIndex]);
      }
    }
  }, [history, historyIndex, onChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      if (editorRef.current) {
        editorRef.current.innerHTML = history[newIndex];
        onChange(history[newIndex]);
      }
    }
  }, [history, historyIndex, onChange]);

  // Formatting functions
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  // AI generation
  const handleAIGenerate = useCallback(async () => {
    if (!onAIGenerate || !aiPrompt.trim()) return;

    setIsAIGenerating(true);
    try {
      const generated = await onAIGenerate(aiPrompt, {
        currentContent: content,
        wordCount,
        charCount,
      });
      
      if (editorRef.current) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(generated));
        } else {
          editorRef.current.innerHTML += generated;
        }
        handleInput();
      }
      
      setAiPrompt('');
      setShowAIPanel(false);
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsAIGenerating(false);
    }
  }, [onAIGenerate, aiPrompt, content, wordCount, charCount, handleInput]);

  // Toolbar component
  const Toolbar = () => (
    <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('underline')}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('strikeThrough')}
          className="h-8 w-8 p-0"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertUnorderedList')}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertOrderedList')}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('formatBlock', 'blockquote')}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('formatBlock', 'pre')}
          className="h-8 w-8 p-0"
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('justifyLeft')}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('justifyCenter')}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('justifyRight')}
          className="h-8 w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => execCommand('justifyFull')}
          className="h-8 w-8 p-0"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={historyIndex <= 0}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1" />

      {onAIGenerate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAIPanel(!showAIPanel)}
          className="h-8 px-3"
        >
          <Wand2 className="h-4 w-4 mr-1" />
          AI
        </Button>
      )}

      {onSave && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          className="h-8 px-3"
        >
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
      )}
    </div>
  );

  // AI Panel component
  const AIPanel = () => (
    <div className="p-3 border-b bg-blue-50">
      <div className="flex gap-2">
        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Describe what you want to generate..."
          className="flex-1 px-3 py-2 border rounded-md text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAIGenerate();
            }
          }}
        />
        <Button
          onClick={handleAIGenerate}
          disabled={!aiPrompt.trim() || isAIGenerating}
          size="sm"
        >
          {isAIGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </div>
    </div>
  );

  // Collaborators component
  const Collaborators = () => (
    <div className="flex items-center gap-2 p-2 border-b bg-green-50">
      <Users className="h-4 w-4 text-green-600" />
      <span className="text-sm text-green-700">Collaborators:</span>
      <div className="flex gap-1">
        {collaborators.map((collaborator) => (
          <Badge
            key={collaborator.id}
            variant="secondary"
            className="text-xs"
            style={{ backgroundColor: collaborator.color }}
          >
            {collaborator.name}
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <Card className={cn('overflow-hidden', className)}>
      {showToolbar && <Toolbar />}
      {showAIPanel && onAIGenerate && <AIPanel />}
      {showCollaborators && collaborators.length > 0 && <Collaborators />}
      
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            'min-h-[400px] p-4 focus:outline-none',
            readOnly && 'bg-gray-50 cursor-default',
            isFocused && 'ring-2 ring-blue-500 ring-opacity-50'
          )}
          style={{ minHeight: '400px' }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
        
        {!content && (
          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>

      {showWordCount && (
        <div className="flex items-center justify-between p-2 border-t bg-gray-50 text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
          </div>
          <div className="flex items-center gap-2">
            {historyIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                className="h-6 px-2 text-xs"
              >
                Undo
              </Button>
            )}
            {historyIndex < history.length - 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                className="h-6 px-2 text-xs"
              >
                Redo
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};