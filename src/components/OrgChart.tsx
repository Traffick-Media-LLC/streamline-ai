
import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Employee } from '@/hooks/useEmployeesData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useState } from 'react';

interface OrgChartProps {
  employees: Employee[];
}

const OrgChart = ({ employees }: OrgChartProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Create a map of employees for efficient lookup
  const employeeMap = new Map(employees.map(emp => [emp.id, emp]));

  // Get all direct reports for an employee
  const getDirectReports = (managerId: string) => {
    return employees.filter(emp => emp.manager_id === managerId);
  };

  // Calculate depth for each employee (distance from CEO)
  const getEmployeeDepth = (employee: Employee): number => {
    let depth = 0;
    let current = employee;
    while (current.manager_id && employeeMap.get(current.manager_id)) {
      depth++;
      current = employeeMap.get(current.manager_id)!;
    }
    return depth;
  };

  // Find the CEO (employee without manager)
  const ceo = employees.find(emp => !emp.manager_id && emp.title === 'CEO');
  
  // Create nodes with hierarchical positioning
  const initialNodes = employees.map((emp) => {
    const depth = getEmployeeDepth(emp);
    const directReports = getDirectReports(emp.id);
    const isLegal = emp.department === 'Legal';
    
    return {
      id: emp.id,
      type: 'default',
      position: { x: 0, y: 0 }, // Initial position, will be arranged by layout
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

  // Create edges with different styles based on relationship
  const initialEdges = employees
    .filter((emp) => emp.manager_id)
    .map((emp) => ({
      id: `${emp.manager_id}-${emp.id}`,
      source: emp.manager_id!,
      target: emp.id,
      type: emp.department === 'Legal' ? 'step' : 'smoothstep',
      style: emp.department === 'Legal' ? { strokeDasharray: '5,5' } : {},
      animated: emp.department === 'Legal',
    }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: any) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Arrange nodes in a hierarchical layout
  useEffect(() => {
    if (!ceo) return;

    const layoutNodes = [...nodes];
    const levelWidth = 300;
    const levelHeight = 150;
    
    // Position nodes based on their depth and number of siblings
    employees.forEach((emp) => {
      const node = layoutNodes.find(n => n.id === emp.id);
      if (!node) return;

      const depth = getEmployeeDepth(emp);
      const siblings = employees.filter(e => 
        e.manager_id === emp.manager_id
      );
      const siblingIndex = siblings.findIndex(s => s.id === emp.id);
      const totalSiblings = siblings.length;
      
      // Calculate x position based on siblings
      const xOffset = (siblingIndex - (totalSiblings - 1) / 2) * levelWidth;
      
      node.position = {
        x: xOffset,
        y: depth * levelHeight
      };
    });

    setNodes(layoutNodes);
  }, [employees, setNodes, nodes, ceo]);

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
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={node => {
            const emp = employeeMap.get(node.id as string);
            return emp?.department === 'Legal' ? '#CBD5E1' : '#94A3B8';
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
            <div>
              <div className="font-semibold">Title</div>
              <div>{selectedEmployee?.title}</div>
            </div>
            <div>
              <div className="font-semibold">Department</div>
              <div>{selectedEmployee?.department}</div>
            </div>
            <div>
              <div className="font-semibold">Reports To</div>
              <div>
                {selectedEmployee?.manager_id 
                  ? `${employeeMap.get(selectedEmployee.manager_id)?.first_name} ${employeeMap.get(selectedEmployee.manager_id)?.last_name}`
                  : 'No Manager'}
              </div>
            </div>
            <div>
              <div className="font-semibold">Contact</div>
              <div>{selectedEmployee?.email}</div>
              {selectedEmployee?.phone && <div>{selectedEmployee.phone}</div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrgChart;
