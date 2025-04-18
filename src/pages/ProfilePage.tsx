
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (profile) {
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile",
        });
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not found",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          first_name: firstName.trim(), 
          last_name: lastName.trim() 
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      navigate('/');
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      <form onSubmit={handleUpdateProfile} className="max-w-md space-y-4">
        <div>
          <label htmlFor="firstName" className="block mb-2">First Name</label>
          <Input 
            id="firstName"
            value={firstName} 
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter your first name"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block mb-2">Last Name</label>
          <Input 
            id="lastName"
            value={lastName} 
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter your last name"
          />
        </div>
        <Button type="submit" className="w-full">Update Profile</Button>
      </form>
    </div>
  );
};

export default ProfilePage;
