'use client';

import {
  User,
  Phone,
  MapPin,
  Building,
  Mail,
  FileText,
  AlertTriangle,
  CheckCircle,
  Flag,
  Lightbulb,
  Ticket,
} from 'lucide-react';
import type { LiveSheetData } from '@/types';

// ── Field icon mapping ──
function getFieldIcon(field: string) {
  const lower = field.toLowerCase();
  if (lower.includes('name')) return User;
  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('number')) return Phone;
  if (lower.includes('location') || lower.includes('city') || lower.includes('address') || lower.includes('area')) return MapPin;
  if (lower.includes('org') || lower.includes('company') || lower.includes('department')) return Building;
  if (lower.includes('email')) return Mail;
  return FileText;
}

// ── Note category config ──
const NOTE_CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: typeof FileText }> = {
  note: { label: 'Note', color: 'text-[#8888a8]', bg: 'bg-[#1a1a2e]', Icon: FileText },
  action_item: { label: 'Action', color: 'text-amber-400', bg: 'bg-amber-500/10', Icon: Flag },
  decision: { label: 'Decision', color: 'text-emerald-400', bg: 'bg-emerald-500/10', Icon: CheckCircle },
  concern: { label: 'Concern', color: 'text-red-400', bg: 'bg-red-500/10', Icon: AlertTriangle },
  milestone: { label: 'Milestone', color: 'text-orange-400', bg: 'bg-orange-500/10', Icon: Lightbulb },
};

interface LiveInfoSheetProps {
  data: LiveSheetData;
  isActive: boolean;
}

export default function LiveInfoSheet({ data, isActive }: LiveInfoSheetProps) {
  const hasContent =
    data.extractedFields.length > 0 ||
    data.notes.length > 0 ||
    data.tickets.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#262640] px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold font-[family-name:var(--font-display)] text-[#e8e8f0]">Live Info Sheet</h3>
          {isActive && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>
        <span className="rounded-full bg-[#1a1a2e] px-2.5 py-0.5 text-xs text-[#8888a8]">
          {data.extractedFields.length + data.notes.length + data.tickets.length} items
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 200px)', minHeight: '300px' }}>
        {!hasContent && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <FileText className="h-10 w-10 text-[#262640]" />
            <p className="mt-3 text-sm text-[#55557a]">
              {isActive
                ? 'AI will fill this during the call...'
                : 'Start a call to see extracted info here.'}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* ── Extracted Fields ── */}
          {data.extractedFields.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#55557a]">
                Extracted Information
              </p>
              <div className="space-y-1.5">
                {data.extractedFields.map((field, idx) => {
                  const Icon = getFieldIcon(field.field);
                  return (
                    <div
                      key={`${field.field}-${idx}`}
                      className="flex items-center gap-2.5 rounded-xl border border-orange-500/15 bg-orange-500/5 px-3 py-2 animate-fade-in-up"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                      <span className="text-xs font-medium text-[#8888a8] capitalize">
                        {field.field.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-xs font-semibold text-[#e8e8f0]">{field.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Notes & Observations ── */}
          {data.notes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#55557a]">
                Observations
              </p>
              <div className="space-y-1.5">
                {data.notes.map((note, idx) => {
                  const config = NOTE_CATEGORY_CONFIG[note.category] || NOTE_CATEGORY_CONFIG.note;
                  const NoteIcon = config.Icon;
                  return (
                    <div
                      key={`note-${idx}`}
                      className={`flex items-start gap-2.5 rounded-xl border border-[#1e1e35] ${config.bg} px-3 py-2`}
                    >
                      <NoteIcon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${config.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-[10px] text-[#55557a]">
                            {new Date(note.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#e8e8f0]">
                          {note.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Tickets ── */}
          {data.tickets.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#55557a]">
                Tickets Created
              </p>
              <div className="space-y-1.5">
                {data.tickets.map((ticket, idx) => {
                  const priorityColors: Record<string, string> = {
                    low: 'text-[#8888a8] bg-[#1a1a2e] border-[#1e1e35]',
                    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                    high: 'text-red-400 bg-red-500/10 border-red-500/30',
                    critical: 'text-red-500 bg-red-500/15 border-red-500/40',
                  };
                  const pColor = priorityColors[ticket.priority] || priorityColors.medium;

                  return (
                    <div
                      key={`ticket-${idx}`}
                      className={`rounded-xl border ${pColor} px-3 py-2`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-3.5 w-3.5 text-violet-400" />
                          <span className="text-xs font-bold text-violet-300">
                            {ticket.ticketId}
                          </span>
                        </div>
                        <span className="rounded-full bg-[#1a1a2e] px-2 py-0.5 text-[10px] font-medium uppercase text-[#8888a8]">
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#e8e8f0]">{ticket.description}</p>
                      <p className="mt-0.5 text-[10px] text-[#55557a] capitalize">
                        {ticket.category.replace(/_/g, ' ')} &middot;{' '}
                        {new Date(ticket.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
