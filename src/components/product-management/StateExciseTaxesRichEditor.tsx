
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Save, X } from "lucide-react";

interface StateExciseTaxesRichEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialTaxInfo: string;
  onSave: (taxInfo: string) => Promise<void>;
  stateName: string;
}

const StateExciseTaxesRichEditor: React.FC<StateExciseTaxesRichEditorProps> = ({
  isOpen,
  onClose,
  initialTaxInfo,
  onSave,
  stateName
}) => {
  const [taxInfo, setTaxInfo] = useState(initialTaxInfo);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(taxInfo);
      toast.success("Excise tax information saved successfully");
      onClose();
    } catch (error) {
      console.error('Error saving excise tax information:', error);
      toast.error("Failed to save excise tax information");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setTaxInfo(initialTaxInfo); // Reset to initial value
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Excise Tax Information - {stateName}</DialogTitle>
          <DialogDescription>
            Update excise tax information for this state. You can include tax rates, regulations, and other relevant tax details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Excise Tax Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={taxInfo}
                onChange={(e) => setTaxInfo(e.target.value)}
                placeholder="Enter excise tax information for this state..."
                className="min-h-[300px] resize-none"
              />
              <div className="text-sm text-muted-foreground mt-2">
                Tip: Include tax rates, applicable products, exemptions, and regulatory details.
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StateExciseTaxesRichEditor;
