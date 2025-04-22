
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileEditDialogProps {
  firstName: string;
  lastName: string;
  onProfileUpdate: () => void;
}

const ProfileEditDialog = ({ firstName, lastName, onProfileUpdate }: ProfileEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState(firstName);
  const [newLastName, setNewLastName] = useState(lastName);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: newFirstName.trim(),
          last_name: newLastName.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setOpen(false);
      onProfileUpdate();
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer">
          {user?.user_metadata?.avatar_url && (
            <AvatarImage src={user.user_metadata.avatar_url} />
          )}
          <AvatarFallback>{`${firstName[0]}${lastName[0]}`}</AvatarFallback>
        </Avatar>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Input
              placeholder="First Name"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              placeholder="Last Name"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">Save Changes</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditDialog;
