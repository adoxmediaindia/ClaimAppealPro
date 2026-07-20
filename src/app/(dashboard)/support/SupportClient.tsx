'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, CheckCircle2, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { createSupportTicketAction } from '@/app/actions/support';
import { supportTicketSchema } from '@/lib/validations/support';
import { useRouter } from 'next/navigation';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: Date | string;
}

interface SupportClientProps {
  initialTickets: Ticket[];
}

export default function SupportClient({ initialTickets }: SupportClientProps) {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('idle');
    setErrorMsg(null);
    setValidationErrors({});

    const result = supportTicketSchema.safeParse({ subject, message });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as string] = issue.message;
        }
      });
      setValidationErrors(errors);
      setStatus('error');
      setErrorMsg('Please correct the validation errors below.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createSupportTicketAction({ subject, message });
        if (res.success) {
          setStatus('success');
          setSubject('');
          setMessage('');
          router.refresh();
        } else {
          setStatus('error');
          setErrorMsg(res.error?.message || 'Failed to submit support ticket.');
          if (res.error?.details) {
            const detailErrors: Record<string, string> = {};
            Object.entries(res.error.details).forEach(([key, val]) => {
              if (Array.isArray(val) && val[0]) {
                detailErrors[key] = val[0];
              }
            });
            setValidationErrors(detailErrors);
          }
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-3 animate-in fade-in duration-300">
      {/* Ticket creation form */}
      <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl md:col-span-2">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">Open a Technical Ticket</CardTitle>
            <CardDescription className="text-xs text-zinc-455">
              Provide details about the platform issue or query you are experiencing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'success' && (
              <div className="flex items-center space-x-2 rounded-lg border border-emerald-900 bg-[#064E3B]/20 p-3 text-xs text-[#10B981] animate-in fade-in">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#10B981]" />
                <span>Ticket successfully logged. Our engineering team has been notified.</span>
              </div>
            )}

            {status === 'error' && errorMsg && (
              <div className="flex items-center space-x-2 rounded-lg border border-rose-900 bg-rose-955/20 p-3 text-xs text-rose-450 animate-in fade-in">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-450" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="subject" className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Subject</label>
              <input
                id="subject"
                name="subject"
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (validationErrors.subject) {
                    setValidationErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.subject;
                      return copy;
                    });
                  }
                }}
                placeholder="e.g. Failure generating appeal for Aetna Denial"
                className={`w-full px-3 py-2 text-xs rounded border bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all ${
                  validationErrors.subject ? 'border-rose-900 focus:border-rose-850 focus:ring-rose-900/30' : 'border-white/[0.08]'
                }`}
                disabled={isPending}
              />
              {validationErrors.subject && (
                <p className="text-[10px] text-rose-455 mt-1">{validationErrors.subject}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="message" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Message Description</label>
              <textarea
                id="message"
                name="message"
                rows={5}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (validationErrors.message) {
                    setValidationErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.message;
                      return copy;
                    });
                  }
                }}
                placeholder="Provide details about the bug, including error messages or context..."
                className={`w-full px-3 py-2 text-xs rounded border bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all ${
                  validationErrors.message ? 'border-rose-900 focus:border-rose-850 focus:ring-rose-900/30' : 'border-white/[0.08]'
                }`}
                disabled={isPending}
              />
              {validationErrors.message && (
                <p className="text-[10px] text-rose-455 mt-1">{validationErrors.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t border-white/[0.05] p-4 bg-[#101216]/50">
            <Button type="submit" size="sm" disabled={isPending} className="font-bold text-white bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 h-9 px-4 active:scale-[0.98]">
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Submitting...
                </>
              ) : (
                'Submit Ticket'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Ticket history panel */}
      <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl h-fit">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">Your Tickets</CardTitle>
          <CardDescription className="text-xs text-zinc-450">
            Active and resolved technical support inquiries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
          {initialTickets.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-white/[0.08] rounded bg-[#08090B]/20">
              <HelpCircle className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-550">No support tickets found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {initialTickets.map((ticket) => {
                let badgeVariant: 'warning' | 'secondary' | 'success' = 'warning';
                if (ticket.status === 'IN_PROGRESS') {
                  badgeVariant = 'secondary';
                } else if (ticket.status === 'RESOLVED') {
                  badgeVariant = 'success';
                }

                return (
                  <div key={ticket.id} className="p-3 border border-white/[0.08] rounded-lg bg-[#08090B]/40 space-y-2 hover:border-white/[0.12] transition-colors">
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1 pr-2">
                        {ticket.subject}
                      </h4>
                      <Badge variant={badgeVariant} className="text-[9px] uppercase font-bold scale-90 shrink-0 tracking-wider">
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-zinc-450 line-clamp-2">
                      {ticket.message}
                    </p>
                    <div className="flex items-center text-[9px] text-zinc-550 pt-1 font-mono">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
