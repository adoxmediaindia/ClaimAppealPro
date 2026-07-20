import React from 'react';
import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileSearch } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function AppealsPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const appeals = await prisma.appeal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Appeals History
          </h1>
          <p className="text-xs text-zinc-450 mt-1">
            Review, edit, and download all generated appeal documents.
          </p>
        </div>
        <Link href="/appeals/new">
          <Button size="sm" className="flex items-center space-x-1.5 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold h-9">
            <Plus className="h-4 w-4 text-white" />
            <span>New Appeal</span>
          </Button>
        </Link>
      </div>

      <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl">
        <CardContent className="p-0">
          {appeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#101216] text-zinc-450 border border-white/[0.08]">
                <FileSearch className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-zinc-200">No appeals found</h3>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Get started by uploading your first insurance claim denial document.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#101216]">
                  <TableRow className="border-white/[0.08] hover:bg-transparent">
                    <TableHead className="text-[10px] font-bold text-zinc-400 py-3.5 uppercase tracking-wider">Appeal Document</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Insurance Payor</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Date Created</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[10px] font-bold text-zinc-400 text-right uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appeals.map((appeal) => {
                    const meta: any = appeal.extractedMetadata || {};
                    const title = meta.patientName?.value 
                      ? `Claim Appeal: ${meta.patientName.value}` 
                      : `Appeal Reference #${appeal.id.slice(0, 8)}`;
                    
                    const payor = meta.insuranceCompany?.value || 'N/A';

                    let badgeVariant: 'success' | 'secondary' | 'outline' = 'secondary';
                    if (appeal.status === 'READY' || appeal.status === 'GENERATED' || appeal.status === 'EXPORTED') {
                      badgeVariant = 'success';
                    }

                    return (
                      <TableRow key={appeal.id} className="border-white/[0.08] hover:bg-[#101216]/40 transition-colors">
                        <TableCell className="font-semibold text-zinc-200 py-3.5 text-xs">
                          {title}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-300">
                          {payor}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs font-mono">
                          {new Date(appeal.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant} className="text-[9px] uppercase font-semibold">
                            {appeal.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/appeals/${appeal.id}`}>
                            <Button variant="outline" size="sm" className="h-8 border-white/[0.08] hover:bg-white/[0.04] text-zinc-300">
                              Open
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
