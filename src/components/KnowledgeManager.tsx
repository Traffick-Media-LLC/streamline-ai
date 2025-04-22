import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  addKnowledgeEntry, 
  findKnowledgeEntryByTitle, 
  getAllBrands,
  getProductsByBrand 
} from "@/utils/chatUtils";
import KnowledgeCsvUploader from "./KnowledgeCsvUploader";

type KnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const ENTRY_TYPES = [
  { value: "brand", label: "Brand" },
  { value: "product", label: "Product" },
  { value: "regulatory", label: "Regulatory" }
];

const KnowledgeManager = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState("brand");
  const [customTags, setCustomTags] = useState("");
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [brands, setBrands] = useState<KnowledgeEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      
      setIsAdmin(true);
    };
    
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchEntries = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('knowledge_entries')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setEntries(data || []);
        
        const brandEntries = (data || []).filter(entry => 
          entry.tags && entry.tags.includes('brand')
        );
        setBrands(brandEntries);
      } catch (error) {
        console.error("Error fetching entries:", error);
        toast.error("Failed to load knowledge entries");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEntries();
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }

    try {
      setIsLoading(true);
      
      const existingEntry = await findKnowledgeEntryByTitle(title);
      if (existingEntry) {
        toast.error("An entry with this title already exists");
        return;
      }
      
      let tags = [selectedType];
      
      if (selectedType === "product" && selectedBrand) {
        tags.push(`brand:${selectedBrand}`);
      }
      
      if (customTags) {
        const customTagsList = customTags.split(',')
          .map(tag => tag.trim())
          .filter(tag => tag);
        tags = [...tags, ...customTagsList];
      }
      
      let finalContent = content;
      if (selectedType === "product" && selectedBrand) {
        const brandEntry = brands.find(b => b.id === selectedBrand);
        if (brandEntry) {
          finalContent = `Brand: ${brandEntry.title}\n\n${content}`;
        }
      }
      
      await addKnowledgeEntry(title, finalContent, tags);
      
      toast.success("Knowledge entry added successfully");
      setTitle("");
      setContent("");
      setCustomTags("");
      
      const { data } = await supabase
        .from('knowledge_entries')
        .select('*')
        .order('created_at', { ascending: false });
      
      setEntries(data || []);
      
      const brandEntries = (data || []).filter(entry => 
        entry.tags && entry.tags.includes('brand')
      );
      setBrands(brandEntries);
      
    } catch (error) {
      console.error("Error adding entry:", error);
      toast.error("Failed to add knowledge entry");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (entry: KnowledgeEntry) => {
    try {
      const { error } = await supabase
        .from('knowledge_entries')
        .update({ is_active: !entry.is_active })
        .eq('id', entry.id);
      
      if (error) throw error;
      
      setEntries(entries.map(e => 
        e.id === entry.id ? { ...e, is_active: !e.is_active } : e
      ));
      
      toast.success(`Entry ${entry.is_active ? 'disabled' : 'enabled'} successfully`);
    } catch (error) {
      console.error("Error toggling entry status:", error);
      toast.error("Failed to update entry status");
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You need admin privileges to access the Knowledge Manager.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Knowledge Base Manager</h1>
      <Tabs defaultValue="add">
        <TabsList className="mb-4">
          <TabsTrigger value="add">Add Entry</TabsTrigger>
          <TabsTrigger value="view">View Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add Knowledge Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <KnowledgeCsvUploader onComplete={async () => {
                setIsLoading(true);
                try {
                  const { data } = await supabase
                    .from('knowledge_entries')
                    .select('*')
                    .order('created_at', { ascending: false });
                  setEntries(data || []);
                  const brandEntries = (data || []).filter(entry =>
                    entry.tags && entry.tags.includes('brand')
                  );
                  setBrands(brandEntries);
                } finally {
                  setIsLoading(false);
                }
              }} />
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium">Entry Type</label>
                  <Select
                    value={selectedType}
                    onValueChange={setSelectedType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select entry type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTRY_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedType === "product" && (
                  <div>
                    <label className="block mb-2 text-sm font-medium">Brand</label>
                    <Select
                      value={selectedBrand}
                      onValueChange={setSelectedBrand}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select associated brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div>
                  <label className="block mb-2 text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`Enter ${selectedType} name`}
                    required
                  />
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium">Content</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`Enter ${selectedType} details including regulatory information...`}
                    className="min-h-[200px]"
                    required
                  />
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium">Custom Tags (comma-separated)</label>
                  <Input
                    value={customTags}
                    onChange={(e) => setCustomTags(e.target.value)}
                    placeholder="e.g., nicotine, hemp, kratom"
                  />
                </div>
                
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Adding..." : "Add Entry"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {entries.length === 0 ? (
                    <p className="text-center text-muted-foreground">No entries found</p>
                  ) : (
                    entries.map(entry => (
                      <Card key={entry.id} className={!entry.is_active ? "opacity-60" : undefined}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-md">{entry.title}</CardTitle>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {entry.tags?.map(tag => (
                                  <Badge key={tag} variant="outline">{tag}</Badge>
                                ))}
                              </div>
                            </div>
                            <Badge variant={entry.is_active ? "default" : "destructive"}>
                              {entry.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <p className="text-sm whitespace-pre-line">{entry.content}</p>
                        </CardContent>
                        <CardFooter className="flex justify-between pt-2">
                          <div className="text-xs text-muted-foreground">
                            Added: {new Date(entry.created_at).toLocaleDateString()}
                          </div>
                          <Button
                            size="sm"
                            variant={entry.is_active ? "destructive" : "default"}
                            onClick={() => handleToggleActive(entry)}
                          >
                            {entry.is_active ? "Disable" : "Enable"}
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KnowledgeManager;
