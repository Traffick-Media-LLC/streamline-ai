
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StateExciseTaxesProps {
  stateName: string;
  stateId: number;
}

interface StateExciseTax {
  id: string;
  state_id: number;
  excise_tax_info: string | null;
  created_at: string;
  updated_at: string;
}

const StateExciseTaxes: React.FC<StateExciseTaxesProps> = ({ stateName, stateId }) => {
  const [exciseTaxInfo, setExciseTaxInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch excise tax info for the selected state
  useEffect(() => {
    const fetchExciseTaxes = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('state_excise_taxes')
          .select('*')
          .eq('state_id', stateId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error fetching state excise taxes:', error);
        } else {
          setExciseTaxInfo(data?.excise_tax_info || '');
        }
      } catch (error) {
        console.error('Error fetching state excise taxes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExciseTaxes();
  }, [stateId]);

  // Don't render anything if there are no excise taxes
  if (!exciseTaxInfo.trim() && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Excise Tax Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading excise tax information...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Excise Tax Information</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{exciseTaxInfo}</p>
      </CardContent>
    </Card>
  );
};

export default StateExciseTaxes;
