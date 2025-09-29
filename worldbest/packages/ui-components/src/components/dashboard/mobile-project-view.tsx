'use client';

import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  ArrowLeft,
  MoreVertical,
  Edit,
  Share2,
  Download,
  Trash2,
  BookOpen,
  FileText,
  Users,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  ChevronRight,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Chapter {
  id: string;
  title: string;
  number: number;
  status: 'outlined' | 'draft' | 'written' | 'revised' | 'final';
  wordCount: number;
  targetWordCount?: number;
  lastModified: string;
  scenes: Scene[];
}

export interface Scene {
  id: string;
  title: string;
  status: 'outlined' | 'draft' | 'written' | 'revised' | 'final';
  wordCount: number;
  lastModified: string;
  povCharacter?: string;
  location?: string;
}

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
  chapters: Chapter[];
}

export interface MobileProjectViewProps {
  project: Project;
  onBack: () => void;
  onChapterSelect: (chapterId: string) => void;
  onSceneSelect: (sceneId: string) => void;
  onEditProject: () => void;
  onShareProject: () => void;
  onExportProject: () => void;
  onDeleteProject: () => void;
  className?: string;
}

export const MobileProjectView: React.FC<MobileProjectViewProps> = ({
  project,
  onBack,
  onChapterSelect,
  onSceneSelect,
  onEditProject,
  onShareProject,
  onExportProject,
  onDeleteProject,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'chapters' | 'scenes'>('overview');
  const [showActions, setShowActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'outlined': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'written': return 'bg-green-100 text-green-800';
      case 'revised': return 'bg-orange-100 text-orange-800';
      case 'final': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'outlined': return <Target className="h-3 w-3" />;
      case 'draft': return <FileText className="h-3 w-3" />;
      case 'written': return <BookOpen className="h-3 w-3" />;
      case 'revised': return <Edit className="h-3 w-3" />;
      case 'final': return <TrendingUp className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const filteredChapters = project.chapters.filter(chapter => {
    const matchesSearch = chapter.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || chapter.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const allScenes = project.chapters.flatMap(chapter => 
    chapter.scenes.map(scene => ({ ...scene, chapterTitle: chapter.title, chapterNumber: chapter.number }))
  );

  const filteredScenes = allScenes.filter(scene => {
    const matchesSearch = scene.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         scene.chapterTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || scene.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'chapters', label: 'Chapters', icon: FileText, count: project.chapters.length },
    { id: 'scenes', label: 'Scenes', icon: Target, count: allScenes.length },
  ];

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {project.title}
              </h1>
              <p className="text-sm text-gray-500">{project.genre}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActions(!showActions)}
              className="p-2"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search chapters or scenes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 justify-center"
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.count !== undefined && (
                  <Badge variant="secondary" className="ml-2">
                    {tab.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Filter */}
        {(activeTab === 'chapters' || activeTab === 'scenes') && (
          <div className="px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto">
              {['all', 'outlined', 'draft', 'written', 'revised', 'final'].map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                  className="whitespace-nowrap capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Project Stats */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Project Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{project.wordCount.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Words Written</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{project.chapters.length}</div>
                  <div className="text-sm text-gray-500">Chapters</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{allScenes.length}</div>
                  <div className="text-sm text-gray-500">Scenes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{project.progress}%</div>
                  <div className="text-sm text-gray-500">Complete</div>
                </div>
              </div>
            </Card>

            {/* Progress */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Progress</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                {project.targetWordCount && (
                  <div className="text-xs text-gray-500">
                    {project.wordCount.toLocaleString()} of {project.targetWordCount.toLocaleString()} words
                  </div>
                )}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Recent Activity</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>Last modified: {new Date(project.lastModified).toLocaleDateString()}</span>
                </div>
                {project.collaborators && project.collaborators > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{project.collaborators} collaborators</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'chapters' && (
          <div className="space-y-3">
            {filteredChapters.map((chapter) => (
              <Card
                key={chapter.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onChapterSelect(chapter.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      Chapter {chapter.number}: {chapter.title}
                    </h3>
                    <p className="text-sm text-gray-500">{chapter.scenes.length} scenes</p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-2">
                    <Badge className={cn('flex items-center gap-1', getStatusColor(chapter.status))}>
                      {getStatusIcon(chapter.status)}
                      {chapter.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{chapter.wordCount.toLocaleString()} words</span>
                  <span>{new Date(chapter.lastModified).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}

            {filteredChapters.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No chapters found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'Try adjusting your search criteria' : 'Create your first chapter'}
                </p>
                {!searchQuery && (
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Chapter
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'scenes' && (
          <div className="space-y-3">
            {filteredScenes.map((scene) => (
              <Card
                key={scene.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSceneSelect(scene.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {scene.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Chapter {scene.chapterNumber}: {scene.chapterTitle}
                    </p>
                    {(scene.povCharacter || scene.location) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {scene.povCharacter && `POV: ${scene.povCharacter}`}
                        {scene.povCharacter && scene.location && ' • '}
                        {scene.location && `Location: ${scene.location}`}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-2">
                    <Badge className={cn('flex items-center gap-1', getStatusColor(scene.status))}>
                      {getStatusIcon(scene.status)}
                      {scene.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{scene.wordCount.toLocaleString()} words</span>
                  <span>{new Date(scene.lastModified).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}

            {filteredScenes.length === 0 && (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No scenes found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'Try adjusting your search criteria' : 'Create your first scene'}
                </p>
                {!searchQuery && (
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Scene
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions Menu */}
      {showActions && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-lg p-4">
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onEditProject();
                  setShowActions(false);
                }}
              >
                <Edit className="h-4 w-4 mr-3" />
                Edit Project
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onShareProject();
                  setShowActions(false);
                }}
              >
                <Share2 className="h-4 w-4 mr-3" />
                Share Project
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onExportProject();
                  setShowActions(false);
                }}
              >
                <Download className="h-4 w-4 mr-3" />
                Export Project
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600"
                onClick={() => {
                  onDeleteProject();
                  setShowActions(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-3" />
                Delete Project
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setShowActions(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};