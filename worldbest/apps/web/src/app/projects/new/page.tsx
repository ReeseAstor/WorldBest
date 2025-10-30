'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@worldbest/ui-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@worldbest/ui-components';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Sparkles,
  Target,
  Globe,
  Lock,
  Users,
  Check,
  Info
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

interface ProjectFormData {
  title: string;
  synopsis: string;
  genre: string;
  subgenres: string[];
  targetAudience: string;
  targetWordCount: number;
  contentRating: string;
  visibility: 'private' | 'team' | 'public';
  timePeriod: string;
  defaultLanguage: string;
  aiPreferences: {
    draftModel: string;
    polishModel: string;
    temperatureDraft: number;
    temperaturePolish: number;
    maxTokensPerGen: number;
  };
}

const genres = [
  { id: 'fantasy', name: 'Fantasy', icon: '🐉', description: 'Magic, mythical creatures, and imaginary worlds' },
  { id: 'scifi', name: 'Science Fiction', icon: '🚀', description: 'Future technology, space exploration, and scientific concepts' },
  { id: 'mystery', name: 'Mystery', icon: '🔍', description: 'Puzzles, investigations, and suspenseful revelations' },
  { id: 'romance', name: 'Romance', icon: '💕', description: 'Love stories and emotional relationships' },
  { id: 'thriller', name: 'Thriller', icon: '⚡', description: 'High stakes, suspense, and intense action' },
  { id: 'horror', name: 'Horror', icon: '👻', description: 'Fear, supernatural elements, and dark themes' },
  { id: 'literary', name: 'Literary Fiction', icon: '📚', description: 'Character-driven narratives with artistic merit' },
  { id: 'historical', name: 'Historical Fiction', icon: '🏛️', description: 'Stories set in specific historical periods' },
];

const subgenreOptions: Record<string, string[]> = {
  fantasy: ['Epic Fantasy', 'Urban Fantasy', 'Dark Fantasy', 'Fairy Tale Retelling', 'Mythological', 'Sword & Sorcery'],
  scifi: ['Space Opera', 'Cyberpunk', 'Dystopian', 'Time Travel', 'Post-Apocalyptic', 'Hard Sci-Fi'],
  mystery: ['Cozy Mystery', 'Police Procedural', 'Amateur Sleuth', 'Noir', 'Psychological Thriller', 'Legal Thriller'],
  romance: ['Contemporary', 'Historical Romance', 'Paranormal Romance', 'Romantic Suspense', 'Young Adult', 'Erotic Romance'],
  thriller: ['Action Thriller', 'Psychological Thriller', 'Techno-Thriller', 'Spy Thriller', 'Medical Thriller', 'Political Thriller'],
  horror: ['Gothic Horror', 'Psychological Horror', 'Supernatural Horror', 'Body Horror', 'Cosmic Horror', 'Slasher'],
  literary: ['Contemporary Literary', 'Experimental', 'Philosophical', 'Magical Realism', 'Biographical Fiction', 'Social Commentary'],
  historical: ['Ancient History', 'Medieval', 'Renaissance', 'Victorian', 'World War Era', '20th Century'],
};

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    synopsis: '',
    genre: '',
    subgenres: [],
    targetAudience: 'adult',
    targetWordCount: 80000,
    contentRating: 'PG-13',
    visibility: 'private',
    timePeriod: '',
    defaultLanguage: 'en-US',
    aiPreferences: {
      draftModel: 'gpt-4',
      polishModel: 'gpt-4',
      temperatureDraft: 0.7,
      temperaturePolish: 0.3,
      maxTokensPerGen: 2000,
    },
  });

  const handleGenreSelect = (genreId: string) => {
    setFormData(prev => ({
      ...prev,
      genre: genreId,
      subgenres: [], // Reset subgenres when genre changes
    }));
  };

  const handleSubgenreToggle = (subgenre: string) => {
    setFormData(prev => ({
      ...prev,
      subgenres: prev.subgenres.includes(subgenre)
        ? prev.subgenres.filter(s => s !== subgenre)
        : [...prev.subgenres, subgenre],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    // TODO: API call to create project
    setTimeout(() => {
      router.push('/projects/1'); // Redirect to new project
    }, 1000);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.title && formData.synopsis;
      case 2:
        return formData.genre;
      case 3:
        return formData.targetWordCount > 0;
      default:
        return true;
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
          <p className="text-muted-foreground">
            Set up your writing project with AI-powered assistance
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300" 
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Basic Information'}
            {step === 2 && 'Genre & Style'}
            {step === 3 && 'Project Settings'}
            {step === 4 && 'AI Preferences'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Give your project a title and brief description'}
            {step === 2 && 'Choose the genre and subgenres for your story'}
            {step === 3 && 'Configure project goals and visibility'}
            {step === 4 && 'Customize AI assistance for your writing style'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter your project title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  Choose a working title for your project (you can change it later)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="synopsis">Synopsis *</Label>
                <textarea
                  id="synopsis"
                  className="w-full min-h-[150px] px-3 py-2 border rounded-md bg-background"
                  placeholder="Write a brief synopsis of your story..."
                  value={formData.synopsis}
                  onChange={(e) => setFormData(prev => ({ ...prev, synopsis: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  A brief overview of your story's plot, themes, and main characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timePeriod">Time Period (Optional)</Label>
                <Input
                  id="timePeriod"
                  placeholder="e.g., Medieval, Victorian Era, Near Future, 2050s"
                  value={formData.timePeriod}
                  onChange={(e) => setFormData(prev => ({ ...prev, timePeriod: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  When does your story take place?
                </p>
              </div>
            </>
          )}

          {/* Step 2: Genre */}
          {step === 2 && (
            <>
              <div className="space-y-4">
                <Label>Primary Genre *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {genres.map(genre => (
                    <button
                      key={genre.id}
                      onClick={() => handleGenreSelect(genre.id)}
                      className={`p-4 border rounded-lg text-left transition-all ${
                        formData.genre === genre.id 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-2xl mb-2">{genre.icon}</div>
                      <div className="font-semibold">{genre.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {genre.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {formData.genre && (
                <div className="space-y-4 pt-4 border-t">
                  <Label>Subgenres (Optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {subgenreOptions[formData.genre]?.map(subgenre => (
                      <button
                        key={subgenre}
                        onClick={() => handleSubgenreToggle(subgenre)}
                        className={`px-3 py-1 border rounded-full text-sm transition-all ${
                          formData.subgenres.includes(subgenre)
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:border-primary'
                        }`}
                      >
                        {subgenre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 3: Settings */}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="targetWordCount">Target Word Count *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="targetWordCount"
                    type="number"
                    min="1000"
                    max="500000"
                    step="1000"
                    value={formData.targetWordCount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      targetWordCount: parseInt(e.target.value) || 0 
                    }))}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">words</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {[
                    { label: 'Short Story', value: 5000 },
                    { label: 'Novella', value: 30000 },
                    { label: 'Novel', value: 80000 },
                    { label: 'Epic', value: 120000 },
                  ].map(preset => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        targetWordCount: preset.value 
                      }))}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    targetAudience: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="children">Children (8-12)</option>
                  <option value="young_adult">Young Adult (13-17)</option>
                  <option value="new_adult">New Adult (18-25)</option>
                  <option value="adult">Adult (18+)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Content Rating</Label>
                <select
                  value={formData.contentRating}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contentRating: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="G">G - General Audiences</option>
                  <option value="PG">PG - Parental Guidance</option>
                  <option value="PG-13">PG-13 - Parents Strongly Cautioned</option>
                  <option value="R">R - Restricted</option>
                  <option value="NC-17">NC-17 - Adults Only</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Project Visibility</Label>
                <div className="space-y-2">
                  {[
                    { value: 'private', icon: Lock, label: 'Private', desc: 'Only you can access' },
                    { value: 'team', icon: Users, label: 'Team', desc: 'Share with team members' },
                    { value: 'public', icon: Globe, label: 'Public', desc: 'Anyone can view' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        visibility: option.value as any 
                      }))}
                      className={`w-full p-3 border rounded-lg text-left transition-all ${
                        formData.visibility === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <option.icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.desc}</div>
                        </div>
                        {formData.visibility === option.value && (
                          <Check className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 4: AI Preferences */}
          {step === 4 && (
            <>
              <div className="p-4 bg-primary/10 rounded-lg flex gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">AI Writing Assistant</p>
                  <p className="text-muted-foreground">
                    Customize how the AI assists with your writing. You can adjust these settings anytime.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Draft Model</Label>
                  <select
                    value={formData.aiPreferences.draftModel}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      aiPreferences: { ...prev.aiPreferences, draftModel: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="gpt-4">GPT-4 (Most Creative)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
                    <option value="claude-2">Claude 2 (Detailed)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Polish Model</Label>
                  <select
                    value={formData.aiPreferences.polishModel}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      aiPreferences: { ...prev.aiPreferences, polishModel: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="gpt-4">GPT-4 (Most Accurate)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
                    <option value="claude-2">Claude 2 (Thoughtful)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Draft Creativity</Label>
                    <span className="text-sm text-muted-foreground">
                      {formData.aiPreferences.temperatureDraft}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.aiPreferences.temperatureDraft}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      aiPreferences: { 
                        ...prev.aiPreferences, 
                        temperatureDraft: parseFloat(e.target.value) 
                      }
                    }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Conservative</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Polish Precision</Label>
                    <span className="text-sm text-muted-foreground">
                      {formData.aiPreferences.temperaturePolish}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.aiPreferences.temperaturePolish}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      aiPreferences: { 
                        ...prev.aiPreferences, 
                        temperaturePolish: parseFloat(e.target.value) 
                      }
                    }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Precise</span>
                    <span>Flexible</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Max Tokens per Generation</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="500"
                    max="4000"
                    step="500"
                    value={formData.aiPreferences.maxTokensPerGen}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      aiPreferences: { 
                        ...prev.aiPreferences, 
                        maxTokensPerGen: parseInt(e.target.value) || 2000 
                      }
                    }))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    tokens (≈ {Math.round(formData.aiPreferences.maxTokensPerGen * 0.75)} words)
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(prev => Math.max(1, prev - 1))}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {step < 4 ? (
          <Button
            onClick={() => setStep(prev => prev + 1)}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading || !canProceed()}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Project
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}