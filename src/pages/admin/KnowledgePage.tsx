
import React from 'react';
import KnowledgeManager from '../../components/KnowledgeManager';

const KnowledgePage: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Knowledge Base Management</h1>
      <KnowledgeManager />
    </div>
  );
};

export default KnowledgePage;
