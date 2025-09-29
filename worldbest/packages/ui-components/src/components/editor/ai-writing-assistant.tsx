'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
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
  Wand2, 
  Lightbulb, 
  Edit3, 
  BookOpen, 
  Users, 
  MapPin,
  Clock,
  Target,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AIWritingAssistantProps {
  onGenerate: (prompt: string, options: AIGenerationOptions) => Promise<string>;
  context?: {
    project?: any;
    scene?: any;
    characters?: any[];
    locations?: any[];
  };
  className?: string;
}

export interface AIGenerationOptions {
  persona: 'muse' | 'editor' | 'coach';
  intent: 'generate_scene' | 'improve_dialogue' | 'add_description' | 'create_conflict' | 'suggest_plot' | 'character_development' | 'worldbuilding' | 'style_improvement';
  temperature?: number;
  maxTokens?: number;
  style?: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
}

const PERSONAS = [
  { value: 'muse', label: 'Muse', description: 'Creative inspiration and story generation' },
  { value: 'editor', label: 'Editor', description: 'Grammar, style, and structure improvement' },
  { value: 'coach', label: 'Coach', description: 'Writing guidance and technique advice' },
];

const INTENTS = [
  { value: 'generate_scene', label: 'Generate Scene', description: 'Create a new scene from scratch' },
  { value: 'improve_dialogue', label: 'Improve Dialogue', description: 'Enhance character conversations' },
  { value: 'add_description', label: 'Add Description', description: 'Enrich scene descriptions' },
  { value: 'create_conflict', label: 'Create Conflict', description: 'Introduce tension and drama' },
  { value: 'suggest_plot', label: 'Suggest Plot', description: 'Develop story progression' },
  { value: 'character_development', label: 'Character Development', description: 'Deepen character arcs' },
  { value: 'worldbuilding', label: 'Worldbuilding', description: 'Expand setting details' },
  { value: 'style_improvement', label: 'Style Improvement', description: 'Refine writing style' },
];

const QUICK_PROMPTS = [
  { label: 'Write a tense confrontation', intent: 'generate_scene', persona: 'muse' },
  { label: 'Improve this dialogue', intent: 'improve_dialogue', persona: 'editor' },
  { label: 'Add sensory details', intent: 'add_description', persona: 'muse' },
  { label: 'Create a plot twist', intent: 'suggest_plot', persona: 'coach' },
  { label: 'Develop character backstory', intent: 'character_development', persona: 'coach' },
  { label: 'Describe the setting', intent: 'worldbuilding', persona: 'muse' },
];

export const AIWritingAssistant: React.FC<AIWritingAssistantProps> = ({
  onGenerate,
  context,
  className,
}) => {
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<AIGenerationOptions>({
    persona: 'muse',
    intent: 'generate_scene',
    temperature: 0.7,
    maxTokens: 1000,
    length: 'medium',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const result = await onGenerate(prompt, options);
      setGeneratedText(result);
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, options, onGenerate]);

  const handleQuickPrompt = useCallback((quickPrompt: typeof QUICK_PROMPTS[0]) => {
    setPrompt(quickPrompt.label);
    setOptions(prev => ({
      ...prev,
      intent: quickPrompt.intent as any,
      persona: quickPrompt.persona as any,
    }));
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, [generatedText]);

  const handleUseGenerated = useCallback(() => {
    // This would typically be handled by the parent component
    console.log('Use generated text:', generatedText);
  }, [generatedText]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Prompts */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Quick Prompts</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {QUICK_PROMPTS.map((quickPrompt, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleQuickPrompt(quickPrompt)}
              className="justify-start text-left h-auto p-2"
            >
              <div>
                <div className="font-medium text-xs">{quickPrompt.label}</div>
                <div className="text-xs text-gray-500">
                  {PERSONAS.find(p => p.value === quickPrompt.persona)?.label}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Generation Options */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">AI Writing Assistant</h3>
        
        <div className="space-y-4">
          {/* Prompt Input */}
          <div>
            <Label htmlFor="prompt">What would you like to generate?</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to create or improve..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="persona">AI Persona</Label>
              <Select
                value={options.persona}
                onValueChange={(value) => setOptions(prev => ({ ...prev, persona: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSONAS.map((persona) => (
                    <SelectItem key={persona.value} value={persona.value}>
                      <div>
                        <div className="font-medium">{persona.label}</div>
                        <div className="text-xs text-gray-500">{persona.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="intent">Intent</Label>
              <Select
                value={options.intent}
                onValueChange={(value) => setOptions(prev => ({ ...prev, intent: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTENTS.map((intent) => (
                    <SelectItem key={intent.value} value={intent.value}>
                      <div>
                        <div className="font-medium">{intent.label}</div>
                        <div className="text-xs text-gray-500">{intent.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="temperature">Creativity (Temperature)</Label>
              <Select
                value={options.temperature?.toString()}
                onValueChange={(value) => setOptions(prev => ({ ...prev, temperature: parseFloat(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.3">Conservative (0.3)</SelectItem>
                  <SelectItem value="0.7">Balanced (0.7)</SelectItem>
                  <SelectItem value="1.0">Creative (1.0)</SelectItem>
                  <SelectItem value="1.3">Very Creative (1.3)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="length">Length</Label>
              <Select
                value={options.length}
                onValueChange={(value) => setOptions(prev => ({ ...prev, length: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (200-500 words)</SelectItem>
                  <SelectItem value="medium">Medium (500-1000 words)</SelectItem>
                  <SelectItem value="long">Long (1000+ words)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Generated Text */}
      {generatedText && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Generated Text</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleUseGenerated}
              >
                Use This Text
              </Button>
            </div>
          </div>
          
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-800">
              {generatedText}
            </div>
          </div>
        </Card>
      )}

      {/* Context Information */}
      {context && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">Context</h3>
          <div className="space-y-2 text-sm text-gray-600">
            {context.project && (
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>Project: {context.project.title}</span>
              </div>
            )}
            {context.scene && (
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                <span>Scene: {context.scene.title}</span>
              </div>
            )}
            {context.characters && context.characters.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Characters: {context.characters.map(c => c.name).join(', ')}</span>
              </div>
            )}
            {context.locations && context.locations.length > 0 && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Locations: {context.locations.map(l => l.name).join(', ')}</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};