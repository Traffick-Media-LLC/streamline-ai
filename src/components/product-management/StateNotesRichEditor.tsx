
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Bold, Link, List, ListOrdered, Eye, Type, Save, X } from "lucide-react";
import { renderTextWithLinks } from "@/utils/textUtils";
import { toast } from "@/components/ui/sonner";

interface StateNotesRichEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialNotes: string;
  onSave: (notes: string) => Promise<void>;
  stateName: string;
}

const StateNotesRichEditor: React.FC<StateNotesRichEditorProps> = ({
  isOpen,
  onClose,
  initialNotes,
  onSave,
  stateName
}) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (before: string, after: string = '', placeholder: string = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notes.substring(start, end);
    const replacement = selectedText || placeholder;
    
    const newText = 
      notes.substring(0, start) + 
      before + replacement + after + 
      notes.substring(end);
    
    setNotes(newText);
    
    // Set cursor position after insertion
    setTimeout(() => {
      const newCursorPos = start + before.length + replacement.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertBold = () => insertMarkdown('**', '**', 'bold text');
  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      insertMarkdown('[', `](${url})`, 'link text');
    }
  };
  const insertBulletList = () => insertMarkdown('• ', '', 'list item');
  const insertNumberedList = () => insertMarkdown('1. ', '', 'list item');
  const insertHeading = () => insertMarkdown('## ', '', 'heading');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(notes);
      onClose();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNotes(initialNotes);
    onClose();
  };

  const wordCount = notes.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = notes.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Edit Notes for {stateName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <Tabs defaultValue="edit" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit" className="flex-1 flex flex-col mt-4 space-y-4">
              {/* Formatting Toolbar */}
              <div className="flex flex-wrap items-center gap-2 p-2 border rounded-lg bg-muted/30">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertBold}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertLink}
                  title="Insert Link"
                >
                  <Link className="h-4 w-4" />
                </Button>
                
                <Separator orientation="vertical" className="h-6" />
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertBulletList}
                  title="Bullet List"
                >
                  <List className="h-4 w-4" />
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertNumberedList}
                  title="Numbered List"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                
                <Separator orientation="vertical" className="h-6" />
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertHeading}
                  title="Heading"
                >
                  <Type className="h-4 w-4" />
                </Button>
              </div>

              {/* Editor */}
              <Textarea
                ref={textareaRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add detailed notes about this state's regulations, special considerations, or other relevant information...

You can use formatting:
**Bold text**
[Link text](URL)
• Bullet points
1. Numbered lists
## Headings"
                className="flex-1 min-h-[300px] resize-none font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'b') {
                    e.preventDefault();
                    insertBold();
                  }
                }}
              />

              {/* Word/Character Count */}
              <div className="text-sm text-muted-foreground text-right">
                {wordCount} words • {charCount} characters
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="flex-1 mt-4">
              <div className="border rounded-lg p-4 bg-background min-h-[300px] max-h-[400px] overflow-y-auto">
                {notes ? (
                  <div className="prose prose-sm max-w-none">
                    {renderTextWithLinks(notes)}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No content to preview</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Saving..." : "Save Notes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StateNotesRichEditor;
