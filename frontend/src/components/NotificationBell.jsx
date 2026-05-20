import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, Check, Clock } from 'lucide-react';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get('/api/notifications');
      setNotifications(data.notifications);
    } catch (err) {
      console.error('Failed to fetch notifications');
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark as read');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden"
      >
        <div className="absolute inset-0 bg-brand-50 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <Bell className="relative z-10 w-5 h-5 text-slate-600 group-hover:text-brand-600 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full z-20 animate-pulse" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-[320px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Notifications</h4>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-brand-500 text-white text-[10px] font-black rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-400">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-10" />
                <p className="text-xs font-medium">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif._id}
                  className={`px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer group relative ${!notif.isRead ? 'bg-brand-50/20' : ''}`}
                  onClick={() => !notif.isRead && markAsRead(notif._id)}
                >
                  <div className="flex gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notif.isRead ? 'bg-brand-500' : 'bg-slate-200'}`} />
                    <div className="flex-1">
                      <p className={`text-[13px] leading-relaxed ${!notif.isRead ? 'font-bold text-slate-800' : 'text-slate-500 font-medium'}`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 opacity-60">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!notif.isRead && (
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 hover:text-brand-600">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-50 text-center">
              <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-600 transition-colors">
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
