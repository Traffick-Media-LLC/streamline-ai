import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
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

  // Create a map of employees for efficient lookup
  const employeeMap = useMemo(() => {
    console.log('Creating employee map...');
    return new Map(employees.map(emp => [emp.id, emp]));
  }, [employees]);

  // Find the CEO (employee without manager)
  const ceo = useMemo(() => {
    console.log('Finding CEO...');
    try {
      const foundCeo = employees.find(emp => !emp.manager_id && emp.title.toLowerCase().includes('ceo'));
      if (!foundCeo) {
        console.error('No CEO found in employee data');
        setError('Organization structure error: Could not find CEO');
        return null;
      }
      console.log('CEO found:', foundCeo);
      return foundCeo;
    } catch (err) {
      console.error('Error finding CEO:', err);
      setError('Error processing organization structure');
      return null;
    }
  }, [employees]);

  // Create nodes with hierarchical positioning
  const initialNodes = useMemo(() => {
    console.log('Creating nodes...');
    if (!employees.length) {
      console.log('No employees data available');
      setError('No employee data available');
      return [];
    }

    try {
      return employees.map((emp) => {
        const depth = getEmployeeDepth(emp, employeeMap);
        const isLegal = emp.department.toLowerCase().includes('legal');
        
        return {
          id: emp.id,
          type: 'default',
          position: { x: 0, y: 0 },
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
  }, [employees, employeeMap]);

  // Create edges
  const initialEdges = useMemo(() => {
    console.log('Creating edges...');
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
      setError('Error creating organization relationships');
      return [];
    }
  }, [employees]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: any) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Get employee depth (distance from CEO)
  const getEmployeeDepth = (employee: Employee, empMap: Map<string, Employee>): number => {
    let depth = 0;
    let current = employee;
    while (current.manager_id && empMap.get(current.manager_id)) {
      depth++;
      current = empMap.get(current.manager_id)!;
    }
    return depth;
  };

  // Arrange nodes in a hierarchical layout
  useEffect(() => {
    console.log('Arranging nodes...');
    if (!ceo || nodes.length === 0) {
      console.log('Missing CEO or nodes, skipping layout');
      return;
    }

    const layoutNodes = [...nodes];
    const levelWidth = 250;
    const levelHeight = 150;
    
    try {
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

      console.log('Node layout complete');
      setNodes(layoutNodes);
    } catch (error) {
      console.error("Error arranging nodes:", error);
      setError('Error arranging organization chart');
    }
  }, [ceo, employees, employeeMap, nodes, setNodes]);

  if (error) {
    return (
      <div className="p-4 border rounded-lg">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => setError(null)} 
          variant="outline" 
          className="mt-4"
        >
          Retry
        </Button>
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
