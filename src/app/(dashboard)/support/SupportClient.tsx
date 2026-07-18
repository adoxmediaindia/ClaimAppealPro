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
    <div className="grid gap-6 md:grid-cols-3">
      {/* Ticket creation form */}
      <Card className="border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm shadow-xl md:col-span-2">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-base font-bold text-zinc-100 tracking-tight">Open a Technical Ticket</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Provide details about the platform issue or query you are experiencing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'success' && (
              <div className="flex items-center space-x-2 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-xs text-emerald-400 animate-in fade-in duration-200">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
                <span>Ticket successfully logged. Our engineering team has been notified.</span>
              </div>
            )}

            {status === 'error' && errorMsg && (
              <div className="flex items-center space-x-2 rounded-lg border border-rose-900 bg-rose-955/20 p-3 text-xs text-rose-455 animate-in fade-in duration-200">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="subject" className="text-xs font-semibold text-zinc-400">Subject</label>
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
                className={`w-full px-3 py-1.5 text-xs rounded border bg-zinc-955 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                  validationErrors.subject ? 'border-rose-900' : 'border-zinc-800'
                }`}
              />
              {validationErrors.subject && (
                <p className="text-[10px] text-rose-455">{validationErrors.subject}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="message" className="text-xs font-semibold text-zinc-400">Message Description</label>
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
                className={`w-full px-3 py-1.5 text-xs rounded border bg-zinc-955 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                  validationErrors.message ? 'border-rose-900' : 'border-zinc-800'
                }`}
              />
              {validationErrors.message && (
                <p className="text-[10px] text-rose-455">{validationErrors.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t border-zinc-800/40 pt-4">
            <Button type="submit" size="sm" disabled={isPending} className="font-semibold text-zinc-950">
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
      <Card className="border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm shadow-xl h-fit">
        <CardHeader>
          <CardTitle className="text-base font-bold text-zinc-100 tracking-tight">Your Tickets</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Active and resolved technical support inquiries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
          {initialTickets.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-zinc-800 rounded bg-zinc-950/20">
              <HelpCircle className="h-6 w-6 text-zinc-650 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No support tickets found.</p>
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
                  <div key={ticket.id} className="p-3 border border-zinc-800 rounded-lg bg-zinc-950/40 space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1 pr-2">
                        {ticket.subject}
                      </h4>
                      <Badge variant={badgeVariant} className="text-[9px] uppercase font-semibold scale-90 shrink-0">
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-zinc-405 line-clamp-2">
                      {ticket.message}
                    </p>
                    <div className="flex items-center text-[9px] text-zinc-500 pt-1">
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
