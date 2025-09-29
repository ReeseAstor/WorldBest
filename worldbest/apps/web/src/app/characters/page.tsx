'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@worldbest/ui-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@worldbest/ui-components';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  Filter,
  Users,
  User,
  Heart,
  Swords,
  Brain,
  Eye,
  MessageSquare,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  Link as LinkIcon,
  ChevronRight,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

interface Character {
  id: string;
  name: string;
  aliases: string[];
  age?: number;
  gender?: string;
  mbti?: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  projectId: string;
  projectName: string;
  description: string;
  coreTraits: string[];
  relationships: {
    id: string;
    characterId: string;
    characterName: string;
    type: string;
    description: string;
  }[];
  appearanceCount: number;
  lastModified: Date;
  imageUrl?: string;
  arcSummary?: string;
}

const mbtiTypes = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

const roleColors = {
  protagonist: 'bg-green-100 text-green-800',
  antagonist: 'bg-red-100 text-red-800',
  supporting: 'bg-blue-100 text-blue-800',
  minor: 'bg-gray-100 text-gray-800'
};

export default function CharactersPage() {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedMBTI, setSelectedMBTI] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showRelationshipMap, setShowRelationshipMap] = useState(false);

  // Mock data
  useEffect(() => {
    const mockCharacters: Character[] = [
      {
        id: '1',
        name: 'Elena Starweaver',
        aliases: ['The Silver Witch', 'Lady of Stars'],
        age: 28,
        gender: 'Female',
        mbti: 'INFJ',
        role: 'protagonist',
        projectId: '1',
        projectName: 'The Dragon\'s Legacy',
        description: 'A powerful mage struggling with her destiny and the burden of ancient magic.',
        coreTraits: ['Determined', 'Compassionate', 'Mysterious', 'Conflicted'],
        relationships: [
          {
            id: 'r1',
            characterId: '2',
            characterName: 'Marcus Blackstone',
            type: 'romantic',
            description: 'Complex romantic tension'
          },
          {
            id: 'r2',
            characterId: '3',
            characterName: 'Lord Valen',
            type: 'enemy',
            description: 'Sworn enemies with a shared past'
          }
        ],
        appearanceCount: 45,
        lastModified: new Date('2024-01-15'),
        arcSummary: 'From reluctant hero to embracing her power'
      },
      {
        id: '2',
        name: 'Marcus Blackstone',
        aliases: ['The Shadow Knight'],
        age: 32,
        gender: 'Male',
        mbti: 'ISTP',
        role: 'supporting',
        projectId: '1',
        projectName: 'The Dragon\'s Legacy',
        description: 'A skilled warrior with a mysterious past, torn between duty and desire.',
        coreTraits: ['Loyal', 'Stoic', 'Skilled', 'Haunted'],
        relationships: [
          {
            id: 'r3',
            characterId: '1',
            characterName: 'Elena Starweaver',
            type: 'romantic',
            description: 'Forbidden love'
          }
        ],
        appearanceCount: 38,
        lastModified: new Date('2024-01-14')
      },
      {
        id: '3',
        name: 'Lord Valen',
        aliases: ['The Dark Sovereign', 'Master of Shadows'],
        age: 45,
        gender: 'Male',
        mbti: 'ENTJ',
        role: 'antagonist',
        projectId: '1',
        projectName: 'The Dragon\'s Legacy',
        description: 'A charismatic and ruthless ruler seeking to control ancient powers.',
        coreTraits: ['Ambitious', 'Charismatic', 'Ruthless', 'Intelligent'],
        relationships: [
          {
            id: 'r4',
            characterId: '1',
            characterName: 'Elena Starweaver',
            type: 'enemy',
            description: 'Seeks to control her power'
          }
        ],
        appearanceCount: 28,
        lastModified: new Date('2024-01-13')
      },
      {
        id: '4',
        name: 'Dr. Sarah Chen',
        aliases: [],
        age: 35,
        gender: 'Female',
        mbti: 'INTP',
        role: 'protagonist',
        projectId: '2',
        projectName: 'Cyber Shadows',
        description: 'A brilliant neuroscientist uncovering a conspiracy that threatens humanity.',
        coreTraits: ['Brilliant', 'Analytical', 'Determined', 'Isolated'],
        relationships: [],
        appearanceCount: 22,
        lastModified: new Date('2024-01-10')
      }
    ];
    
    setCharacters(mockCharacters);
    setLoading(false);
  }, []);

  const projects = Array.from(new Set(characters.map(c => c.projectName)));

  const filteredCharacters = characters.filter(character => {
    const matchesSearch = character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         character.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         character.aliases.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesProject = selectedProject === 'all' || character.projectName === selectedProject;
    const matchesRole = selectedRole === 'all' || character.role === selectedRole;
    const matchesMBTI = selectedMBTI === 'all' || character.mbti === selectedMBTI;
    
    return matchesSearch && matchesProject && matchesRole && matchesMBTI;
  });

  const CharacterCard = ({ character }: { character: Character }) => (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            {character.imageUrl ? (
              <img 
                src={character.imageUrl} 
                alt={character.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{character.name}</CardTitle>
              {character.aliases.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  aka {character.aliases[0]}
                  {character.aliases.length > 1 && ` +${character.aliases.length - 1}`}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {character.description}
        </p>

        <div className="flex flex-wrap gap-2">
          <span className={`px-2 py-1 text-xs rounded-full ${roleColors[character.role]}`}>
            {character.role}
          </span>
          {character.mbti && (
            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
              {character.mbti}
            </span>
          )}
          {character.age && (
            <span className="px-2 py-1 text-xs rounded-full bg-secondary">
              Age {character.age}
            </span>
          )}
          <span className="px-2 py-1 text-xs rounded-full bg-secondary">
            {character.projectName}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Core Traits</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {character.coreTraits.slice(0, 3).map(trait => (
              <span key={trait} className="text-xs px-2 py-1 bg-secondary rounded">
                {trait}
              </span>
            ))}
            {character.coreTraits.length > 3 && (
              <span className="text-xs px-2 py-1 text-muted-foreground">
                +{character.coreTraits.length - 3}
              </span>
            )}
          </div>
        </div>

        {character.relationships.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LinkIcon className="h-3 w-3" />
              <span>{character.relationships.length} Relationships</span>
            </div>
            <div className="flex -space-x-2">
              {character.relationships.slice(0, 3).map(rel => (
                <div
                  key={rel.id}
                  className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center"
                  title={rel.characterName}
                >
                  <span className="text-xs font-medium">
                    {rel.characterName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
              ))}
              {character.relationships.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center">
                  <span className="text-xs">+{character.relationships.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {character.appearanceCount} scenes
            </span>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/characters/${character.id}`}>
              View Details
              <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Characters</h1>
          <p className="text-muted-foreground">
            Manage your story characters and their relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRelationshipMap(!showRelationshipMap)}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Relationship Map
          </Button>
          <Button asChild>
            <Link href="/characters/new">
              <Plus className="mr-2 h-4 w-4" />
              New Character
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Characters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{characters.length}</div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protagonists</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {characters.filter(c => c.role === 'protagonist').length}
            </div>
            <p className="text-xs text-muted-foreground">Main characters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relationships</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {characters.reduce((acc, c) => acc + c.relationships.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Character connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Suggestions</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Available insights</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search characters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Roles</option>
              <option value="protagonist">Protagonist</option>
              <option value="antagonist">Antagonist</option>
              <option value="supporting">Supporting</option>
              <option value="minor">Minor</option>
            </select>

            <select
              value={selectedMBTI}
              onChange={(e) => setSelectedMBTI(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Personalities</option>
              {mbtiTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Characters Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredCharacters.length === 0 ? (
        <Card className="p-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No characters found</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery || selectedProject !== 'all' || selectedRole !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Create your first character to bring your story to life'}
              </p>
            </div>
            {!searchQuery && selectedProject === 'all' && selectedRole === 'all' && (
              <Button asChild>
                <Link href="/characters/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Character
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCharacters.map(character => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Character Tools</CardTitle>
          <CardDescription>Quick actions to enhance your characters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <Button variant="outline" className="justify-start">
              <Brain className="mr-2 h-4 w-4" />
              Generate Backstory
            </Button>
            <Button variant="outline" className="justify-start">
              <MessageSquare className="mr-2 h-4 w-4" />
              Create Dialogue
            </Button>
            <Button variant="outline" className="justify-start">
              <Eye className="mr-2 h-4 w-4" />
              Appearance Builder
            </Button>
            <Button variant="outline" className="justify-start">
              <Swords className="mr-2 h-4 w-4" />
              Conflict Generator
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}