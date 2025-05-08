
import React from 'react';
import { Bug } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StatePermissionsDebugPanelProps {
  debugLogs?: Array<{ level: string, message: string, data?: any }>;
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;
}

export const StatePermissionsDebugPanel: React.FC<StatePermissionsDebugPanelProps> = ({
  debugLogs = [],
  showDebug,
  setShowDebug
}) => {
  if (!showDebug) {
    return null;
  }

  return (
    <Collapsible className="mb-6 border rounded-md p-2">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer p-2">
          <h3 className="text-sm font-semibold flex items-center">
            <Bug className="h-4 w-4 mr-2" /> Debug Information
          </h3>
          <span className="text-xs text-muted-foreground">
            {debugLogs?.length || 0} entries
          </span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 p-2 text-xs font-mono">
            {debugLogs?.length ? (
              debugLogs.map((log, i) => (
                <div 
                  key={i} 
                  className={`p-2 rounded ${
                    log.level === 'error' ? 'bg-red-50 text-red-800' : 
                    log.level === 'warning' ? 'bg-yellow-50 text-yellow-800' : 
                    log.level === 'success' ? 'bg-green-50 text-green-800' : 
                    'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-bold">[{log.level.toUpperCase()}]</span>
                    <span>{new Date().toISOString()}</span>
                  </div>
                  <div className="mt-1">{log.message}</div>
                  {log.data && (
                    <div className="mt-1 overflow-x-auto">
                      <pre>{JSON.stringify(log.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-2 text-center text-muted-foreground">No logs available</div>
            )}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
};
