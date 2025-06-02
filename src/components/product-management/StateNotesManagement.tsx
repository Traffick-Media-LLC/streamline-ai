
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Save, X, FileText } from "lucide-react";

interface StateNote {
  id: string;
  state_id: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  states: {
    name: string;
  };
}

interface StateNotesManagementProps {
  onDataLoaded?: () => void;
}

const StateNotesManagement: React.FC<StateNotesManagementProps> = ({ onDataLoaded }) => {
  const [stateNotes, setStateNotes] = useState<StateNote[]>([]);
  const [allStates, setAllStates] = useState<{id: number, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingState, setEditingState] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { isAuthenticated, isAdmin } = useAuth();

  // Fetch all states and their notes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all states
        const { data: statesData, error: statesError } = await supabase
          .from('states')
          .select('id, name')
          .order('name');

        if (statesError) throw statesError;
        setAllStates(statesData || []);

        // Fetch existing state notes
        const { data: notesData, error: notesError } = await supabase
          .from('state_notes')
          .select(`
            id,
            state_id,
            notes,
            created_at,
            updated_at,
            states (
              name
            )
          `)
          .order('states(name)');

        if (notesError) throw notesError;
        setStateNotes(notesData || []);

        onDataLoaded?.();
      } catch (error) {
        console.error('Error fetching state notes data:', error);
        toast.error("Failed to load state notes data");
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && isAdmin) {
      fetchData();
    }
  }, [isAuthenticated, isAdmin, onDataLoaded]);

  // Filter states based on search query
  const filteredData = React.useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    
    // Create a combined list of all states with their notes
    const statesWithNotes = allStates.map(state => {
      const existingNote = stateNotes.find(note => note.state_id === state.id);
      return {
        state_id: state.id,
        state_name: state.name,
        notes: existingNote?.notes || null,
        note_id: existingNote?.id || null,
        created_at: existingNote?.created_at || null,
        updated_at: existingNote?.updated_at || null,
        hasNotes: !!existingNote?.notes
      };
    });

    return statesWithNotes.filter(item =>
      item.state_name.toLowerCase().includes(searchLower) ||
      (item.notes && item.notes.toLowerCase().includes(searchLower))
    );
  }, [allStates, stateNotes, searchQuery]);

  const handleEdit = (stateId: number, currentNotes: string | null) => {
    setEditingState(stateId);
    setEditingNotes(currentNotes || '');
  };

  const handleSave = async (stateId: number) => {
    if (!isAdmin) {
      toast.error("Admin access required");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('state_notes')
        .upsert(
          { 
            state_id: stateId, 
            notes: editingNotes.trim() || null 
          },
          { 
            onConflict: 'state_id' 
          }
        );

      if (error) throw error;

      // Refetch data to update the UI
      const { data: updatedNotes, error: fetchError } = await supabase
        .from('state_notes')
        .select(`
          id,
          state_id,
          notes,
          created_at,
          updated_at,
          states (
            name
          )
        `)
        .order('states(name)');

      if (fetchError) throw fetchError;
      setStateNotes(updatedNotes || []);

      toast.success("Notes saved successfully");
      setEditingState(null);
      setEditingNotes('');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingState(null);
    setEditingNotes('');
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Admin access required to manage state notes.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Loading state notes...</p>
        </CardContent>
      </Card>
    );
  }

  const statesWithNotes = filteredData.filter(item => item.hasNotes).length;
  const statesWithoutNotes = filteredData.filter(item => !item.hasNotes).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total States</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allStates.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">States with Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statesWithNotes}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">States without Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statesWithoutNotes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            State Notes Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search states or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* States Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.state_id}>
                    <TableCell className="font-medium">
                      {item.state_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.hasNotes ? "default" : "secondary"}>
                        {item.hasNotes ? "Has Notes" : "No Notes"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingState === item.state_id ? (
                        <Textarea
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                          placeholder="Add notes about this state's regulations, considerations, etc..."
                          rows={3}
                          className="w-full"
                        />
                      ) : (
                        <div className="max-w-md">
                          {item.notes ? (
                            <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
                          ) : (
                            <span className="text-muted-foreground text-sm">No notes</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingState === item.state_id ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(item.state_id)}
                            disabled={isSaving}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {isSaving ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item.state_id, item.notes)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No states found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StateNotesManagement;
