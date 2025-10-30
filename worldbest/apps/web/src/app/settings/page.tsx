'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@worldbest/ui-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@worldbest/ui-components';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Mail,
  Lock,
  Shield,
  CreditCard,
  Bell,
  Palette,
  Globe,
  Key,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Check,
  X,
  AlertCircle,
  ChevronRight,
  Upload,
  Download,
  Trash2,
  LogOut,
  HelpCircle,
  FileText,
  Users,
  Sparkles,
  Zap,
  Crown,
  Settings,
  Camera
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  website?: string;
  twitter?: string;
  plan: 'story_starter' | 'solo_author' | 'pro_creator' | 'studio_team';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
}

interface NotificationSettings {
  emailNotifications: boolean;
  projectUpdates: boolean;
  weeklyReports: boolean;
  aiSuggestions: boolean;
  collaborationInvites: boolean;
  marketingEmails: boolean;
  browserNotifications: boolean;
  mobileNotifications: boolean;
}

const plans = [
  {
    id: 'story_starter',
    name: 'Story Starter',
    price: 'Free',
    features: ['2 projects', '10 AI prompts/day', 'Basic editor'],
    icon: FileText,
    color: 'text-gray-600'
  },
  {
    id: 'solo_author',
    name: 'Solo Author',
    price: '$15/mo',
    features: ['10 projects', 'Unlimited AI prompts', 'Full export'],
    icon: User,
    color: 'text-blue-600'
  },
  {
    id: 'pro_creator',
    name: 'Pro Creator',
    price: '$35/mo',
    features: ['Unlimited projects', 'Voice/OCR', 'Analytics'],
    icon: Zap,
    color: 'text-purple-600'
  },
  {
    id: 'studio_team',
    name: 'Studio Team',
    price: '$149/mo',
    features: ['5 seats', 'RBAC', 'API access', 'Priority support'],
    icon: Users,
    color: 'text-orange-600'
  }
];

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'billing' | 'notifications' | 'preferences' | 'security'>('profile');
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [profile, setProfile] = useState<UserProfile>({
    id: '1',
    email: 'user@example.com',
    username: 'johndoe',
    displayName: 'John Doe',
    bio: 'Aspiring novelist with a passion for fantasy and science fiction.',
    website: 'https://johndoe.com',
    twitter: '@johndoe',
    plan: 'solo_author',
    emailVerified: true,
    twoFactorEnabled: false,
    createdAt: new Date('2024-01-01'),
    language: 'en-US',
    timezone: 'America/New_York',
    theme: 'system'
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    projectUpdates: true,
    weeklyReports: true,
    aiSuggestions: true,
    collaborationInvites: true,
    marketingEmails: false,
    browserNotifications: true,
    mobileNotifications: false
  });

  const handleSaveProfile = async () => {
    setLoading(true);
    // TODO: API call to save profile
    setTimeout(() => {
      setLoading(false);
      // Show success toast
    }, 1000);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Preview avatar
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const TabButton = ({ id, label, icon: Icon }: { id: string; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg transition-colors ${
        activeTab === id
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <ChevronRight className="h-4 w-4 ml-auto" />
    </button>
  );

  return (
    <div className="container max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-4 space-y-1">
              <TabButton id="profile" label="Profile" icon={User} />
              <TabButton id="account" label="Account" icon={Settings} />
              <TabButton id="billing" label="Billing & Plan" icon={CreditCard} />
              <TabButton id="notifications" label="Notifications" icon={Bell} />
              <TabButton id="preferences" label="Preferences" icon={Palette} />
              <TabButton id="security" label="Security" icon={Shield} />
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Need Help?</p>
                  <p className="text-xs text-muted-foreground">Contact support</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" size="sm">
                View Documentation
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="md:col-span-3 space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your profile details and public information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {profile.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt="Avatar"
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-10 w-10 text-primary" />
                        </div>
                      )}
                      <label
                        htmlFor="avatar-upload"
                        className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90"
                      >
                        <Camera className="h-4 w-4 text-primary-foreground" />
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                      </label>
                    </div>
                    <div>
                      <p className="font-medium">Profile Picture</p>
                      <p className="text-sm text-muted-foreground">
                        Upload a photo to personalize your profile
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={profile.displayName}
                        onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profile.username}
                        onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      className="w-full min-h-[100px] px-3 py-2 border rounded-md bg-background"
                      value={profile.bio}
                      onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={profile.website}
                        onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter</Label>
                      <Input
                        id="twitter"
                        value={profile.twitter}
                        onChange={(e) => setProfile(prev => ({ ...prev, twitter: e.target.value }))}
                        placeholder="@username"
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your email and account preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      />
                      {profile.emailVerified ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <Check className="h-4 w-4" />
                          <span className="text-sm">Verified</span>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm">
                          Verify
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      value={profile.language}
                      onChange={(e) => setProfile(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={profile.timezone}
                      onChange={(e) => setProfile(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="America/New_York">Eastern Time (US)</option>
                      <option value="America/Chicago">Central Time (US)</option>
                      <option value="America/Denver">Mountain Time (US)</option>
                      <option value="America/Los_Angeles">Pacific Time (US)</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>

                  <Button>Save Changes</Button>
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions for your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Export Data</p>
                      <p className="text-sm text-muted-foreground">
                        Download all your data in JSON format
                      </p>
                    </div>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all data
                      </p>
                    </div>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    Manage your subscription and billing details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 border rounded-lg bg-primary/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Solo Author</p>
                          <p className="text-sm text-muted-foreground">$15/month</p>
                        </div>
                      </div>
                      <Button variant="outline">
                        Change Plan
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>10 projects</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Unlimited AI prompts</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Full export capabilities</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Available Plans</h4>
                    <div className="grid gap-4">
                      {plans.map(plan => (
                        <div
                          key={plan.id}
                          className={`p-4 border rounded-lg ${
                            profile.plan === plan.id ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full bg-${plan.color.replace('text-', '')}/10 flex items-center justify-center`}>
                                <plan.icon className={`h-5 w-5 ${plan.color}`} />
                              </div>
                              <div>
                                <p className="font-medium">{plan.name}</p>
                                <p className="text-sm text-muted-foreground">{plan.price}</p>
                              </div>
                            </div>
                            {profile.plan === plan.id ? (
                              <span className="text-sm text-primary">Current Plan</span>
                            ) : (
                              <Button variant="outline" size="sm">
                                {plan.price === 'Free' ? 'Downgrade' : 'Upgrade'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <div className="p-3 border rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5" />
                        <div>
                          <p className="font-medium">•••• •••• •••• 4242</p>
                          <p className="text-xs text-muted-foreground">Expires 12/25</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Update
                      </Button>
                    </div>
                  </div>

                  <Button variant="outline">
                    View Billing History
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Email Notifications</h4>
                  
                  {Object.entries({
                    emailNotifications: 'Email notifications',
                    projectUpdates: 'Project updates and milestones',
                    weeklyReports: 'Weekly writing reports',
                    aiSuggestions: 'AI writing suggestions',
                    collaborationInvites: 'Collaboration invitations',
                    marketingEmails: 'Marketing and promotional emails'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                      </div>
                      <button
                        onClick={() => setNotifications(prev => ({ 
                          ...prev, 
                          [key]: !prev[key as keyof NotificationSettings] 
                        }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          notifications[key as keyof NotificationSettings] 
                            ? 'bg-primary' 
                            : 'bg-gray-200'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          notifications[key as keyof NotificationSettings] 
                            ? 'translate-x-6' 
                            : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Push Notifications</h4>
                  
                  {Object.entries({
                    browserNotifications: 'Browser notifications',
                    mobileNotifications: 'Mobile app notifications'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                      </div>
                      <button
                        onClick={() => setNotifications(prev => ({ 
                          ...prev, 
                          [key]: !prev[key as keyof NotificationSettings] 
                        }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          notifications[key as keyof NotificationSettings] 
                            ? 'bg-primary' 
                            : 'bg-gray-200'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          notifications[key as keyof NotificationSettings] 
                            ? 'translate-x-6' 
                            : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>

                <Button>Save Preferences</Button>
              </CardContent>
            </Card>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <Card>
              <CardHeader>
                <CardTitle>App Preferences</CardTitle>
                <CardDescription>
                  Customize your app experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', icon: Sun, label: 'Light' },
                      { value: 'dark', icon: Moon, label: 'Dark' },
                      { value: 'system', icon: Monitor, label: 'System' }
                    ].map(theme => (
                      <button
                        key={theme.value}
                        onClick={() => setProfile(prev => ({ ...prev, theme: theme.value as any }))}
                        className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${
                          profile.theme === theme.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <theme.icon className="h-6 w-6" />
                        <span className="text-sm">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Editor Font Size</Label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra-large">Extra Large</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Editor Font Family</Label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background">
                    <option value="georgia">Georgia (Serif)</option>
                    <option value="arial">Arial (Sans-serif)</option>
                    <option value="courier">Courier (Monospace)</option>
                    <option value="times">Times New Roman</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Auto-save Interval</Label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background">
                    <option value="1">Every minute</option>
                    <option value="5">Every 5 minutes</option>
                    <option value="10">Every 10 minutes</option>
                    <option value="0">Disabled</option>
                  </select>
                </div>

                <Button>Save Preferences</Button>
              </CardContent>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Password</p>
                          <p className="text-sm text-muted-foreground">
                            Last changed 30 days ago
                          </p>
                        </div>
                      </div>
                      <Button variant="outline">
                        Change Password
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-muted-foreground">
                            {profile.twoFactorEnabled 
                              ? 'Enabled - Extra security for your account' 
                              : 'Add an extra layer of security'}
                          </p>
                        </div>
                      </div>
                      <Button variant={profile.twoFactorEnabled ? 'outline' : 'default'}>
                        {profile.twoFactorEnabled ? 'Manage' : 'Enable'}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5" />
                        <div>
                          <p className="font-medium">API Keys</p>
                          <p className="text-sm text-muted-foreground">
                            Manage API access to your account
                          </p>
                        </div>
                      </div>
                      <Button variant="outline">
                        Manage Keys
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Active Sessions</h4>
                    <div className="space-y-2">
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Monitor className="h-4 w-4" />
                            <div>
                              <p className="font-medium text-sm">Chrome on Windows</p>
                              <p className="text-xs text-muted-foreground">
                                New York, USA • Current session
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-green-600">Active now</span>
                        </div>
                      </div>
                      
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Smartphone className="h-4 w-4" />
                            <div>
                              <p className="font-medium text-sm">Mobile App on iOS</p>
                              <p className="text-xs text-muted-foreground">
                                New York, USA • Last active 2 hours ago
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <LogOut className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" className="w-full">
                      Sign Out All Other Sessions
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Privacy</CardTitle>
                  <CardDescription>
                    Control your privacy settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Profile Visibility</p>
                      <p className="text-xs text-muted-foreground">
                        Make your profile visible to other users
                      </p>
                    </div>
                    <button className="w-12 h-6 rounded-full bg-primary">
                      <div className="w-5 h-5 bg-white rounded-full translate-x-6" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Show Activity Status</p>
                      <p className="text-xs text-muted-foreground">
                        Let others see when you're online
                      </p>
                    </div>
                    <button className="w-12 h-6 rounded-full bg-gray-200">
                      <div className="w-5 h-5 bg-white rounded-full translate-x-0.5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Analytics Tracking</p>
                      <p className="text-xs text-muted-foreground">
                        Help us improve by sharing usage data
                      </p>
                    </div>
                    <button className="w-12 h-6 rounded-full bg-primary">
                      <div className="w-5 h-5 bg-white rounded-full translate-x-6" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}