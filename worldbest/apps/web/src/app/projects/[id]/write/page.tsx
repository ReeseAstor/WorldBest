'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@worldbest/ui-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@worldbest/ui-components';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Save,
  Sparkles,
  Clock,
  Target,
  Eye,
  EyeOff,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Download,
  Upload,
  Users,
  MessageSquare,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Plus,
  MoreVertical,
  Wand2,
  Edit3,
  UserCheck,
  Zap,
  FileText,
  History
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

interface Scene {
  id: string;
  chapterId: string;
  title: string;
  content: string;
  wordCount: number;
  lastSaved: Date;
  version: number;
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  scenes: Scene[];
  wordCount: number;
  targetWordCount: number;
}

interface AIPersona {
  id: 'muse' | 'editor' | 'coach';
  name: string;
  icon: typeof Wand2;
  description: string;
  color: string;
}

const aiPersonas: AIPersona[] = [
  {
    id: 'muse',
    name: 'Muse',
    icon: Wand2,
    description: 'Creative inspiration and ideas',
    color: 'text-purple-600'
  },
  {
    id: 'editor',
    name: 'Editor',
    icon: Edit3,
    description: 'Grammar and style improvements',
    color: 'text-blue-600'
  },
  {
    id: 'coach',
    name: 'Coach',
    icon: UserCheck,
    description: 'Story structure and pacing',
    color: 'text-green-600'
  }
];

export default function WritePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<AIPersona>(aiPersonas[0]);
  const [wordCount, setWordCount] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  const [currentChapter, setCurrentChapter] = useState<Chapter>({
    id: '1',
    number: 1,
    title: 'The Beginning',
    scenes: [
      {
        id: '1',
        chapterId: '1',
        title: 'Opening Scene',
        content: `<h2>Chapter 1: The Beginning</h2>
<p>The morning mist clung to the ancient stones of the castle, wrapping the fortress in a shroud of mystery that seemed almost alive. Elena stood at the highest tower's window, her silver hair catching the first rays of dawn as they pierced through the fog.</p>
<p>She could feel it again—that strange pull in her chest, as if something deep within the earth itself was calling to her. The sensation had grown stronger each day since her twenty-eighth birthday, and with it came dreams of dragons and prophecies she couldn't quite remember upon waking.</p>
<p>"My lady," came a voice from behind her. Marcus stood in the doorway, his armor gleaming despite the dim light. "The council awaits."</p>
<p>Elena turned, noting how his hand rested casually on his sword hilt—a habit born from years of vigilance. "Tell them I'll be there shortly," she replied, her voice carrying an authority she still wasn't comfortable wielding.</p>`,
        wordCount: 156,
        lastSaved: new Date(),
        version: 3
      }
    ],
    wordCount: 156,
    targetWordCount: 3000
  });

  const [content, setContent] = useState(currentChapter.scenes[0]?.content || '');

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled) return;
    
    const saveTimer = setTimeout(() => {
      handleSave(true);
    }, 5000); // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(saveTimer);
  }, [content, autoSaveEnabled]);

  // Word count calculation
  useEffect(() => {
    const text = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [content]);

  const handleSave = async (isAutoSave = false) => {
    setSaving(true);
    // TODO: Implement actual save to API
    setTimeout(() => {
      setSaving(false);
      if (!isAutoSave) {
        // Show success toast
      }
    }, 1000);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setSelectedText(selection.toString());
    } else {
      setSelectedText('');
    }
  };

  const generateWithAI = async () => {
    // TODO: Implement AI generation
    console.log('Generating with', selectedPersona.name, 'for:', selectedText || 'continuation');
  };

  const Toolbar = () => (
    <div className="flex items-center gap-1 p-2 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('undo')}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('redo')}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('formatBlock', '<h1>')}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('formatBlock', '<h2>')}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('underline')}
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('insertUnorderedList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('insertOrderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('formatBlock', '<blockquote>')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('justifyLeft')}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('justifyCenter')}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => execCommand('justifyRight')}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowVersionHistory(!showVersionHistory)}
        >
          <History className="h-4 w-4 mr-2" />
          Version {currentChapter.scenes[0]?.version || 1}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAIPanel(!showAIPanel)}
          className="text-purple-600"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          AI Assist
        </Button>

        <Button
          size="sm"
          onClick={() => handleSave(false)}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">The Dragon's Legacy</h1>
            <p className="text-sm text-muted-foreground">
              Chapter {currentChapter.number}: {currentChapter.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>{wordCount} / {currentChapter.targetWordCount} words</span>
            <div className="w-24 bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min((wordCount / currentChapter.targetWordCount) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Chapter Navigation */}
        {showSidebar && (
          <div className="w-64 border-r bg-muted/30 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Chapters</h3>
                <Button size="sm" variant="ghost">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Card className="cursor-pointer hover:bg-accent">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Chapter 1</p>
                        <p className="text-xs text-muted-foreground">The Beginning</p>
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>1 scene</span>
                        <span>•</span>
                        <span>156 words</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-accent opacity-60">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Chapter 2</p>
                        <p className="text-xs text-muted-foreground">The Journey</p>
                      </div>
                      <Plus className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2 text-sm">Current Scene</h4>
                <div className="space-y-2">
                  <Input
                    value={currentChapter.scenes[0]?.title || ''}
                    onChange={(e) => {
                      // Update scene title
                    }}
                    placeholder="Scene title"
                    className="text-sm"
                  />
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Last saved {new Date().toLocaleTimeString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autosave"
                      checked={autoSaveEnabled}
                      onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="autosave" className="text-sm">Auto-save</label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2 text-sm">Quick Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Words</span>
                    <span>{wordCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Characters</span>
                    <span>{content.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paragraphs</span>
                    <span>{content.split('</p>').length - 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reading time</span>
                    <span>~{Math.ceil(wordCount / 200)} min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Toolbar />
          
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <div
                ref={editorRef}
                contentEditable
                className="prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px]"
                dangerouslySetInnerHTML={{ __html: content }}
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                onMouseUp={handleTextSelection}
                onKeyUp={handleTextSelection}
                style={{
                  fontFamily: 'Georgia, serif',
                  lineHeight: '1.8',
                }}
              />
            </div>
          </div>
        </div>

        {/* AI Assistant Panel */}
        {showAIPanel && (
          <div className="w-80 border-l bg-muted/30 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">AI Assistant</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAIPanel(false)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Persona Selection */}
              <div className="space-y-2">
                <Label>Select Persona</Label>
                <div className="space-y-2">
                  {aiPersonas.map(persona => (
                    <button
                      key={persona.id}
                      onClick={() => setSelectedPersona(persona)}
                      className={`w-full p-3 border rounded-lg text-left transition-all ${
                        selectedPersona.id === persona.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <persona.icon className={`h-5 w-5 ${persona.color}`} />
                        <div>
                          <p className="font-medium">{persona.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {persona.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Actions */}
              <div className="space-y-2">
                <Label>Quick Actions</Label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={generateWithAI}
                    disabled={!selectedText && wordCount === 0}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {selectedText ? 'Improve Selection' : 'Continue Writing'}
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Generate Dialogue
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Eye className="h-4 w-4 mr-2" />
                    Describe Scene
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Character Voice Check
                  </Button>
                </div>
              </div>

              {/* Custom Prompt */}
              <div className="space-y-2">
                <Label>Custom Request</Label>
                <textarea
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="Ask the AI for specific help..."
                />
                <Button className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>

              {/* Recent Suggestions */}
              <div className="space-y-2">
                <Label>Recent Suggestions</Label>
                <div className="space-y-2">
                  <Card className="cursor-pointer hover:bg-accent">
                    <CardContent className="p-3">
                      <p className="text-sm line-clamp-3">
                        "Consider adding more sensory details to enhance the atmosphere..."
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Coach • 2 min ago
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}