import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  NodeProps
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
import React from 'react';

interface OrgChartProps {
  employees: Employee[];
  isAdmin?: boolean;
  editable?: boolean;
}

// Define type for node style with optional boxShadow property
interface NodeStyle {
  background: string;
  border: string;
  borderRadius: string;
  padding: string;
  cursor: string;
  boxShadow?: string;
}

const OrgChart = ({ employees, isAdmin = false, editable = false }: OrgChartProps) => {
  const { updateEmployee } = useEmployeeOperations();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'hierarchical' | 'flat'>('hierarchical');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingDirectReportTo, setAddingDirectReportTo] = useState<string | null>(null);
  const reactFlowInstance = useReactFlow();
  const isInitialMount = useRef(true);
  const draggedNodeRef = useRef<Node | null>(null);
  const targetNodeRef = useRef<Node | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const employeeMap = useMemo(() => {
    return new Map(employees.map(emp => [emp.id, emp]));
  }, [employees]);

  // Employees with specific titles for top leadership
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

  // Map of employees and their designated level in the org chart
  const getEmployeeLevel = useCallback((employee: Employee): number => {
    // Special cases for top leadership - manually position at the same level
    if (employee.first_name === 'Patrick' && employee.last_name === 'Mulcahy') {
      return 0; // Top level for CEO
    }
    
    if (employee.first_name === 'Matthew' && employee.last_name === 'Halvorson') {
      return 0; // Same level for COO
    }
    
    if (employee.first_name === 'Chuck' && employee.last_name === 'Melander') {
      return 0; // Same level for CSO
    }
    
    // Define titles for each level
    const titleLevels: { [key: string]: number } = {
      // Top leadership - Level 0
      'ceo': 0,
      'chief executive officer': 0,
      'coo': 0,
      'chief operating officer': 0,
      'cso': 0, 
      'chief strategy officer': 0,
      
      // VP and Directors - Level 1
      'vp': 1,
      'vice president': 1,
      'director': 1,
      
      // Managers - Level 2
      'manager': 2,
      'lead': 2,
      'counsel': 2,
      
      // Staff - Level 3
      'staff': 3,
      'accountant': 3,
      'analyst': 3,
      'coordinator': 3,
      'specialist': 3,
      'broker': 3,
      'executive': 3,
    };
    
    // Get title in lowercase for matching
    const titleLower = employee.title.toLowerCase();
    
    // Check specific title keywords
    for (const [titleKey, level] of Object.entries(titleLevels)) {
      if (titleLower.includes(titleKey)) {
        return level;
      }
    }
    
    // Default level based on position in org
    if (employee.manager_id === null) {
      return 0; // No manager means top level
    }
    
    const manager = employeeMap.get(employee.manager_id);
    if (!manager) return 3; // Default to staff level
    
    const managerLevel = getEmployeeLevel(manager);
    return managerLevel + 1;
  }, [employeeMap]);

  // Find the top leadership nodes
  const topNodes = useMemo(() => {
    // Look for specific people in the top leadership positions
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
    
    // If we couldn't find the specific people, fall back to title-based search
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
      // First try to find Patrick Mulcahy as CEO
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

  const initialNodes = useMemo(() => {
    if (!employees.length) {
      setError('No employee data available');
      return [];
    }

    try {
      const levelHeight = 200;
      const levelWidth = 250;
      
      // Calculate horizontal positions based on peers at the same level
      const employeesByLevel: { [level: number]: Employee[] } = {};
      employees.forEach(emp => {
        const level = getEmployeeLevel(emp);
        if (!employeesByLevel[level]) employeesByLevel[level] = [];
        employeesByLevel[level].push(emp);
      });
      
      return employees.map((emp) => {
        const level = getEmployeeLevel(emp);
        const isLegal = emp.department.toLowerCase().includes('legal');
        const isCsuite = level === 0; // Top level executives
        
        const isChuck = emp.first_name === 'Chuck' && emp.last_name === 'Melander';
        const isDirector = emp.title.toLowerCase().includes('director') || 
                          emp.title.toLowerCase().includes('vp');

        // Calculate horizontal position based on siblings at the same level
        const peersAtSameLevel = employeesByLevel[level] || [];
        const siblingIndex = peersAtSameLevel.indexOf(emp);
        const siblingCount = peersAtSameLevel.length;
        
        // Special positioning for top leadership (CEO, COO, CSO)
        let xOffset;
        if (level === 0) {
          // Special positioning for C-suite
          if (topNodes.length <= 3) {
            // If we have Patrick Mulcahy (CEO), Matthew Halvorson (COO), Chuck Melander (CSO)
            if (emp.first_name === 'Patrick' && emp.last_name === 'Mulcahy') {
              xOffset = 0; // Center
            } else if (emp.first_name === 'Matthew' && emp.last_name === 'Halvorson') {
              xOffset = levelWidth; // Right
            } else if (emp.first_name === 'Chuck' && emp.last_name === 'Melander') {
              xOffset = -levelWidth; // Left
            } else {
              // Fallback for other C-level positions
              xOffset = (siblingIndex - (siblingCount - 1) / 2) * levelWidth;
            }
          } else {
            // Generic calculation for many top-level positions
            xOffset = (siblingIndex - (siblingCount - 1) / 2) * levelWidth;
          }
        } else {
          // Standard calculation for all other levels
          xOffset = (siblingIndex - (siblingCount - 1) / 2) * levelWidth;
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
          };
          textColorClass = 'text-white';
        } else if (isChuck) {
          nodeStyle = {
            ...nodeStyle,
            background: '#7E69AB',
            border: '2px solid #1A1F2C',
          };
          textColorClass = 'text-white';
        } else if (isDirector) {
          nodeStyle = {
            ...nodeStyle,
            background: '#6E59A5',
          };
          textColorClass = 'text-white';
        } else if (isLegal) {
          nodeStyle = {
            ...nodeStyle,
            background: '#F1F0FB',
            border: '2px dashed #8E9196',
          };
          textColorClass = 'text-gray-700';
        }

        return {
          id: emp.id,
          type: 'default',
          position: { 
            x: xOffset,
            y: level * levelHeight
          },
          data: {
            label: React.createElement('div', { 
              className: `${textColorClass} ${editable && isAdmin ? 'with-actions' : ''}`,
              onClick: () => setSelectedEmployee(emp)
            }, [
              React.createElement('div', { key: 'name', className: "font-semibold" }, `${emp.first_name} ${emp.last_name}`),
              React.createElement('div', { key: 'title', className: "text-sm" }, emp.title),
              React.createElement('div', { key: 'department', className: "text-xs opacity-75" }, emp.department),
              editable && isAdmin ? React.createElement('div', {
                key: 'edit-indicator',
                className: "absolute top-1 right-1 opacity-25 hover:opacity-100 transition-opacity"
              }) : null
            ].filter(Boolean)),
            employee: emp,
          },
          style: nodeStyle,
          draggable: editable && isAdmin,
        };
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

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Reset nodes and edges when employees data changes
  useEffect(() => {
    if (!isInitialMount.current) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    } else {
      isInitialMount.current = false;
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeDragStart: NodeMouseHandler = useCallback((event, node) => {
    if (!editable || !isAdmin) return;
    setIsDragging(true);
    draggedNodeRef.current = node;
    // Change cursor to grabbing
    if (event.target instanceof HTMLElement) {
      event.target.style.cursor = 'grabbing';
    }
  }, [editable, isAdmin]);

  const onNodeDrag: NodeMouseHandler = useCallback((event, node) => {
    if (!editable || !isAdmin || !draggedNodeRef.current) return;

    // Find any node that the dragged node is hovering over
    const flowNodes = reactFlowInstance.getNodes();
    
    let targetNode = null;
    for (const potentialTarget of flowNodes) {
      if (potentialTarget.id === draggedNodeRef.current.id) continue;
      
      // Check if dragged node is over target node
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
        draggedNodeBounds.top > targetBounds.bottom
      );
      
      if (isOverlapping) {
        // Highlight the target node
        targetNode = potentialTarget;
        break;
      }
    }
    
    // Update the target node reference
    targetNodeRef.current = targetNode;
    
    // Update visual feedback for drag target
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
          // Clear any highlight on other nodes
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
    
    // Reset cursor
    if (event.target instanceof HTMLElement) {
      event.target.style.cursor = 'grab';
    }
    
    try {
      // If we have a target node, update the dragged node's manager
      if (targetNodeRef.current && draggedNodeRef.current.id !== targetNodeRef.current.id) {
        const draggedEmployeeId = draggedNodeRef.current.id;
        const newManagerId = targetNodeRef.current.id;
        
        // Check for circular references
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
        
        // Update the employee's manager
        await updateEmployee.mutateAsync({
          id: draggedEmployeeId,
          manager_id: newManagerId
        });
        
        toast.success("Reporting relationship updated", {
          description: `${employeeMap.get(draggedEmployeeId)?.first_name} now reports to ${employeeMap.get(newManagerId)?.first_name}`
        });
      }
    } catch (error) {
      console.error("Failed to update reporting relationship:", error);
      toast.error("Failed to update reporting relationship");
    } finally {
      // Clear the references and any highlights
      draggedNodeRef.current = null;
      targetNodeRef.current = null;
      
      // Clear any highlight styles
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
    
    // Return the node to its original position in the org chart
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [editable, isAdmin, employeeMap, updateEmployee, setNodes, initialNodes, initialEdges, setEdges]);

  const handleRemoveManager = async (employeeId: string) => {
    try {
      await updateEmployee.mutateAsync({
        id: employeeId,
        manager_id: null
      });
      
      const employee = employeeMap.get(employeeId);
      toast.success(`${employee?.first_name} ${employee?.last_name} no longer has a manager`);
      
      // Reset nodes and edges
      setNodes(initialNodes);
      setEdges(initialEdges);
    } catch (error) {
      console.error("Failed to remove manager:", error);
      toast.error("Failed to remove manager");
    }
  };

  const wrapWithContextMenu = useCallback(
    (node: Node) => {
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
                // Nodes will be refreshed via refetch in parent component
              }}
            >
              {node.data.label}
            </EmployeeContextMenu>
          )
        }
      };
    },
    [editable, isAdmin, handleRemoveManager]
  );
  
  // Apply context menu to nodes
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
        onNodesChange={onNodesChange}
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

      {/* View Employee Dialog */}
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

      {/* Edit Employee Dialog */}
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

      {/* Add Direct Report Dialog */}
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

export default OrgChart;
