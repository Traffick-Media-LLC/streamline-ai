
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StateNotesProps {
  stateName: string;
  stateId: number;
}

interface StateNote {
  id: string;
  state_id: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const StateNotes: React.FC<StateNotesProps> = ({ stateName, stateId }) => {
  const [notes, setNotes] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { isAuthenticated } = useAuth();

  // Fetch notes for the selected state
  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('state_notes')
          .select('*')
          .eq('state_id', stateId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error fetching state notes:', error);
          toast.error("Failed to load notes");
        } else {
          setNotes(data?.notes || '');
        }
      } catch (error) {
        console.error('Error fetching state notes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [stateId]);

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error("You must be logged in to save notes");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('state_notes')
        .upsert(
          { 
            state_id: stateId, 
            notes: notes.trim() || null 
          },
          { 
            onConflict: 'state_id' 
          }
        );

      if (error) {
        console.error('Error saving state notes:', error);
        toast.error("Failed to save notes");
      } else {
        toast.success("Notes saved successfully");
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving state notes:', error);
      toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original notes
    const fetchOriginalNotes = async () => {
      const { data } = await supabase
        .from('state_notes')
        .select('notes')
        .eq('state_id', stateId)
        .single();
      setNotes(data?.notes || '');
    };
    fetchOriginalNotes();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notes for {stateName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading notes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Notes for {stateName}
          {!isEditing && isAuthenticated && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this state's regulations, special considerations, or other relevant information..."
              rows={6}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                disabled={isSaving}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {notes ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{notes}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No notes available for this state.
                {isAuthenticated && " Click Edit to add notes."}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StateNotes;
