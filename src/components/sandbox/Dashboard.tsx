import React from 'react';
import { ActiveProcessesCard } from './ActiveProcessesCard';
import { StoredProjectsCard } from './StoredProjectsCard';
import { StorageVaultCard } from './StorageVaultCard';
import { SandboxProject } from '../../hooks/useSandboxStore';

interface DashboardProps {
  projects: SandboxProject[];
  isArabic: boolean;
  onOpenProject: (id: string) => void;
  onStartProject: (id: string) => void;
  onStopProject: (id: string) => void;
  onRestartProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onCreateNewClick: () => void;
  onUploadZip: (file: File) => void;
  onUploadPy: (file: File) => void;
  onOpenAdminDashboard?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  isArabic,
  onOpenProject,
  onStartProject,
  onStopProject,
  onRestartProject,
  onDeleteProject,
  onRenameProject,
  onCreateNewClick,
  onUploadZip,
  onUploadPy,
  onOpenAdminDashboard,
}) => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6" dir="ltr">
      {/* Left Column: Active Processes & Storage Vault */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <ActiveProcessesCard
          projects={projects}
          isArabic={isArabic}
          onOpenProject={onOpenProject}
          onStopProject={onStopProject}
          onRestartProject={onRestartProject}
          onDeleteProject={onDeleteProject}
        />
        <StorageVaultCard
          projects={projects}
          isArabic={isArabic}
          onUploadZip={onUploadZip}
          onUploadPy={onUploadPy}
          onOpenProject={onOpenProject}
          onStartProject={onStartProject}
          onRenameProject={onRenameProject}
          onDeleteProject={onDeleteProject}
          onOpenAdminDashboard={onOpenAdminDashboard}
        />
      </div>

      {/* Right Column: Stored Projects */}
      <div className="flex flex-col">
        <StoredProjectsCard
          projects={projects}
          isArabic={isArabic}
          onOpenProject={onOpenProject}
          onStartProject={onStartProject}
          onStopProject={onStopProject}
          onDeleteProject={onDeleteProject}
          onCreateNewClick={onCreateNewClick}
        />
      </div>
    </div>
  );
};
