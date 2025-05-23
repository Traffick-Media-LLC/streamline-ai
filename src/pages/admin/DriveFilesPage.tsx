
import React from 'react';
import DriveFilesCsvUploader from '../../components/DriveFilesCsvUploader';

const DriveFilesPage: React.FC = () => {
  const handleUploadComplete = () => {
    // We could refresh file list or show a success message here
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Drive Files Management</h1>
      
      <div className="bg-card rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Upload Files Data</h2>
        <DriveFilesCsvUploader onComplete={handleUploadComplete} />
      </div>

      {/* File list can be added here in the future */}
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">File Records</h2>
        <p className="text-muted-foreground">Upload files using the CSV uploader above to see them listed here.</p>
        {/* Future enhancement: add a data table to display files */}
      </div>
    </div>
  );
};

export default DriveFilesPage;
