
import { supabase } from '@/integrations/supabase/client';

// This is a utility function for testing purposes only
// It directly sets the organization chart image in app_settings
export const setTestOrgChartImage = async () => {
  try {
    // Create a test settings object
    const testSettings = {
      url: "https://placehold.co/1200x800?text=Test+Organization+Chart",
      filename: "test_org_chart.png",
      updated_at: new Date().toISOString(),
      fileType: "image"
    };
    
    // Update the app_settings table directly
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({ 
        id: 'org_chart_image',
        value: testSettings,
        updated_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error setting test org chart image:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (e) {
    console.error('Exception setting test org chart image:', e);
    return { success: false, error: e };
  }
};

// Get the current org chart image settings directly from the database
export const getOrgChartImageSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 'org_chart_image')
      .single();
      
    if (error) {
      console.error('Error getting org chart image settings:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (e) {
    console.error('Exception getting org chart image settings:', e);
    return { success: false, error: e };
  }
};
