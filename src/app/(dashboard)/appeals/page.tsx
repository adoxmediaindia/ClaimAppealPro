import React from 'react';
import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileSearch } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Enforce fresh database fetches

export default async function AppealsPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch all appeals for this user from database
  const appeals = await prisma.appeal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Appeals History
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Review, edit, and download all generated appeal documents.
          </p>
        </div>
        <Link href="/appeals/new">
          <Button size="sm" className="flex items-center space-x-1">
            <Plus className="h-4 w-4 text-zinc-950" />
            <span className="font-semibold text-zinc-950">New Appeal</span>
          </Button>
        </Link>
      </div>

      <Card className="border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
        <CardContent className="p-0">
          {appeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-850/50 text-zinc-400 border border-zinc-800">
                <FileSearch className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-200">No appeals found</h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  Get started by uploading your first insurance claim denial document.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-950">
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-xs font-semibold text-zinc-400 py-3.5">Appeal Document</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-400">Insurance Payor</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-400">Date Created</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-400">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-400 text-right">Actions</TableHead>
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
                      <TableRow key={appeal.id} className="border-zinc-850 hover:bg-zinc-900/40 transition-colors">
                        <TableCell className="font-medium text-zinc-200 py-3 text-xs">
                          {title}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-300">
                          {payor}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs font-mono">
                          {new Date(appeal.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant} className="text-[10px] uppercase font-semibold">
                            {appeal.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/appeals/${appeal.id}`}>
                            <Button variant="outline" size="sm" className="h-8 border-zinc-800 hover:bg-zinc-900 text-zinc-300">
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
