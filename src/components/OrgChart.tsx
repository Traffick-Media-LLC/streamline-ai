import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Employee } from '@/hooks/useEmployeesData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Briefcase, Mail, Phone, User } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrgChartProps {
  employees: Employee[];
}

const OrgChart = ({ employees }: OrgChartProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'hierarchical' | 'flat'>('hierarchical');

  // Create a map of employees for efficient lookup
  const employeeMap = useMemo(() => {
    return new Map(employees.map(emp => [emp.id, emp]));
  }, [employees]);

  // Get employee level (distance from CEO)
  const getEmployeeLevel = (employee: Employee, visited = new Set<string>()): number => {
    if (!employee.manager_id) return 0;
    if (visited.has(employee.id)) return 0; // Prevent circular references
    
    visited.add(employee.id);
    const manager = employeeMap.get(employee.manager_id);
    if (!manager) return 0;
    
    return 1 + getEmployeeLevel(manager, visited);
  };

  // Find the CEO or organization leader
  const ceo = useMemo(() => {
    try {
      // First try to find an employee with CEO title and no manager
      let foundCeo = employees.find(emp => 
        !emp.manager_id && 
        emp.title.toLowerCase().includes('ceo')
      );
      
      // If not found, try just CEO title
      if (!foundCeo) {
        foundCeo = employees.find(emp => 
          emp.title.toLowerCase().includes('ceo') || 
          emp.title.toLowerCase().includes('chief executive')
        );
      }
      
      // If still not found, try any C-level executive
      if (!foundCeo) {
        foundCeo = employees.find(emp => 
          emp.title.toLowerCase().includes('chief') ||
          emp.title.toLowerCase().includes('coo') ||
          emp.title.toLowerCase().includes('cfo') ||
          emp.title.toLowerCase().includes('cto')
        );
      }
      
      // If still not found, take the first employee without a manager
      if (!foundCeo) {
        foundCeo = employees.find(emp => !emp.manager_id);
      }
      
      // Last resort: just take the first employee
      if (!foundCeo && employees.length > 0) {
        console.log('No clear leader found, using first employee as root');
        foundCeo = employees[0];
      }

      if (!foundCeo) {
        console.error('No employees found in employee data');
        setError('No employee data available for organization chart');
        return null;
      }
      
      console.log('Organization leader found:', foundCeo);
      return foundCeo;
    } catch (err) {
      console.error('Error finding organization leader:', err);
      setError('Error processing organization structure');
      return null;
    }
  }, [employees]);

  // Detect if we have a proper hierarchy
  const hasHierarchy = useMemo(() => {
    if (employees.length < 2) return false;
    // Check if at least some employees have manager_id set
    return employees.some(emp => emp.manager_id !== null);
  }, [employees]);

  // Switch to flat layout if no hierarchy detected
  useEffect(() => {
    if (!hasHierarchy && employees.length > 1) {
      setLayoutMode('flat');
      console.log('No hierarchy detected, switching to flat layout');
      toast.info("No clear reporting structure found", {
        description: "Displaying employees in a flat layout"
      });
    } else {
      setLayoutMode('hierarchical');
    }
  }, [hasHierarchy, employees]);

  // Create nodes with positioning based on layout mode and hierarchy
  const initialNodes = useMemo(() => {
    if (!employees.length) {
      setError('No employee data available');
      return [];
    }

    try {
      const levelHeight = 200; // Increased vertical spacing
      const levelWidth = 250;
      
      return employees.map((emp) => {
        const level = getEmployeeLevel(emp);
        const isLegal = emp.department.toLowerCase().includes('legal');
        const isCsuite = !emp.manager_id || 
                        emp.title.toLowerCase().includes('ceo') || 
                        emp.title.toLowerCase().includes('coo') || 
                        emp.title.toLowerCase().includes('cfo') || 
                        emp.title.toLowerCase().includes('cto');
        const isChuck = emp.first_name === 'Chuck' && emp.last_name === 'Melander';
        const isDirector = emp.title.toLowerCase().includes('director') || 
                          emp.title.toLowerCase().includes('vp');

        // Calculate siblings at the same level with the same manager
        const siblings = employees.filter(e => 
          e.manager_id === emp.manager_id && 
          getEmployeeLevel(e) === level
        );
        const siblingIndex = siblings.findIndex(s => s.id === emp.id);
        const siblingCount = siblings.length;
        
        // Calculate x position based on siblings
        const xOffset = (siblingIndex - (siblingCount - 1) / 2) * levelWidth;
        
        // Style based on role
        let nodeStyle = {
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
        };

        if (isCsuite) {
          nodeStyle = {
            ...nodeStyle,
            background: '#9b87f5',
            border: '2px solid #1A1F2C',
            color: '#ffffff',
            minWidth: '280px',
            minHeight: '100px',
          };
        } else if (isChuck) {
          nodeStyle = {
            ...nodeStyle,
            background: '#7E69AB',
            border: '2px solid #1A1F2C',
            color: '#ffffff',
            minWidth: '260px',
            minHeight: '90px',
          };
        } else if (isDirector) {
          nodeStyle = {
            ...nodeStyle,
            background: '#6E59A5',
            color: '#ffffff',
            minWidth: '240px',
            minHeight: '80px',
          };
        } else if (isLegal) {
          nodeStyle = {
            ...nodeStyle,
            background: '#F1F0FB',
            border: '2px dashed #8E9196',
            color: '#1A1F2C',
          };
        }

        return {
          id: emp.id,
          type: 'default',
          position: { 
            x: xOffset,
            y: level * levelHeight
          },
          data: {
            label: (
              <div 
                className="cursor-pointer w-full"
                onClick={() => setSelectedEmployee(emp)}
              >
                <div className="font-semibold">{`${emp.first_name} ${emp.last_name}`}</div>
                <div className="text-sm">{emp.title}</div>
                <div className="text-xs opacity-75">{emp.department}</div>
              </div>
            ),
          },
          style: nodeStyle,
        };
      });
    } catch (err) {
      console.error('Error creating nodes:', err);
      setError('Error creating organization chart');
      return [];
    }
  }, [employees, employeeMap]);

  // Create edges with styling based on hierarchy
  const initialEdges = useMemo(() => {
    if (layoutMode === 'flat') return [];
    
    try {
      return employees
        .filter((emp) => emp.manager_id)
        .map((emp) => {
          const isLegal = emp.department.toLowerCase().includes('legal');
          const isCsuiteReport = employeeMap.get(emp.manager_id!)?.manager_id === null;
          
          return {
            id: `${emp.manager_id}-${emp.id}`,
            source: emp.manager_id!,
            target: emp.id,
            type: isLegal ? 'step' : 'smoothstep',
            animated: isLegal,
            style: {
              strokeWidth: isCsuiteReport ? 2 : 1,
              stroke: isLegal ? '#8E9196' : '#6E59A5',
              strokeDasharray: isLegal ? '5,5' : null,
            },
          };
        });
    } catch (err) {
      console.error('Error creating edges:', err);
      setError('Error creating organizational relationships');
      return [];
    }
  }, [employees, layoutMode, employeeMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  if (error) {
    return (
      <div className="p-4 border rounded-lg">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-2">
          <Button 
            onClick={() => setError(null)} 
            variant="outline"
          >
            Retry
          </Button>
          {layoutMode === 'hierarchical' && (
            <Button 
              onClick={() => {
                setLayoutMode('flat');
                setError(null);
              }}
            >
              Try Flat Layout
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!employees.length) {
    return (
      <div className="p-4 border rounded-lg">
        <Alert>
          <AlertTitle>No Data</AlertTitle>
          <AlertDescription>No employee data available to display.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-[600px] border rounded-lg">
      <div className="absolute top-2 right-2 z-10 bg-white border rounded-md shadow-sm p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLayoutMode(layoutMode === 'hierarchical' ? 'flat' : 'hierarchical')}
        >
          {layoutMode === 'hierarchical' ? 'Switch to Flat View' : 'Switch to Hierarchy View'}
        </Button>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={false}
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={node => {
            const emp = employeeMap.get(node.id as string);
            if (!emp) return '#94A3B8';
            if (!emp.manager_id) return '#9b87f5';
            if (emp.department.toLowerCase().includes('legal')) return '#8E9196';
            if (emp.title.toLowerCase().includes('director') || 
                emp.title.toLowerCase().includes('vp')) {
              return '#6E59A5';
            }
            return '#D3E4FD';
          }}
        />
      </ReactFlow>

      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee?.first_name} {selectedEmployee?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-gray-500" />
              <div>
                <div className="font-semibold">Title</div>
                <div>{selectedEmployee?.title}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <div className="font-semibold">Department</div>
                <div>{selectedEmployee?.department}</div>
              </div>
            </div>
            <div>
              <div className="font-semibold">Reports To</div>
              <div>
                {selectedEmployee?.manager_id 
                  ? `${employeeMap.get(selectedEmployee.manager_id)?.first_name || ''} ${employeeMap.get(selectedEmployee.manager_id)?.last_name || ''}`
                  : 'No Manager'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <div>
                <div className="font-semibold">Contact</div>
                <div>{selectedEmployee?.email}</div>
              </div>
            </div>
            {selectedEmployee?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>{selectedEmployee.phone}</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrgChart;
