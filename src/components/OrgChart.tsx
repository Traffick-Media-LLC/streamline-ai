
import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
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

  // Create nodes from employees
  const initialNodes = employees.map((emp) => ({
    id: emp.id,
    type: 'default',
    position: { x: 0, y: 0 }, // Initial position, will be arranged by layout
    data: {
      label: (
        <div 
          className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 cursor-pointer w-48"
          onClick={() => setSelectedEmployee(emp)}
        >
          <div className="font-semibold">{`${emp.first_name} ${emp.last_name}`}</div>
          <div className="text-sm text-gray-600">{emp.title}</div>
        </div>
      ),
    },
  }));

  // Create edges from manager relationships
  const initialEdges = employees
    .filter((emp) => emp.manager_id)
    .map((emp) => ({
      id: `${emp.manager_id}-${emp.id}`,
      source: emp.manager_id!,
      target: emp.id,
      type: 'smoothstep',
    }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: any) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Arrange nodes in a tree layout
  useEffect(() => {
    const layoutNodes = nodes.map((node, index) => ({
      ...node,
      position: { x: (index % 3) * 250, y: Math.floor(index / 3) * 150 },
    }));
    setNodes(layoutNodes);
  }, [setNodes]);

  return (
    <div className="h-[600px] border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
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
