import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import { useRealtime } from '../../context/RealtimeContext';
import { timeAgo } from '../../lib/utils';
import { Link } from 'react-router-dom';

export const NotificationDropdown: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, pushPermissionStatus, requestPushPermission } = useRealtime();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-rose-600 rounded-full animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden transform transition-all">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-800 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-sky-100 text-sky-800 text-xs px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-sky-600 hover:text-sky-800 font-medium flex items-center space-x-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {pushPermissionStatus === 'default' && (
            <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center justify-between">
              <span>Enable browser push alerts?</span>
              <button
                onClick={() => requestPushPermission()}
                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-[11px]"
              >
                Enable
              </button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 6).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                  className={`p-3.5 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                    !notif.is_read ? 'bg-sky-50/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-xs text-slate-900">{notif.title}</span>
                    <span className="text-[11px] text-slate-400 flex items-center ml-2 shrink-0">
                      <Clock className="w-3 h-3 mr-1" />
                      {timeAgo(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{notif.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-sky-600 hover:text-sky-800 flex items-center justify-center space-x-1"
            >
              <span>View full notification history</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
