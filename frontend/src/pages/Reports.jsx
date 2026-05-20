import React, { useState } from 'react';
import IndividualReport from '../components/reports/IndividualReport';
import TeamReport from '../components/reports/TeamReport';
import AbsenteeismTrends from '../components/reports/AbsenteeismTrends';
import LateArrivalHeatmap from '../components/reports/LateArrivalHeatmap';
import { useAuth } from '../context/AuthContext';
import { BarChart3, UserSquare2, Users, AlertTriangle } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('individual');

  const tabs = [
    { id: 'individual', label: 'Individual Report', icon: <UserSquare2 className="w-4 h-4 mr-2" /> },
    { id: 'team', label: 'Team Report', icon: <Users className="w-4 h-4 mr-2" />, roles: ['Admin', 'Manager'] },
    { id: 'absenteeism', label: 'Absenteeism Trends', icon: <BarChart3 className="w-4 h-4 mr-2" />, roles: ['Admin', 'Manager'] },
    { id: 'heatmap', label: 'Late Arrival Heatmap', icon: <AlertTriangle className="w-4 h-4 mr-2" />, roles: ['Admin', 'Manager'] },
  ];

  const visibleTabs = tabs.filter(tab => !tab.roles || tab.roles.includes(user?.role));

  return (
    <div className="flex flex-col h-full w-full gradient-bg">
      {/* Top Header - Glassmorphism effect */}
      <div className="px-6 py-3 flex items-center justify-between glass-panel border-b border-slate-200/60 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-brand-100 to-indigo-100 rounded-md">
            <BarChart3 className="w-4 h-4 text-brand-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">
            Reports & Analytics
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-5 animate-slide-up">
          
          {/* Welcome/Header Card - Premium but compact */}
          <div className="relative overflow-hidden bg-white rounded-xl shadow-premium border border-slate-100 p-5 transition-all duration-300 shadow-card-hover">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-brand-50 to-indigo-50 rounded-full blur-2xl -mr-16 -mt-16 opacity-70"></div>
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-2 z-10">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  Analytics Dashboard
                </h1>
                <p className="mt-1 text-slate-500 font-medium text-sm">Gain actionable insights from your organization's attendance data.</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs - Professional, medium-sized segmented control */}
          <div className="glass-panel rounded-lg shadow-sm border border-slate-200/50 p-1 overflow-x-auto hide-scrollbar sticky top-[60px] z-10">
            <nav className="flex space-x-1 min-w-max">
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ease-in-out ${
                      isActive
                        ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200/50'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80'
                    }`}
                  >
                    <span className="opacity-90">
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area with smooth fade in */}
          <div className="mt-5 animate-fade-in">
            {activeTab === 'individual' && <IndividualReport />}
            {activeTab === 'team' && <TeamReport />}
            {activeTab === 'absenteeism' && <AbsenteeismTrends />}
            {activeTab === 'heatmap' && <LateArrivalHeatmap />}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Reports;
