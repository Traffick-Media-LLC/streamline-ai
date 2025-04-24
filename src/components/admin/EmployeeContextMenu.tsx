
import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Edit, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { Employee } from '@/hooks/useEmployeesData';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useEmployeeOperations } from '@/hooks/useEmployeeOperations';

interface EmployeeContextMenuProps {
  children: React.ReactNode;
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onAddDirectReport: (managerId: string) => void;
  onRemoveManager: (employeeId: string) => void;
  onDeleteSuccess: () => void;
}

const EmployeeContextMenu: React.FC<EmployeeContextMenuProps> = ({
  children,
  employee,
  onEdit,
  onAddDirectReport,
  onRemoveManager,
  onDeleteSuccess
}) => {
  const { deleteEmployee } = useEmployeeOperations();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  
  const handleDelete = async () => {
    try {
      await deleteEmployee.mutateAsync(employee.id);
      onDeleteSuccess();
    } catch (error) {
      console.error("Failed to delete employee:", error);
    }
  };
  
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem 
            onClick={() => onEdit(employee)}
            className="cursor-pointer"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Employee Details
          </ContextMenuItem>
          
          <ContextMenuItem
            onClick={() => onAddDirectReport(employee.id)}
            className="cursor-pointer"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Direct Report
          </ContextMenuItem>
          
          {employee.manager_id && (
            <ContextMenuItem
              onClick={() => onRemoveManager(employee.id)}
              className="cursor-pointer"
            >
              <UserMinus className="mr-2 h-4 w-4" />
              Remove Manager
            </ContextMenuItem>
          )}
          
          <ContextMenuSeparator />
          
          <ContextMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 cursor-pointer focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Employee
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {employee.first_name} {employee.last_name} 
              from the organization. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EmployeeContextMenu;
