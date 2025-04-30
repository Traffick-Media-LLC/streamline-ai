
# Streamline Group Portal

## Google Drive Integration Setup

To enable the Google Drive integration for file search and document access, follow these steps:

### 1. Create a Google Cloud Service Account

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API
4. Create a service account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Name your service account (e.g., "streamline-portal")
   - Grant it appropriate permissions (at minimum, "Drive API > Drive API Reader")
   - Create a JSON key for this service account

### 2. Set up Supabase Secrets

Add these secrets to your Supabase project:

1. `GOOGLE_DRIVE_PRIVATE_KEY`: Copy the entire private key from the JSON file, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers
2. `GOOGLE_DRIVE_CLIENT_EMAIL`: The service account email address from the JSON file
3. `GOOGLE_SHARED_DRIVE_ID`: (Optional) If using a shared drive, enter the ID of the drive

To add these secrets:
- Go to your Supabase project dashboard
- Navigate to Settings > API > Edge Functions
- Add each secret under "Edge Function Secrets"

### 3. Share Google Drive Files with the Service Account

1. Locate files or folders in your Google Drive that you want to access
2. Right-click > Share
3. Add the service account email address as an editor or viewer
4. For shared drives, add the service account as a member of the shared drive

### 4. Testing the Integration

After setting up:
1. Try searching for a file in the chat interface
2. If issues persist, check the Edge Function logs in the Supabase dashboard

## Troubleshooting

If you encounter errors:
- Verify the service account has the correct permissions
- Ensure the private key is properly formatted in Supabase secrets
- Check that files are properly shared with the service account

For more detailed setup instructions and troubleshooting, refer to the Google Drive API documentation.
