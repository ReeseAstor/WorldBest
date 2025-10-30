'use client';

import { useState, useEffect } from 'react';
import { Button } from '@worldbest/ui-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@worldbest/ui-components';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Target,
  Award,
  Clock,
  BookOpen,
  PenTool,
  Users,
  Sparkles,
  BarChart3,
  LineChart,
  PieChart,
  Download,
  Filter,
  ChevronUp,
  ChevronDown,
  Zap,
  Flame,
  Trophy
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface WritingStats {
  totalWords: number;
  wordsToday: number;
  wordsThisWeek: number;
  wordsThisMonth: number;
  averageWordsPerDay: number;
  writingStreak: number;
  longestStreak: number;
  totalSessions: number;
  averageSessionLength: number;
  mostProductiveTime: string;
  totalProjects: number;
  completedChapters: number;
  aiGenerations: number;
  tokensUsed: number;
}

interface DailyProgress {
  date: string;
  words: number;
  target: number;
  sessions: number;
  aiUsage: number;
}

interface ProjectProgress {
  name: string;
  words: number;
  target: number;
  percentage: number;
  lastUpdated: string;
}

interface GenreDistribution {
  genre: string;
  count: number;
  words: number;
  percentage: number;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [selectedProject, setSelectedProject] = useState('all');
  const [loading, setLoading] = useState(true);

  // Mock data
  const [stats] = useState<WritingStats>({
    totalWords: 125000,
    wordsToday: 1250,
    wordsThisWeek: 8500,
    wordsThisMonth: 32000,
    averageWordsPerDay: 850,
    writingStreak: 7,
    longestStreak: 15,
    totalSessions: 145,
    averageSessionLength: 45,
    mostProductiveTime: '9:00 AM - 11:00 AM',
    totalProjects: 4,
    completedChapters: 18,
    aiGenerations: 234,
    tokensUsed: 450000
  });

  const [dailyProgress] = useState<DailyProgress[]>([
    { date: 'Mon', words: 1200, target: 1000, sessions: 2, aiUsage: 15 },
    { date: 'Tue', words: 850, target: 1000, sessions: 1, aiUsage: 8 },
    { date: 'Wed', words: 1500, target: 1000, sessions: 3, aiUsage: 22 },
    { date: 'Thu', words: 950, target: 1000, sessions: 2, aiUsage: 12 },
    { date: 'Fri', words: 1800, target: 1000, sessions: 2, aiUsage: 18 },
    { date: 'Sat', words: 1450, target: 1000, sessions: 2, aiUsage: 20 },
    { date: 'Sun', words: 1250, target: 1000, sessions: 1, aiUsage: 10 }
  ]);

  const [projectProgress] = useState<ProjectProgress[]>([
    { name: 'The Dragon\'s Legacy', words: 45000, target: 80000, percentage: 56, lastUpdated: 'Today' },
    { name: 'Cyber Shadows', words: 23000, target: 70000, percentage: 33, lastUpdated: '2 days ago' },
    { name: 'Midnight Mysteries', words: 65000, target: 65000, percentage: 100, lastUpdated: '5 days ago' },
    { name: 'Hearts Entwined', words: 55000, target: 55000, percentage: 100, lastUpdated: '1 week ago' }
  ]);

  const [genreDistribution] = useState<GenreDistribution[]>([
    { genre: 'Fantasy', count: 2, words: 68000, percentage: 35 },
    { genre: 'Sci-Fi', count: 1, words: 23000, percentage: 18 },
    { genre: 'Mystery', count: 1, words: 65000, percentage: 27 },
    { genre: 'Romance', count: 1, words: 55000, percentage: 20 }
  ]);

  const [writingHeatmap] = useState([
    { hour: '12 AM', Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 },
    { hour: '6 AM', Mon: 200, Tue: 150, Wed: 180, Thu: 0, Fri: 220, Sat: 0, Sun: 0 },
    { hour: '9 AM', Mon: 500, Tue: 450, Wed: 600, Thu: 480, Fri: 550, Sat: 400, Sun: 300 },
    { hour: '12 PM', Mon: 300, Tue: 250, Wed: 400, Thu: 350, Fri: 450, Sat: 500, Sun: 400 },
    { hour: '3 PM', Mon: 200, Tue: 150, Wed: 300, Thu: 120, Fri: 380, Sat: 350, Sun: 450 },
    { hour: '6 PM', Mon: 0, Tue: 0, Wed: 200, Thu: 0, Fri: 200, Sat: 200, Sun: 100 },
    { hour: '9 PM', Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
  ]);

  const [aiUsageStats] = useState([
    { persona: 'Muse', usage: 45, satisfaction: 85 },
    { persona: 'Editor', usage: 35, satisfaction: 92 },
    { persona: 'Coach', usage: 20, satisfaction: 78 }
  ]);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={`text-xs flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {Math.abs(change)}% from last {timeRange}
          </p>
        )}
        {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your writing progress and productivity
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Words Written"
          value={stats.wordsThisWeek.toLocaleString()}
          change={12}
          icon={PenTool}
          trend="Daily avg: 1,214"
        />
        <StatCard
          title="Writing Streak"
          value={`${stats.writingStreak} days`}
          icon={Flame}
          trend={`Longest: ${stats.longestStreak} days`}
        />
        <StatCard
          title="AI Generations"
          value={stats.aiGenerations}
          change={8}
          icon={Sparkles}
          trend={`${(stats.tokensUsed / 1000).toFixed(0)}k tokens used`}
        />
        <StatCard
          title="Productivity Score"
          value="85%"
          change={5}
          icon={Trophy}
          trend="Above average"
        />
      </div>

      {/* Writing Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Writing Progress</CardTitle>
          <CardDescription>Daily word count and targets</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="words" 
                stroke="#8b5cf6" 
                fill="#8b5cf6" 
                fillOpacity={0.6} 
                name="Words Written"
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="#ef4444" 
                strokeDasharray="5 5" 
                name="Daily Target"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Project Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
            <CardDescription>Word count by project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectProgress.map((project) => (
              <div key={project.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{project.name}</span>
                  <span className="text-muted-foreground">
                    {project.words.toLocaleString()} / {project.target.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Last updated: {project.lastUpdated}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Genre Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Genre Distribution</CardTitle>
            <CardDescription>Words written by genre</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPieChart>
                <Pie
                  data={genreDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ genre, percentage }) => `${genre} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="words"
                >
                  {genreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Usage */}
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant Usage</CardTitle>
          <CardDescription>Performance by persona</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={aiUsageStats}>
              <PolarGrid />
              <PolarAngleAxis dataKey="persona" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Usage %" dataKey="usage" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              <Radar name="Satisfaction %" dataKey="satisfaction" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Writing Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Writing Patterns</CardTitle>
          <CardDescription>Your most productive times</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={writingHeatmap}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Mon" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="Tue" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Wed" stackId="a" fill="#10b981" />
              <Bar dataKey="Thu" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Fri" stackId="a" fill="#ef4444" />
              <Bar dataKey="Sat" stackId="a" fill="#ec4899" />
              <Bar dataKey="Sun" stackId="a" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Achievements</CardTitle>
          <CardDescription>Milestones and accomplishments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Week Warrior</p>
                <p className="text-xs text-muted-foreground">7-day streak achieved</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Speed Writer</p>
                <p className="text-xs text-muted-foreground">1,800 words in one session</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Goal Crusher</p>
                <p className="text-xs text-muted-foreground">Exceeded weekly target</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
          <CardDescription>AI-powered writing insights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg">
            <Activity className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Peak Performance Time</p>
              <p className="text-sm text-muted-foreground">
                You write 40% more words between 9-11 AM. Consider scheduling your writing sessions during this time.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Momentum Building</p>
              <p className="text-sm text-muted-foreground">
                Your writing speed has increased by 15% this week. Keep up the great work!
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg">
            <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-sm">AI Optimization</p>
              <p className="text-sm text-muted-foreground">
                The Editor persona has been most effective for your writing style. It improved your content quality by 22%.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}