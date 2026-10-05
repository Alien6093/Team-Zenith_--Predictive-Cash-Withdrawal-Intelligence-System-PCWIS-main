import React from 'react';
import { BarChart2, FileText, GitCommit, Map, Landmark, ShieldCheck } from 'lucide-react';
import { TabType } from '../types/pcwis';

interface Props {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  complaintCount: number;
  auditCount: number;
}

export const TabNavigation: React.FC<Props> = ({ activeTab, onChangeTab, complaintCount, auditCount }) => {
  const tabs = [
    { id: 1 as TabType, label: 'Dashboard Overview', icon: <BarChart2 size={16} /> },
    { id: 2 as TabType, label: 'Complaint Register', icon: <FileText size={16} />, badge: complaintCount },
    { id: 3 as TabType, label: 'Entity Relationship Map', icon: <GitCommit size={16} /> },
    { id: 4 as TabType, label: 'Geographic Risk Map', icon: <Map size={16} /> },
    { id: 5 as TabType, label: 'Inter-Bank Coordination', icon: <Landmark size={16} /> },
    { id: 6 as TabType, label: 'Access & Audit Register', icon: <ShieldCheck size={16} />, badge: auditCount }
  ];

  return (
    <div className="flex overflow-x-auto border-b-2 border-gov-border mb-4 scrollbar-hide">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 whitespace-nowrap text-xs uppercase font-bold tracking-wider transition-colors border-b-4 ${
              isActive 
                ? 'border-gov-navy text-gov-navy bg-white' 
                : 'border-transparent text-gov-text-muted hover:text-gov-navy hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            <span>{tab.id}. {tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-sm text-[9px] font-mono ${isActive ? 'bg-gov-navy text-white' : 'bg-gray-200 text-gov-text'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
