'use client';

import React, { useState, useEffect } from 'react';
import { useCollaboration } from './collaboration-provider';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  Users, 
  Wifi, 
  WifiOff, 
  Copy, 
  Share2, 
  Settings,
  Crown,
  Clock,
  Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CollaborationPanelProps {
  roomId: string;
  onInvite?: () => void;
  onSettings?: () => void;
  className?: string;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  roomId,
  onInvite,
  onSettings,
  className,
}) => {
  const { 
    isConnected, 
    collaborators, 
    currentUser, 
    joinRoom, 
    leaveRoom 
  } = useCollaboration();
  
  const [showDetails, setShowDetails] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  // Generate invite URL
  useEffect(() => {
    const baseUrl = window.location.origin;
    setInviteUrl(`${baseUrl}/collaborate/${roomId}`);
  }, [roomId]);

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy invite URL:', error);
    }
  };

  const activeCollaborators = collaborators.filter(c => c.isActive);
  const inactiveCollaborators = collaborators.filter(c => !c.isActive);

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Collaboration</h3>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
          {onSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettings}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Collaborators */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            Active ({activeCollaborators.length})
          </span>
          {onInvite && (
            <Button
              variant="outline"
              size="sm"
              onClick={onInvite}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Invite
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          {activeCollaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={collaborator.avatar} />
                  <AvatarFallback 
                    className="text-xs"
                    style={{ backgroundColor: collaborator.color }}
                  >
                    {collaborator.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: collaborator.color }}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {collaborator.name}
                  </span>
                  {collaborator.id === currentUser?.id && (
                    <Badge variant="secondary" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {collaborator.email}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: collaborator.color }}
                />
                <span className="text-xs text-gray-500">Online</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inactive Collaborators */}
      {inactiveCollaborators.length > 0 && showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-600">
            Recently Active ({inactiveCollaborators.length})
          </span>
          
          <div className="mt-2 space-y-2">
            {inactiveCollaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 opacity-60"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={collaborator.avatar} />
                  <AvatarFallback 
                    className="text-xs"
                    style={{ backgroundColor: collaborator.color }}
                  >
                    {collaborator.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {collaborator.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {new Date(collaborator.lastSeen).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Section */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-600">Invite Link</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyInvite}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Room Info */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-600">Room Info</span>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Room ID: {roomId}</div>
              <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
              <div>Active Users: {activeCollaborators.length}</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};