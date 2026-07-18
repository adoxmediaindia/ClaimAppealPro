import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center space-x-2">
          <HelpCircle className="h-6 w-6 text-zinc-100 mr-2" />
          <span>Help & Support Support</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Open support tickets or consult platform technical documentation.
        </p>
      </div>

      <Card className="border border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Open a Technical Ticket</CardTitle>
          <CardDescription className="text-xs">Provide details about the issue you are experiencing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">Subject</label>
            <input
              type="text"
              placeholder="e.g. Issue generating letter"
              className="w-full px-3 py-1.5 text-xs rounded border border-zinc-800 bg-zinc-950 text-zinc-300 placeholder-zinc-650 focus:outline-none"
              disabled
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">Message Description</label>
            <textarea
              rows={4}
              placeholder="Provide a detailed description of the bug or inquiry..."
              className="w-full px-3 py-1.5 text-xs rounded border border-zinc-800 bg-zinc-950 text-zinc-300 placeholder-zinc-650 focus:outline-none"
              disabled
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button size="sm" disabled>Submit Ticket</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
