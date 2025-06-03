import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
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
  const [isLoading, setIsLoading] = useState(false);

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

  // Don't render anything if there are no notes
  if (!notes.trim() && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
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
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{notes}</p>
      </CardContent>
    </Card>
  );
};

export default StateNotes;
