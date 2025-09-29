'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Menu, 
  X, 
  Plus, 
  Search, 
  Filter,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Bell,
  User,
  ChevronRight,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  FileText,
  Download,
  Share2
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Project {
  id: string;
  title: string;
  genre: string;
  status: 'planning' | 'writing' | 'editing' | 'completed';
  wordCount: number;
  targetWordCount?: number;
  lastModified: string;
  collaborators?: number;
  progress: number;
}

export interface MobileDashboardProps {
  projects: Project[];
  onProjectSelect: (projectId: string) => void;
  onCreateProject: () => void;
  onSearch: (query: string) => void;
  onFilter: (filter: string) => void;
  className?: string;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  projects,
  onProjectSelect,
  onCreateProject,
  onSearch,
  onFilter,
  className,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filters = [
    { value: 'all', label: 'All Projects' },
    { value: 'planning', label: 'Planning' },
    { value: 'writing', label: 'Writing' },
    { value: 'editing', label: 'Editing' },
    { value: 'completed', label: 'Completed' },
  ];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.genre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || project.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilter = (filter: string) => {
    setActiveFilter(filter);
    onFilter(filter);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'writing': return 'bg-green-100 text-green-800';
      case 'editing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planning': return <Target className="h-3 w-3" />;
      case 'writing': return <FileText className="h-3 w-3" />;
      case 'editing': return <Settings className="h-3 w-3" />;
      case 'completed': return <TrendingUp className="h-3 w-3" />;
      default: return <BookOpen className="h-3 w-3" />;
    }
  };

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">WorldBest</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={cn(
                "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                isSearchFocused && "ring-2 ring-blue-500 border-transparent"
              )}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto">
          {filters.map((filter) => (
            <Button
              key={filter.value}
              variant={activeFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilter(filter.value)}
              className="whitespace-nowrap"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onProjectSelect(project.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {project.title}
                  </h3>
                  <p className="text-sm text-gray-500">{project.genre}</p>
                </div>
                
                <div className="flex items-center gap-2 ml-2">
                  <Badge className={cn('flex items-center gap-1', getStatusColor(project.status))}>
                    {getStatusIcon(project.status)}
                    {project.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>{project.wordCount.toLocaleString()} words</span>
                  {project.targetWordCount && (
                    <span>of {project.targetWordCount.toLocaleString()}</span>
                  )}
                </div>
              </div>

              {/* Project Stats */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(project.lastModified).toLocaleDateString()}</span>
                  </div>
                  {project.collaborators && project.collaborators > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{project.collaborators}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(project.lastModified).toLocaleTimeString()}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first project'
              }
            </p>
            {!searchQuery && (
              <Button onClick={onCreateProject} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={onCreateProject}
          className="rounded-full w-14 h-14 shadow-lg"
          size="lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Side Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <nav className="p-4 space-y-2">
              <Button variant="ghost" className="w-full justify-start">
                <BookOpen className="h-4 w-4 mr-3" />
                Projects
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Users className="h-4 w-4 mr-3" />
                Collaborators
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-3" />
                Analytics
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-3" />
                Settings
              </Button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};