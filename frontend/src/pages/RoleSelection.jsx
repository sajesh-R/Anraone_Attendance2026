import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, PieChart, Building2, Package } from 'lucide-react';

const RoleSelection = () => {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'admin',
      title: 'System Admin',
      description: 'Manage infrastructure & users',
      icon: Shield,
    },
    {
      id: 'hr',
      title: 'HR Manager',
      description: 'Employee tracking & reports',
      icon: PieChart,
    },
    {
      id: 'manager',
      title: 'Branch Manager',
      description: 'Branch operations & approvals',
      icon: Building2,
    },
    {
      id: 'employee',
      title: 'Employee Portal',
      description: 'Manage attendance & requests',
      icon: Package, // Using Package to match the screenshot, or Users could be better
    },
  ];

  const handleRoleSelect = (roleId) => {
    // In a real app, this might update context, set a cookie, or redirect to a specific dashboard
    console.log(`Selected role: ${roleId}`);
    navigate('/login', { state: { role: roleId } });
  };

  return (
    <div className="min-h-screen bg-[#040822] flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Abstract overlapping curved lines (simulated with rotated ovals) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[50vh] border-t border-b border-blue-400/5 rounded-[100%] rotate-[-15deg] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[80vh] border-t border-b border-indigo-400/5 rounded-[100%] rotate-[10deg] pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl px-4 py-12">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="mb-6 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-md">
            <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-slate-300 uppercase">
              Anraone Attendance
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-4 tracking-tight">
            Select Your Portal
          </h1>
          
          <p className="text-sm sm:text-base text-slate-400 font-light">
            Choose your workspace to continue to the system
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl mx-auto">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className="group flex flex-col items-center text-center p-8 rounded-2xl bg-[#0D143A]/80 border border-[#232D62] backdrop-blur-md transition-all duration-300 hover:bg-[#141C48] hover:border-[#334185] hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.2)] hover:-translate-y-1"
              >
                <div className="mb-5 p-3.5 rounded-xl bg-[#17225A] text-[#5582FF] transition-transform duration-300 group-hover:scale-110 group-hover:text-blue-400">
                  <Icon strokeWidth={1.5} size={26} />
                </div>
                <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase mb-2">
                  {role.title}
                </h3>
                <p className="text-xs text-slate-400 font-light">
                  {role.description}
                </p>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default RoleSelection;
