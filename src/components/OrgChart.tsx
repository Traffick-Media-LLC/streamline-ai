import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  Connection,
  OnNodesChange,
  XYPosition,
  useReactFlow,
  NodeMouseHandler,
  NodeProps,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Employee } from '@/hooks/useEmployeesData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Briefcase, Mail, Phone, User } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmployeeContextMenu from './admin/EmployeeContextMenu';
import EmployeeFormDialog from './admin/EmployeeFormDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { useEmployeeOperations } from '@/hooks/useEmployeeOperations';

interface OrgChartProps {
  employees: Employee[];
  isAdmin?: boolean;
  editable?: boolean;
}

interface NodeData extends Record<string, unknown> {
  label: React.ReactNode;
  employee: Employee;
}

interface NodeStyle {
  background: string;
  border: string;
  borderRadius: string;
  padding: string;
  cursor: string;
  boxShadow?: string;
}

const OrgChartInner = ({ employees, isAdmin = false, editable = false }: OrgChartProps) => {
  const { updateEmployee, updateEmployeePosition } = useEmployeeOperations();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'hierarchical' | 'flat'>('hierarchical');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingDirectReportTo, setAddingDirectReportTo] = useState<string | null>(null);
  const reactFlowInstance = useReactFlow();
  const isInitialMount = useRef(true);
  const draggedNodeRef = useRef<Node<NodeData> | null>(null);
  const targetNodeRef = useRef<Node<NodeData> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const positionSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const employeeMap = useMemo(() => {
    return new Map(employees.map(emp => [emp.id, emp]));
  }, [employees]);

  const topLeadership = useMemo(() => {
    return employees.filter(emp => {
      const title = emp.title.toLowerCase();
      return title.includes('ceo') || 
             title.includes('coo') || 
             title.includes('cso') ||
             title === 'president' ||
             title === 'chief executive officer' ||
             title === 'chief operating officer' ||
             title === 'chief strategy officer';
    });
  }, [employees]);

  const getEmployeeLevel = useCallback((employee: Employee): number => {
    if (employee.first_name === 'Patrick' && employee.last_name === 'Mulcahy') {
      return 0;
    }
    
    if (employee.first_name === 'Matthew' && employee.last_name === 'Halvorson') {
      return 0;
    }
    
    if (employee.first_name === 'Chuck' && employee.last_name === 'Melander') {
      return 0;
    }
    
    const titleLevels: { [key: string]: number } = {
      'ceo': 0,
      'chief executive officer': 0,
      'coo': 0,
      'chief operating officer': 0,
      'cso': 0, 
      'chief strategy officer': 0,
      
      'vp': 1,
      'vice president': 1,
      'director': 1,
      
      'manager': 2,
      'lead': 2,
      'counsel': 2,
      
      'staff': 3,
      'accountant': 3,
      'analyst': 3,
      'coordinator': 3,
      'specialist': 3,
      'broker': 3,
      'executive': 3,
    };
    
    const titleLower = employee.title.toLowerCase();
    
    for (const [titleKey, level] of Object.entries(titleLevels)) {
      if (titleLower.includes(titleKey)) {
        return level;
      }
    }
    
    if (employee.manager_id === null) {
      return 0;
    }
    
    const manager = employeeMap.get(employee.manager_id);
    if (!manager) return 3;
    
    const managerLevel = getEmployeeLevel(manager);
    return managerLevel + 1;
  }, [employeeMap]);

  const topNodes = useMemo(() => {
    const patrick = employees.find(emp => 
      emp.first_name === 'Patrick' && 
      emp.last_name === 'Mulcahy' && 
      emp.title.toLowerCase().includes('ceo')
    );
    
    const matthew = employees.find(emp => 
      emp.first_name === 'Matthew' && 
      emp.last_name === 'Halvorson' && 
      emp.title.toLowerCase().includes('coo')
    );
    
    const chuck = employees.find(emp => 
      emp.first_name === 'Chuck' && 
      emp.last_name === 'Melander' && 
      emp.title.toLowerCase().includes('cso')
    );
    
    const topList = [];
    if (patrick) topList.push(patrick);
    if (matthew) topList.push(matthew);
    if (chuck) topList.push(chuck);
    
    if (topList.length === 0) {
      return employees.filter(emp => {
        const title = emp.title.toLowerCase();
        return title.includes('ceo') || 
               title.includes('coo') || 
               title.includes('cso') || 
               title === 'president' ||
               title === 'chief executive officer' ||
               title === 'chief operating officer' ||
               title === 'chief strategy officer';
      });
    }
    
    return topList;
  }, [employees]);

  const ceo = useMemo(() => {
    try {
      let foundCeo = employees.find(emp => 
        emp.first_name === 'Patrick' && 
        emp.last_name === 'Mulcahy' && 
        emp.title.toLowerCase().includes('ceo')
      );
      
      if (!foundCeo) {
        foundCeo = employees.find(emp => 
          !emp.manager_id && 
          emp.title.toLowerCase().includes('ceo')
        );
      }
      
      if (!foundCeo) {
        foundCeo = employees.find(emp => 
          emp.title.toLowerCase().includes('ceo') || 
          emp.title.toLowerCase().includes('chief executive')
        );
      }
      
      if (!foundCeo) {
        foundCeo = employees.find(emp => 
          emp.title.toLowerCase().includes('chief') ||
          emp.title.toLowerCase().includes('coo') ||
          emp.title.toLowerCase().includes('cfo') ||
          emp.title.toLowerCase().includes('cto') ||
          emp.title.toLowerCase().includes('cso')
        );
      }
      
      if (!foundCeo) {
        foundCeo = employees.find(emp => !emp.manager_id);
      }
      
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

  const hasHierarchy = useMemo(() => {
    if (employees.length < 2) return false;
    return employees.some(emp => emp.manager_id !== null);
  }, [employees]);

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

  const initialNodes = useMemo<Node<NodeData>[]>(() => {
    if (!employees.length) {
      setError('No employee data available');
      return [];
    }

    try {
      const levelHeight = 200;
      const levelWidth = 250;
      
      const employeesByLevel: { [level: number]: Employee[] } = {};
      employees.forEach(emp => {
        const level = getEmployeeLevel(emp);
        if (!employeesByLevel[level]) employeesByLevel[level] = [];
        employeesByLevel[level].push(emp);
      });
      
      return employees.map((emp, index) => {
        const level = getEmployeeLevel(emp);
        const isLegal = emp.department.toLowerCase().includes('legal');
        const isCsuite = level === 0;
        const isChuck = emp.first_name === 'Chuck' && emp.last_name === 'Melander';
        const isDirector = emp.title.toLowerCase().includes('director') || 
                          emp.title.toLowerCase().includes('vp');
        
        const currentLevelEmployees = employeesByLevel[level] || [];
        const positionInLevel = currentLevelEmployees.findIndex(e => e.id === emp.id);
        const totalInLevel = currentLevelEmployees.length;
        
        // Use stored positions if available, otherwise calculate default positions
        let position: XYPosition;
        if (emp.position_x !== null && emp.position_x !== undefined && 
            emp.position_y !== null && emp.position_y !== undefined) {
          position = {
            x: emp.position_x,
            y: emp.position_y
          };
        } else {
          let xOffset;
          if (level === 0) {
            if (topNodes.length <= 3) {
              if (emp.first_name === 'Patrick' && emp.last_name === 'Mulcahy') {
                xOffset = 0;
              } else if (emp.first_name === 'Matthew' && emp.last_name === 'Halvorson') {
                xOffset = levelWidth;
              } else if (emp.first_name === 'Chuck' && emp.last_name === 'Melander') {
                xOffset = -levelWidth;
              } else {
                xOffset = (positionInLevel - (totalInLevel - 1) / 2) * levelWidth;
              }
            } else {
              xOffset = (positionInLevel - (totalInLevel - 1) / 2) * levelWidth;
            }
          } else {
            xOffset = (positionInLevel - (totalInLevel - 1) / 2) * levelWidth;
          }
          
          position = { 
            x: xOffset,
            y: level * levelHeight
          };
        }
        
        let nodeStyle: NodeStyle = {
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          cursor: editable && isAdmin ? 'grab' : 'pointer'
        };

        let textColorClass = 'text-gray-800';

        if (isCsuite) {
          nodeStyle = {
            ...nodeStyle,
            background: '#9b87f5',
            border: '2px solid #1A1F2C',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          };
          textColorClass = 'text-white';
        } else if (isChuck) {
          nodeStyle = {
            ...nodeStyle,
            background: '#7E69AB',
            border: '2px solid #1A1F2C',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          };
          textColorClass = 'text-white';
        } else if (isDirector) {
          nodeStyle = {
            ...nodeStyle,
            background: '#6E59A5',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          };
          textColorClass = 'text-white';
        } else if (isLegal) {
          nodeStyle = {
            ...nodeStyle,
            background: '#F1F0FB',
            border: '2px dashed #8E9196',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          };
          textColorClass = 'text-gray-700';
        }

        const label = (
          <div 
            className={`${textColorClass} ${editable && isAdmin ? 'with-actions' : ''}`}
            onClick={() => setSelectedEmployee(emp)}
          >
            <div className="font-semibold">{`${emp.first_name} ${emp.last_name}`}</div>
            <div className="text-sm">{emp.title}</div>
            <div className="text-xs opacity-75">{emp.department}</div>
            {editable && isAdmin && (
              <div className="absolute top-1 right-1 opacity-25 hover:opacity-100 transition-opacity" />
            )}
          </div>
        );

        return {
          id: emp.id,
          type: 'default',
          position: position,
          data: {
            label,
            employee: emp
          } as NodeData,
          style: nodeStyle,
          draggable: editable && isAdmin,
        } as Node<NodeData>;
      });
    } catch (err) {
      console.error('Error creating nodes:', err);
      setError('Error creating organization chart');
      return [];
    }
  }, [employees, getEmployeeLevel, topNodes, editable, isAdmin]);

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

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  useEffect(() => {
    if (!isInitialMount.current) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    } else {
      isInitialMount.current = false;
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Create a debounced function to save positions after dragging stops
  const saveNodePosition = useCallback((nodeId: string, position: XYPosition) => {
    if (positionSaveTimeoutRef.current) {
      clearTimeout(positionSaveTimeoutRef.current);
    }
    
    positionSaveTimeoutRef.current = setTimeout(() => {
      console.log('Saving position for node:', nodeId, position);
      updateEmployeePosition.mutate({
        id: nodeId,
        position_x: position.x,
        position_y: position.y
      });
    }, 500); // Debounce position updates to avoid too many requests
  }, [updateEmployeePosition]);

  const onNodeDragStart: NodeMouseHandler = useCallback((event, node) => {
    if (!editable || !isAdmin) return;
    setIsDragging(true);
    draggedNodeRef.current = node as Node<NodeData>;
    if (event.target instanceof HTMLElement) {
      event.target.style.cursor = 'grabbing';
    }
  }, [editable, isAdmin]);

  const onNodeDrag: NodeMouseHandler = useCallback((event, node) => {
    if (!editable || !isAdmin || !draggedNodeRef.current) return;

    let targetNode = null;
    for (const potentialTarget of reactFlowInstance.getNodes()) {
      if (potentialTarget.id === draggedNodeRef.current.id) continue;
      
      const draggedNodeBounds = {
        left: node.position.x,
        right: node.position.x + (node.width || 0),
        top: node.position.y,
        bottom: node.position.y + (node.height || 0)
      };
      
      const targetBounds = {
        left: potentialTarget.position.x,
        right: potentialTarget.position.x + (potentialTarget.width || 0),
        top: potentialTarget.position.y,
        bottom: potentialTarget.position.y + (potentialTarget.height || 0)
      };
      
      const isOverlapping = !(
        draggedNodeBounds.right < targetBounds.left || 
        draggedNodeBounds.left > targetBounds.right || 
        draggedNodeBounds.bottom < targetBounds.top || 
        draggedNodeBounds.top > draggedNodeBounds.bottom
      );
      
      if (isOverlapping) {
        targetNode = potentialTarget;
        break;
      }
    }
    
    targetNodeRef.current = targetNode as Node<NodeData> | null;
    
    setNodes((nds) => 
      nds.map((n) => {
        if (n.id === targetNode?.id) {
          return {
            ...n,
            style: { 
              ...(n.style as NodeStyle), 
              boxShadow: '0 0 0 2px #6E59A5' 
            }
          };
        } else if (n.id !== draggedNodeRef.current?.id && ((n.style as NodeStyle)?.boxShadow)) {
          const { boxShadow, ...restStyle } = n.style as NodeStyle;
          return { ...n, style: restStyle };
        }
        return n;
      })
    );
  }, [editable, isAdmin, reactFlowInstance, setNodes]);

  const onNodeDragStop: NodeMouseHandler = useCallback(async (event, node) => {
    if (!editable || !isAdmin || !draggedNodeRef.current) return;
    
    setIsDragging(false);
    
    if (event.target instanceof HTMLElement) {
      event.target.style.cursor = 'grab';
    }
    
    try {
      // Check if dropping on another node to update manager
      if (targetNodeRef.current && draggedNodeRef.current.id !== targetNodeRef.current.id) {
        const draggedEmployeeId = draggedNodeRef.current.id;
        const newManagerId = targetNodeRef.current.id;
        
        let currentManagerId = newManagerId;
        const managerChain = [draggedEmployeeId];
        
        while (currentManagerId) {
          if (managerChain.includes(currentManagerId)) {
            toast.error("Cannot create circular reporting relationship");
            return;
          }
          
          managerChain.push(currentManagerId);
          
          const manager = employeeMap.get(currentManagerId);
          currentManagerId = manager?.manager_id || null;
        }
        
        await updateEmployee.mutateAsync({
          id: draggedEmployeeId,
          manager_id: newManagerId
        });
        
        toast.success("Reporting relationship updated", {
          description: `${employeeMap.get(draggedEmployeeId)?.first_name} now reports to ${employeeMap.get(newManagerId)?.first_name}`
        });
      }
      // Otherwise, just save the position
      else {
        saveNodePosition(node.id, node.position);
      }
    } catch (error) {
      console.error("Failed to update reporting relationship:", error);
      toast.error("Failed to update reporting relationship");
    } finally {
      draggedNodeRef.current = null;
      targetNodeRef.current = null;
      
      setNodes((nds) => 
        nds.map((n) => {
          if ((n.style as NodeStyle)?.boxShadow) {
            const { boxShadow, ...restStyle } = n.style as NodeStyle;
            return { ...n, style: restStyle };
          }
          return n;
        })
      );
    }
  }, [editable, isAdmin, employeeMap, updateEmployee, saveNodePosition, setNodes]);

  const handleRemoveManager = async (employeeId: string) => {
    try {
      await updateEmployee.mutateAsync({
        id: employeeId,
        manager_id: null
      });
      
      const employee = employeeMap.get(employeeId);
      toast.success(`${employee?.first_name} ${employee?.last_name} no longer has a manager`);
      
      setNodes(initialNodes);
      setEdges(initialEdges);
    } catch (error) {
      console.error("Failed to remove manager:", error);
      toast.error("Failed to remove manager");
    }
  };

  const wrapWithContextMenu = useCallback(
    (node: Node<NodeData>) => {
      if (!editable || !isAdmin) return node;
      
      const employee = node.data.employee as Employee;
      
      return {
        ...node,
        data: {
          ...node.data,
          label: (
            <EmployeeContextMenu
              employee={employee}
              onEdit={setEditingEmployee}
              onAddDirectReport={(managerId) => setAddingDirectReportTo(managerId)}
              onRemoveManager={handleRemoveManager}
              onDeleteSuccess={() => {
              }}
            >
              {node.data.label as React.ReactNode}
            </EmployeeContextMenu>
          )
        }
      };
    },
    [editable, isAdmin, handleRemoveManager]
  );
  
  const nodesWithContextMenu = useMemo(() => {
    return nodes.map(wrapWithContextMenu);
  }, [nodes, wrapWithContextMenu]);

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
    <div className="h-[600px] border rounded-lg relative">
      {editable && isAdmin && (
        <div className="absolute top-2 left-2 z-10 bg-white/80 border rounded-md shadow-sm p-2 text-xs">
          {isDragging ? (
            <span className="text-purple-600 font-medium">Drag employee over another to update reporting line</span>
          ) : (
            <span>Drag employees to reassign managers • Right-click for more options</span>
          )}
        </div>
      )}
      
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
        nodes={nodesWithContextMenu}
        edges={edges}
        onNodesChange={onNodesChange as OnNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={editable && isAdmin}
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

      <Dialog open={!!selectedEmployee && !editingEmployee} onOpenChange={() => setSelectedEmployee(null)}>
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
            
            {editable && isAdmin && (
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={() => {
                    setSelectedEmployee(null);
                    setEditingEmployee(selectedEmployee);
                  }}
                >
                  Edit Employee
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {editingEmployee && (
        <EmployeeFormDialog
          open={!!editingEmployee}
          onOpenChange={() => setEditingEmployee(null)}
          employees={employees}
          employeeToEdit={editingEmployee}
          onSuccess={() => {
            setEditingEmployee(null);
            toast.success("Employee updated successfully");
          }}
        />
      )}

      {addingDirectReportTo && (
        <EmployeeFormDialog
          open={!!addingDirectReportTo}
          onOpenChange={() => setAddingDirectReportTo(null)}
          employees={employees}
          onSuccess={() => {
            setAddingDirectReportTo(null);
            toast.success("Direct report added successfully");
          }}
          employeeToEdit={{
            id: '',
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            title: '',
            department: '',
            manager_id: addingDirectReportTo
          } as Employee}
        />
      )}
    </div>
  );
};

const OrgChart = (props: OrgChartProps) => {
  console.log("Rendering OrgChart wrapper with ReactFlowProvider");
  
  return (
    <ReactFlowProvider>
      <OrgChartInner {...props} />
    </ReactFlowProvider>
  );
};

export default OrgChart;
