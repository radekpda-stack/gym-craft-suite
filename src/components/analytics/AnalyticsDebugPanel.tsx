/**
 * Analytics Debug Panel
 * 
 * Admin-only panel for debugging analytics.
 * Shows recent events, queue status, and session info.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bug, 
  Download, 
  Trash2, 
  Send, 
  RefreshCw,
  Activity,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { debug, track } from '@/lib/analytics';
import { sessionManager } from '@/lib/analytics/SessionManager';
import { getDedupCacheSize, getDedupCacheContents } from '@/lib/analytics/core/dedup';
import { cn } from '@/lib/utils';

interface AnalyticsDebugPanelProps {
  className?: string;
}

export function AnalyticsDebugPanel({ className }: AnalyticsDebugPanelProps) {
  const [isEnabled, setIsEnabled] = useState(debug.isEnabled());
  const [events, setEvents] = useState(debug.getLog());
  const [queueStatus, setQueueStatus] = useState(debug.getQueueStatus());
  const [dedupSize, setDedupSize] = useState(getDedupCacheSize());
  const [currentPage, setCurrentPage] = useState(debug.getCurrentPage());
  const [pageState, setPageState] = useState(debug.getPageState());
  
  // Refresh data
  const refresh = () => {
    setEvents(debug.getLog());
    setQueueStatus(debug.getQueueStatus());
    setDedupSize(getDedupCacheSize());
    setCurrentPage(debug.getCurrentPage());
    setPageState(debug.getPageState());
  };
  
  // Auto-refresh when enabled
  useEffect(() => {
    if (!isEnabled) return;
    
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [isEnabled]);
  
  // Toggle debug mode
  const handleToggle = (enabled: boolean) => {
    debug.setEnabled(enabled);
    setIsEnabled(enabled);
    if (enabled) refresh();
  };
  
  // Send test event
  const sendTestEvent = () => {
    track('debug_test_event', 'system', {
      metadata: { test: true, timestamp: new Date().toISOString() }
    });
    setTimeout(refresh, 100);
  };
  
  // Export events
  const exportEvents = () => {
    const data = {
      events: debug.getLog(),
      queueStatus: debug.getQueueStatus(),
      dedupCache: getDedupCacheContents(),
      sessionId: sessionManager.getSessionId(),
      currentPage: debug.getCurrentPage(),
      pageState: debug.getPageState(),
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Clear events
  const clearEvents = () => {
    debug.clearLog();
    refresh();
  };
  
  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="h-4 w-4" />
            Analytics Debug
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Debug Mode</span>
            <Switch checked={isEnabled} onCheckedChange={handleToggle} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Bar */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            Session: {sessionManager.getSessionId()?.slice(0, 8) || 'none'}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Page: {currentPage || 'unknown'}
          </Badge>
          <Badge variant={queueStatus.size > 0 ? 'default' : 'secondary'} className="gap-1">
            {queueStatus.isProcessing ? (
              <Wifi className="h-3 w-3 animate-pulse" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            Queue: {queueStatus.size}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            Dedup: {dedupSize}
          </Badge>
        </div>
        
        {/* Active Time Stats */}
        {pageState && (
          <div className="p-2 bg-muted/50 rounded-md text-xs font-mono space-y-1">
            <div className="flex justify-between">
              <span>Active Time:</span>
              <span>{Math.round(pageState.activeTime / 1000)}s</span>
            </div>
            <div className="flex justify-between">
              <span>Total Time:</span>
              <span>{Math.round((Date.now() - pageState.startTime) / 1000)}s</span>
            </div>
            <div className="flex justify-between">
              <span>Interruptions:</span>
              <span>{pageState.visibilityInterruptions}</span>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={refresh}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={sendTestEvent}>
            <Send className="h-3 w-3 mr-1" />
            Test Event
          </Button>
          <Button size="sm" variant="outline" onClick={exportEvents}>
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button size="sm" variant="outline" onClick={clearEvents}>
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
        
        {/* Event Log */}
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="events" className="flex-1">
              Events ({events.length})
            </TabsTrigger>
            <TabsTrigger value="dedup" className="flex-1">
              Dedup Cache
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="events">
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-2 space-y-1">
                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No events captured. Enable debug mode and interact with the app.
                  </p>
                ) : (
                  events.map((event, i) => (
                    <div 
                      key={event.event_id} 
                      className={cn(
                        "p-2 rounded text-xs font-mono",
                        event.success === false 
                          ? "bg-destructive/10 border border-destructive/30" 
                          : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{event.event_name}</span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {event.category}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground space-y-0.5">
                        <div>ID: {event.event_id.slice(0, 8)}</div>
                        {event.duration_ms && (
                          <div>Duration: {event.duration_ms}ms</div>
                        )}
                        {event.active_duration_ms && (
                          <div>Active: {event.active_duration_ms}ms</div>
                        )}
                        {event.error_message && (
                          <div className="text-destructive">
                            Error: {event.error_message}
                          </div>
                        )}
                        <div className="text-[10px]">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="dedup">
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-2 space-y-1">
                {getDedupCacheContents().map(({ key, entry }) => (
                  <div key={key} className="p-2 bg-muted/50 rounded text-xs font-mono">
                    <div className="truncate">{key}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {new Date(entry.timestamp).toLocaleTimeString()} - {entry.eventId.slice(0, 8)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
