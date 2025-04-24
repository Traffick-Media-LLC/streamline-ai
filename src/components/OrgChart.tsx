
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
  isAdmin?: boolean;
}

const OrgChart = ({ employees, isAdmin = false }: OrgChartProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'hierarchical' | 'flat'>('hierarchical');

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

  // Map of employees and their designated level in the org chart (not based on manager relationships)
  const getEmployeeLevel = useCallback((employee: Employee): number => {
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
    
    // Special cases for top leadership
    if (employee.first_name === 'Patrick' && employee.last_name === 'Mulcahy' && titleLower.includes('ceo')) {
      return 0;
    }
    
    if (employee.first_name === 'Matthew' && employee.last_name === 'Halvorson' && titleLower.includes('coo')) {
      return 0;
    }
    
    if (employee.first_name === 'Chuck' && employee.last_name === 'Melander' && titleLower.includes('cso')) {
      return 0;
    }
    
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

  // Find the top leadership nodes (CEO, COO, CSO)
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
        
        let nodeStyle = {
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
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
            label: (
              <div 
                className={`cursor-pointer w-full ${textColorClass}`}
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
  }, [employees, getEmployeeLevel, topNodes]);

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
        nodesDraggable={isAdmin}
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
