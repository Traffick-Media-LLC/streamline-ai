import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, Edit, Save, X } from "lucide-react";
import KnowledgeJsonUploader from "./KnowledgeJsonUploader";
import KnowledgeCsvUploader from "./KnowledgeCsvUploader";
import ProductIngredientCsvUploader from "./ProductIngredientCsvUploader";

export default function KnowledgeManager() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: "",
    content: "",
    tags: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    tags: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);

  // Add refreshIngredients function
  const refreshIngredients = async () => {
    // This function is a placeholder for refreshing ingredient data display
    // In a real implementation, you might want to show the ingredients table
    fetchEntries();
    toast.success("Ingredient data refreshed");
  };

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("knowledge_entries")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        throw error;
      }

      setEntries(data);
    } catch (error) {
      toast.error("Failed to fetch knowledge entries");
      console.error("Error fetching entries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const createEntry = async () => {
    try {
      setIsCreating(true);
      
      // Convert comma-separated tags to array
      const tagsArray = newEntry.tags
        ? newEntry.tags.split(",").map(tag => tag.trim())
        : [];
      
      const { data, error } = await supabase
        .from("knowledge_entries")
        .insert({
          title: newEntry.title,
          content: newEntry.content,
          tags: tagsArray,
          is_active: true,
        })
        .select();

      if (error) {
        throw error;
      }

      toast.success("Knowledge entry created successfully");
      setNewEntry({
        title: "",
        content: "",
        tags: "",
      });
      fetchEntries();
    } catch (error) {
      toast.error("Failed to create knowledge entry");
      console.error("Error creating entry:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditForm({
      title: entry.title,
      content: entry.content,
      tags: entry.tags ? entry.tags.join(", ") : "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id) => {
    try {
      // Convert comma-separated tags to array
      const tagsArray = editForm.tags
        ? editForm.tags.split(",").map(tag => tag.trim())
        : [];
      
      const { error } = await supabase
        .from("knowledge_entries")
        .update({
          title: editForm.title,
          content: editForm.content,
          tags: tagsArray,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      toast.success("Knowledge entry updated successfully");
      setEditingId(null);
      fetchEntries();
    } catch (error) {
      toast.error("Failed to update knowledge entry");
      console.error("Error updating entry:", error);
    }
  };

  const confirmDelete = (id) => {
    setEntryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const deleteEntry = async () => {
    try {
      const { error } = await supabase
        .from("knowledge_entries")
        .delete()
        .eq("id", entryToDelete);

      if (error) {
        throw error;
      }

      toast.success("Knowledge entry deleted successfully");
      fetchEntries();
    } catch (error) {
      toast.error("Failed to delete knowledge entry");
      console.error("Error deleting entry:", error);
    } finally {
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs for different sections */}
      <Tabs defaultValue="knowledge" className="w-full">
        <TabsList>
          <TabsTrigger value="knowledge">Knowledge Entries</TabsTrigger>
          <TabsTrigger value="ingredients">Product Ingredients</TabsTrigger>
        </TabsList>
        
        <TabsContent value="knowledge">
          {/* Keep existing Knowledge Entries section */}
          <div className="space-y-4">
            {/* Upload Controls */}
            <div className="mb-4 border rounded-md p-4 bg-background">
              <h3 className="text-lg font-medium mb-3">Bulk Upload</h3>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <KnowledgeJsonUploader onComplete={fetchEntries} />
                <KnowledgeCsvUploader onComplete={fetchEntries} />
              </div>
            </div>

            {/* Entry creation form */}
            <div className="border rounded-md p-4 bg-background">
              <h3 className="text-lg font-medium mb-3">Create New Knowledge Entry</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input 
                    id="title"
                    value={newEntry.title} 
                    onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                    placeholder="Enter a descriptive title" 
                  />
                </div>
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea 
                    id="content"
                    value={newEntry.content} 
                    onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
                    placeholder="Enter detailed content" 
                    rows={10}
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input 
                    id="tags"
                    value={newEntry.tags} 
                    onChange={(e) => setNewEntry({...newEntry, tags: e.target.value})}
                    placeholder="product, policy, document, etc." 
                  />
                </div>
                <Button onClick={createEntry} disabled={isCreating || !newEntry.title || !newEntry.content}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create Entry
                </Button>
              </div>
            </div>

            {/* Entries table section */}
            <div className="border rounded-md overflow-hidden">
              <h3 className="text-lg font-medium p-4 bg-background border-b">Knowledge Entries</h3>
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : entries.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No knowledge entries found. Create your first entry above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Title</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead className="w-[150px]">Tags</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {editingId === entry.id ? (
                              <Input
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                              />
                            ) : (
                              entry.title
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === entry.id ? (
                              <Textarea
                                value={editForm.content}
                                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                                rows={5}
                              />
                            ) : (
                              <div className="max-h-24 overflow-y-auto">
                                {entry.content.length > 200
                                  ? `${entry.content.substring(0, 200)}...`
                                  : entry.content}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === entry.id ? (
                              <Input
                                value={editForm.tags}
                                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                                placeholder="tag1, tag2, tag3"
                              />
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {entry.tags?.map((tag, i) => (
                                  <span
                                    key={i}
                                    className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {editingId === entry.id ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => saveEdit(entry.id)}
                                    title="Save"
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={cancelEdit}
                                    title="Cancel"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => startEdit(entry)}
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => confirmDelete(entry.id)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="ingredients">
          <div className="space-y-4">
            {/* Upload Controls */}
            <div className="mb-4 border rounded-md p-4 bg-background">
              <h3 className="text-lg font-medium mb-3">Product Ingredients Upload</h3>
              <div className="grid gap-4">
                <ProductIngredientCsvUploader onComplete={refreshIngredients} />
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <p className="mb-2">The CSV file should contain the following columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="font-mono">Brand</span> - The brand name of the product</li>
                  <li><span className="font-mono">Product Type</span> - Category or type of the product</li>
                  <li><span className="font-mono">Product</span> - The specific product name</li>
                  <li><span className="font-mono">Ingredient 1</span> - Primary ingredient (required)</li>
                  <li><span className="font-mono">Ingredient 2-5</span> - Additional ingredients (optional)</li>
                </ul>
                <p className="mt-2">Each row should contain one product with up to 5 ingredients. The first ingredient is required.</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              knowledge entry from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEntry}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
