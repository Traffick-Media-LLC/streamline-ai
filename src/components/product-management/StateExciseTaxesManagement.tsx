
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Calculator } from "lucide-react";
import StateExciseTaxesRichEditor from './StateExciseTaxesRichEditor';
import { renderTextWithLinks } from "@/utils/textUtils";

interface StateExciseTax {
  id: string;
  state_id: number;
  excise_tax_info: string | null;
  created_at: string;
  updated_at: string;
  states: {
    name: string;
  };
}

interface StateExciseTaxesManagementProps {
  onDataLoaded?: () => void;
}

const StateExciseTaxesManagement: React.FC<StateExciseTaxesManagementProps> = ({ onDataLoaded }) => {
  const [stateExciseTaxes, setStateExciseTaxes] = useState<StateExciseTax[]>([]);
  const [allStates, setAllStates] = useState<{id: number, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingState, setEditingState] = useState<{id: number, name: string, excise_tax_info: string | null} | null>(null);
  const { isAuthenticated, isAdmin } = useAuth();

  // Fetch all states and their excise tax information
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

        // Fetch existing state excise taxes
        const { data: taxesData, error: taxesError } = await supabase
          .from('state_excise_taxes')
          .select(`
            id,
            state_id,
            excise_tax_info,
            created_at,
            updated_at,
            states (
              name
            )
          `)
          .order('states(name)');

        if (taxesError) throw taxesError;
        setStateExciseTaxes(taxesData || []);

        onDataLoaded?.();
      } catch (error) {
        console.error('Error fetching state excise taxes data:', error);
        toast.error("Failed to load state excise taxes data");
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
    
    // Create a combined list of all states with their excise tax info
    const statesWithTaxes = allStates.map(state => {
      const existingTax = stateExciseTaxes.find(tax => tax.state_id === state.id);
      return {
        state_id: state.id,
        state_name: state.name,
        excise_tax_info: existingTax?.excise_tax_info || null,
        tax_id: existingTax?.id || null,
        created_at: existingTax?.created_at || null,
        updated_at: existingTax?.updated_at || null,
        hasTaxInfo: !!existingTax?.excise_tax_info
      };
    });

    return statesWithTaxes.filter(item =>
      item.state_name.toLowerCase().includes(searchLower) ||
      (item.excise_tax_info && item.excise_tax_info.toLowerCase().includes(searchLower))
    );
  }, [allStates, stateExciseTaxes, searchQuery]);

  const handleEdit = (stateId: number, stateName: string, currentTaxInfo: string | null) => {
    setEditingState({ id: stateId, name: stateName, excise_tax_info: currentTaxInfo });
  };

  const handleSave = async (taxInfo: string) => {
    if (!isAdmin || !editingState) {
      toast.error("Admin access required");
      return;
    }

    const { error } = await supabase
      .from('state_excise_taxes')
      .upsert(
        { 
          state_id: editingState.id, 
          excise_tax_info: taxInfo.trim() || null 
        },
        { 
          onConflict: 'state_id' 
        }
      );

    if (error) throw error;

    // Refetch data to update the UI
    const { data: updatedTaxes, error: fetchError } = await supabase
      .from('state_excise_taxes')
      .select(`
        id,
        state_id,
        excise_tax_info,
        created_at,
        updated_at,
        states (
          name
        )
      `)
      .order('states(name)');

    if (fetchError) throw fetchError;
    setStateExciseTaxes(updatedTaxes || []);

    toast.success("Excise tax information saved successfully");
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Admin access required to manage state excise taxes.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Loading state excise taxes...</p>
        </CardContent>
      </Card>
    );
  }

  const statesWithTaxInfo = filteredData.filter(item => item.hasTaxInfo).length;
  const statesWithoutTaxInfo = filteredData.filter(item => !item.hasTaxInfo).length;

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
            <CardTitle className="text-sm font-medium">States with Tax Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statesWithTaxInfo}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">States without Tax Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statesWithoutTaxInfo}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            State Excise Taxes Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search states or excise tax information..."
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
                  <TableHead>Tax Info Preview</TableHead>
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
                      <Badge variant={item.hasTaxInfo ? "default" : "secondary"}>
                        {item.hasTaxInfo ? "Has Tax Info" : "No Tax Info"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        {item.excise_tax_info ? (
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {renderTextWithLinks(item.excise_tax_info.length > 100 ? item.excise_tax_info.substring(0, 100) + '...' : item.excise_tax_info)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No tax information</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item.state_id, item.state_name, item.excise_tax_info)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
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

      {/* Rich Text Editor Dialog */}
      {editingState && (
        <StateExciseTaxesRichEditor
          isOpen={!!editingState}
          onClose={() => setEditingState(null)}
          initialTaxInfo={editingState.excise_tax_info || ''}
          onSave={handleSave}
          stateName={editingState.name}
        />
      )}
    </div>
  );
};

export default StateExciseTaxesManagement;
