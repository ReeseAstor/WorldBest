'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@worldbest/ui-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@worldbest/ui-components';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  Filter,
  BookOpen,
  Calendar,
  Users,
  Target,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Archive,
  Star,
  Grid,
  List,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { format } from 'date-fns';

interface Project {
  id: string;
  title: string;
  synopsis: string;
  genre: string;
  status: 'planning' | 'in_progress' | 'editing' | 'completed' | 'archived';
  visibility: 'private' | 'team' | 'public';
  wordCount: number;
  targetWordCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt: Date;
  coverUrl?: string;
  collaborators: number;
  starred: boolean;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title' | 'progress'>('updated');
  const [loading, setLoading] = useState(true);

  // Mock data - will be replaced with API calls
  useEffect(() => {
    const mockProjects: Project[] = [
      {
        id: '1',
        title: 'The Dragon\'s Legacy',
        synopsis: 'An epic fantasy tale of dragons, magic, and the fate of kingdoms...',
        genre: 'Fantasy',
        status: 'in_progress',
        visibility: 'private',
        wordCount: 45000,
        targetWordCount: 80000,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        lastOpenedAt: new Date('2024-01-15'),
        collaborators: 0,
        starred: true,
      },
      {
        id: '2',
        title: 'Cyber Shadows',
        synopsis: 'In a dystopian future where technology and humanity collide...',
        genre: 'Sci-Fi',
        status: 'planning',
        visibility: 'team',
        wordCount: 23000,
        targetWordCount: 70000,
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-10'),
        lastOpenedAt: new Date('2024-01-10'),
        collaborators: 2,
        starred: false,
      },
      {
        id: '3',
        title: 'Midnight Mysteries',
        synopsis: 'A detective thriller set in Victorian London...',
        genre: 'Mystery',
        status: 'editing',
        visibility: 'private',
        wordCount: 65000,
        targetWordCount: 65000,
        createdAt: new Date('2023-11-01'),
        updatedAt: new Date('2024-01-08'),
        lastOpenedAt: new Date('2024-01-08'),
        collaborators: 1,
        starred: true,
      },
      {
        id: '4',
        title: 'Hearts Entwined',
        synopsis: 'A contemporary romance about second chances and new beginnings...',
        genre: 'Romance',
        status: 'completed',
        visibility: 'public',
        wordCount: 55000,
        targetWordCount: 55000,
        createdAt: new Date('2023-09-15'),
        updatedAt: new Date('2023-12-20'),
        lastOpenedAt: new Date('2024-01-02'),
        collaborators: 0,
        starred: false,
      },
    ];
    
    setProjects(mockProjects);
    setLoading(false);
  }, []);

  const genres = ['all', 'Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Thriller', 'Horror', 'Literary', 'Historical'];
  const statuses = ['all', 'planning', 'in_progress', 'editing', 'completed', 'archived'];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.synopsis.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'all' || project.genre === selectedGenre;
    const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
    
    return matchesSearch && matchesGenre && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'updated':
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      case 'created':
        return b.createdAt.getTime() - a.createdAt.getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      case 'progress':
        const progressA = (a.wordCount / a.targetWordCount) * 100;
        const progressB = (b.wordCount / b.targetWordCount) * 100;
        return progressB - progressA;
      default:
        return 0;
    }
  });

  const toggleStar = (projectId: string) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, starred: !p.starred } : p
    ));
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'planning':
        return 'text-blue-600 bg-blue-100';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'editing':
        return 'text-purple-600 bg-purple-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'archived':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const ProjectCard = ({ project }: { project: Project }) => (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {project.title}
              {project.starred && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {project.synopsis}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              // Open menu
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 text-xs rounded-full bg-secondary">
            {project.genre}
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
            {project.status.replace('_', ' ')}
          </span>
          {project.collaborators > 0 && (
            <span className="px-2 py-1 text-xs rounded-full bg-secondary flex items-center gap-1">
              <Users className="h-3 w-3" />
              {project.collaborators}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{project.wordCount.toLocaleString()} / {project.targetWordCount.toLocaleString()} words</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min((project.wordCount / project.targetWordCount) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Updated {format(project.updatedAt, 'MMM d, yyyy')}</span>
          <span>{Math.round((project.wordCount / project.targetWordCount) * 100)}%</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/projects/${project.id}`);
            }}
          >
            Open
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(project.id);
            }}
          >
            <Star className={`h-3 w-3 ${project.starred ? 'fill-current' : ''}`} />
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
          <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
          <p className="text-muted-foreground">
            Manage and organize your writing projects
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="space-y-4 p-4 bg-card rounded-lg border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              {genres.map(genre => (
                <option key={genre} value={genre}>
                  {genre === 'all' ? 'All Genres' : genre}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Status' : status.replace('_', ' ')}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="updated">Last Updated</option>
              <option value="created">Date Created</option>
              <option value="title">Title</option>
              <option value="progress">Progress</option>
            </select>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No projects found</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery || selectedGenre !== 'all' || selectedStatus !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Create your first project to get started'}
              </p>
            </div>
            {!searchQuery && selectedGenre === 'all' && selectedStatus === 'all' && (
              <Button asChild>
                <Link href="/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' 
          : 'space-y-4'
        }>
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}