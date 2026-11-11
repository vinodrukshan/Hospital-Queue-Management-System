import React from 'react';
import { QueueEntry } from '../../types/database';
import { hardwareService } from '../../services/hardwareService';
import { Printer, X, CheckCircle, Clock, MapPin, AlertCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatDateTime } from '../../lib/utils';

interface PrintTokenModalProps {
  token: QueueEntry | null;
  isOpen: boolean;
  onClose: () => void;
  clinicName?: string;
  patientName?: string;
}

export const PrintTokenModal: React.FC<PrintTokenModalProps> = ({
  token,
  isOpen,
  onClose,
  clinicName,
  patientName,
}) => {
  if (!isOpen || !token) return null;

  const handlePrint = () => {
    hardwareService.printTokenReceipt(token, clinicName, patientName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="p-4 bg-sky-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5" />
            <h3 className="font-semibold text-base">Print Official Token</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Mock Preview */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-sm text-center font-mono">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">IDH / NIID Hospital</div>
            <div className="text-[10px] text-slate-400">Project G05 Queue Ticket</div>
            <div className="my-2 border-t border-dashed border-slate-300" />
            
            <div className="text-4xl font-extrabold text-slate-900 tracking-tight my-2">
              {token.token_number}
            </div>

            <div className="text-sm font-semibold text-sky-700">
              {clinicName || 'General Outpatient Clinic'}
            </div>
            <div className="text-xs text-slate-600 flex items-center justify-center mt-1">
              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {token.counter_or_room || 'Room 101'}
            </div>

            <div className="my-3 border-t border-dashed border-slate-300" />

            <div className="text-left text-xs space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Issued:</span>
                <span className="font-medium text-slate-900">{formatDateTime(token.checked_in_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Priority:</span>
                <span className="font-medium capitalize text-slate-900">{token.priority}</span>
              </div>
              {patientName && (
                <div className="flex justify-between">
                  <span>Patient:</span>
                  <span className="font-medium text-slate-900 truncate max-w-[140px]">{patientName}</span>
                </div>
              )}
            </div>

            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="text-[10px] text-slate-500 italic">
              Please wait until your token is called on the waiting hall display board.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-white flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium flex items-center space-x-2 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
