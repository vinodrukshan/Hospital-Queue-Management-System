import React, { useState } from 'react';
import { useRealtime } from '../context/RealtimeContext';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { formatDateTime, timeAgo } from '../lib/utils';
import { Bell, CheckCheck, Filter, ArrowLeft, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotificationHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtime();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = notifications.filter(n => (filter === 'unread' ? !n.is_read : true));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/" className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Notification History</h1>
              <p className="text-xs text-slate-500">Persistent real-time audit notifications and alerts</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                filter === 'unread' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5 inline mr-1" />
              {filter === 'unread' ? 'Showing Unread' : 'Filter Unread'}
            </button>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              No notifications to display in this view.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => !item.is_read && markAsRead(item.id)}
                className={`p-4 transition-colors flex items-start justify-between cursor-pointer ${
                  !item.is_read ? 'bg-sky-50/50 hover:bg-sky-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {!item.is_read && <span className="w-2 h-2 rounded-full bg-sky-600" />}
                    <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono uppercase">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{item.message}</p>
                </div>

                <div className="text-right text-[11px] text-slate-400 shrink-0 ml-4 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{timeAgo(item.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
