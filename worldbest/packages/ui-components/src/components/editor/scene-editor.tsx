'use client';

import React, { useState, useCallback } from 'react';
import { RichTextEditor } from './rich-text-editor';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Textarea
} from '../ui/textarea';
import { 
  Save, 
  Eye, 
  EyeOff, 
  Wand2, 
  Users, 
  MapPin, 
  User, 
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Scene {
  id: string;
  title: string;
  content: string;
  locationId?: string;
  povCharacterId?: string;
  time?: string;
  mood?: string;
  conflict?: string;
  resolution?: string;
  status: 'draft' | 'outlined' | 'written' | 'revised' | 'final';
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  color: string;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
}

export interface SceneEditorProps {
  scene: Scene;
  characters: Character[];
  locations: Location[];
  collaborators?: Array<{
    id: string;
    name: string;
    color: string;
    cursor?: { line: number; column: number };
  }>;
  onSave: (scene: Partial<Scene>) => void;
  onAIGenerate?: (prompt: string, context?: any) => Promise<string>;
  onLocationSelect?: (locationId: string) => void;
  onCharacterSelect?: (characterId: string) => void;
  className?: string;
}

export const SceneEditor: React.FC<SceneEditorProps> = ({
  scene,
  characters,
  locations,
  collaborators = [],
  onSave,
  onAIGenerate,
  onLocationSelect,
  onCharacterSelect,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedScene, setEditedScene] = useState<Partial<Scene>>(scene);
  const [showMetadata, setShowMetadata] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const handleSave = useCallback(() => {
    onSave(editedScene);
    setIsEditing(false);
  }, [editedScene, onSave]);

  const handleAIGenerate = useCallback(async (prompt: string, context?: any) => {
    if (!onAIGenerate) return '';
    
    try {
      const generated = await onAIGenerate(prompt, {
        ...context,
        scene: editedScene,
        characters,
        locations,
      });
      return generated;
    } catch (error) {
      console.error('AI generation failed:', error);
      return '';
    }
  }, [onAIGenerate, editedScene, characters, locations]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'outlined': return 'bg-blue-100 text-blue-800';
      case 'written': return 'bg-yellow-100 text-yellow-800';
      case 'revised': return 'bg-orange-100 text-orange-800';
      case 'final': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <AlertCircle className="h-3 w-3" />;
      case 'outlined': return <Lightbulb className="h-3 w-3" />;
      case 'written': return <Target className="h-3 w-3" />;
      case 'revised': return <CheckCircle className="h-3 w-3" />;
      case 'final': return <CheckCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Scene Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Input
              value={editedScene.title || ''}
              onChange={(e) => setEditedScene(prev => ({ ...prev, title: e.target.value }))}
              className="text-lg font-semibold border-none p-0 h-auto"
              placeholder="Scene title..."
            />
            <Badge className={cn('flex items-center gap-1', getStatusColor(editedScene.status || 'draft'))}>
              {getStatusIcon(editedScene.status || 'draft')}
              {editedScene.status || 'draft'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
            >
              {showMetadata ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
            {isEditing && (
              <Button
                size="sm"
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            )}
          </div>
        </div>

        {/* Scene Metadata */}
        {showMetadata && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Location</Label>
              <Select
                value={editedScene.locationId || ''}
                onValueChange={(value) => {
                  setEditedScene(prev => ({ ...prev, locationId: value }));
                  onLocationSelect?.(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {location.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">POV Character</Label>
              <Select
                value={editedScene.povCharacterId || ''}
                onValueChange={(value) => {
                  setEditedScene(prev => ({ ...prev, povCharacterId: value }));
                  onCharacterSelect?.(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select character" />
                </SelectTrigger>
                <SelectContent>
                  {characters.map((character) => (
                    <SelectItem key={character.id} value={character.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {character.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Time</Label>
              <Input
                value={editedScene.time || ''}
                onChange={(e) => setEditedScene(prev => ({ ...prev, time: e.target.value }))}
                placeholder="e.g., Morning, Afternoon, Evening"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Mood</Label>
              <Input
                value={editedScene.mood || ''}
                onChange={(e) => setEditedScene(prev => ({ ...prev, mood: e.target.value }))}
                placeholder="e.g., Tense, Romantic, Mysterious"
              />
            </div>
          </div>
        )}

        {/* Scene Structure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-600">Conflict</Label>
            <Textarea
              value={editedScene.conflict || ''}
              onChange={(e) => setEditedScene(prev => ({ ...prev, conflict: e.target.value }))}
              placeholder="What is the main conflict or tension in this scene?"
              className="min-h-[80px]"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Resolution</Label>
            <Textarea
              value={editedScene.resolution || ''}
              onChange={(e) => setEditedScene(prev => ({ ...prev, resolution: e.target.value }))}
              placeholder="How does this scene resolve or move the story forward?"
              className="min-h-[80px]"
            />
          </div>
        </div>
      </Card>

      {/* Scene Content Editor */}
      <RichTextEditor
        content={editedScene.content || ''}
        onChange={(content) => setEditedScene(prev => ({ ...prev, content }))}
        onSave={handleSave}
        placeholder="Write your scene here..."
        readOnly={!isEditing}
        showToolbar={isEditing}
        showWordCount={true}
        showCollaborators={collaborators.length > 0}
        collaborators={collaborators}
        onAIGenerate={onAIGenerate ? handleAIGenerate : undefined}
        className="min-h-[500px]"
      />

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">AI Suggestions</h3>
          <div className="space-y-2">
            {aiSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-2 bg-blue-50 rounded-md text-sm cursor-pointer hover:bg-blue-100"
                onClick={() => {
                  setEditedScene(prev => ({
                    ...prev,
                    content: (prev.content || '') + '\n\n' + suggestion
                  }));
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};