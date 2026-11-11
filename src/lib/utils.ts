import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  } catch (e) {
    return dateString;
  }
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'MMM dd, yyyy hh:mm a');
  } catch (e) {
    return dateString;
  }
}

export function formatTime(timeString?: string | null): string {
  if (!timeString) return 'N/A';
  try {
    if (timeString.includes('T')) {
      return format(parseISO(timeString), 'hh:mm a');
    }
    const [h, m] = timeString.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  } catch (e) {
    return timeString;
  }
}

export function timeAgo(dateString?: string | null): string {
  if (!dateString) return '';
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
  } catch (e) {
    return '';
  }
}

export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'hospital_admin':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'clinic_head':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'doctor':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'receptionist':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'technical_maintainer':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'patient':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getQueueStatusColor(status: string): string {
  switch (status) {
    case 'waiting':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'called':
      return 'bg-blue-600 text-white animate-pulse shadow-md';
    case 'recalled':
      return 'bg-rose-600 text-white animate-pulse shadow-md';
    case 'consulting':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'cancelled':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    case 'no_show':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

export function getPriorityBadgeColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500 text-white font-bold';
    case 'elderly':
      return 'bg-amber-500 text-white font-medium';
    case 'child':
      return 'bg-teal-500 text-white font-medium';
    case 'normal':
    default:
      return 'bg-slate-200 text-slate-800';
  }
}
