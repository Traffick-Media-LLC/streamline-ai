
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
  console.log('OrgChart rendering with employees:', employees);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'hierarchical' | 'flat'>('hierarchical');

  // Create a map of employees for efficient lookup
  const employeeMap = useMemo(() => {
    console.log('Creating employee map...');
    return new Map(employees.map(emp => [emp.id, emp]));
  }, [employees]);

  // Find the CEO or organization leader (employee without manager or with CEO title)
  const ceo = useMemo(() => {
    console.log('Finding CEO or org leader...');
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

  // Create nodes with positioning based on layout mode
  const initialNodes = useMemo(() => {
    console.log('Creating nodes with layout mode:', layoutMode);
    if (!employees.length) {
      console.log('No employees data available');
      setError('No employee data available');
      return [];
    }

    try {
      return employees.map((emp) => {
        const isLegal = emp.department.toLowerCase().includes('legal');
        
        return {
          id: emp.id,
          type: 'default',
          position: { x: 0, y: 0 }, // Position will be set by layout function
          data: {
            label: (
              <div 
                className={`p-3 rounded-lg shadow-sm border ${
                  isLegal ? 'border-dashed border-gray-400' : 'border-gray-200'
                } cursor-pointer w-60 bg-white`}
                onClick={() => setSelectedEmployee(emp)}
              >
                <div className="font-semibold">{`${emp.first_name} ${emp.last_name}`}</div>
                <div className="text-sm text-gray-600">{emp.title}</div>
                <div className="text-xs text-gray-500">{emp.department}</div>
              </div>
            ),
          },
          style: {
            opacity: isLegal ? 0.8 : 1,
          },
        };
      });
    } catch (err) {
      console.error('Error creating nodes:', err);
      setError('Error creating organization chart');
      return [];
    }
  }, [employees, layoutMode]);

  // Create edges - only if we're in hierarchical mode
  const initialEdges = useMemo(() => {
    console.log('Creating edges for layout mode:', layoutMode);
    if (layoutMode === 'flat') {
      return []; // No edges in flat layout
    }
    
    try {
      return employees
        .filter((emp) => emp.manager_id)
        .map((emp) => {
          const isLegal = emp.department.toLowerCase().includes('legal');
          return {
            id: `${emp.manager_id}-${emp.id}`,
            source: emp.manager_id!,
            target: emp.id,
            type: isLegal ? 'step' : 'smoothstep',
            style: isLegal ? { strokeDasharray: '5,5' } : {},
            animated: isLegal,
          };
        });
    } catch (err) {
      console.error('Error creating edges:', err);
      setError('Error creating organizational relationships');
      return [];
    }
  }, [employees, layoutMode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Get employee depth (distance from CEO)
  const getEmployeeDepth = (employee: Employee, empMap: Map<string, Employee>): number => {
    let depth = 0;
    let current = employee;
    
    // Maximum depth check to prevent infinite loops if there's circular references
    const maxDepth = 10;
    
    while (current.manager_id && empMap.get(current.manager_id) && depth < maxDepth) {
      depth++;
      current = empMap.get(current.manager_id)!;
    }
    return depth;
  };

  // Arrange nodes in layout based on mode
  useEffect(() => {
    console.log('Arranging nodes in layout mode:', layoutMode);
    if (nodes.length === 0) {
      console.log('No nodes to arrange');
      return;
    }

    try {
      const layoutNodes = [...nodes];
      
      if (layoutMode === 'hierarchical') {
        // Hierarchical layout
        const levelWidth = 250;
        const levelHeight = 150;
        
        employees.forEach((emp) => {
          const node = layoutNodes.find(n => n.id === emp.id);
          if (!node) {
            console.warn(`Node not found for employee: ${emp.id}`);
            return;
          }

          const depth = getEmployeeDepth(emp, employeeMap);
          const siblings = employees.filter(e => e.manager_id === emp.manager_id);
          const siblingIndex = siblings.findIndex(s => s.id === emp.id);
          const totalSiblings = siblings.length;
          
          const xOffset = (siblingIndex - (totalSiblings - 1) / 2) * levelWidth;
          
          node.position = {
            x: xOffset,
            y: depth * levelHeight
          };
        });
      } else {
        // Flat layout - grid arrangement
        const itemsPerRow = Math.ceil(Math.sqrt(employees.length));
        const cellWidth = 300;
        const cellHeight = 150;
        
        employees.forEach((emp, index) => {
          const node = layoutNodes.find(n => n.id === emp.id);
          if (!node) return;
          
          const row = Math.floor(index / itemsPerRow);
          const col = index % itemsPerRow;
          
          node.position = {
            x: col * cellWidth - (itemsPerRow * cellWidth / 2) + cellWidth / 2,
            y: row * cellHeight
          };
        });
      }

      console.log('Node layout complete');
      setNodes(layoutNodes);
    } catch (error) {
      console.error("Error arranging nodes:", error);
      setError('Error arranging organization chart');
    }
  }, [employees, employeeMap, layoutMode, nodes, setNodes]);

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
            return emp?.department.toLowerCase().includes('legal') ? '#CBD5E1' : '#94A3B8';
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
