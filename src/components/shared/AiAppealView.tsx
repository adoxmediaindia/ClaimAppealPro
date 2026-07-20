'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Undo2,
  FileText,
  Check,
  ShieldCheck,
  Sparkles,
  DollarSign,
  Activity,
  Printer,
  Download,
  Eye,
  ExternalLink
} from 'lucide-react';

import { generateAppealAction, rollbackAppealVersionAction } from '@/app/actions/ai';
import { generatePdfExportAction, getPdfExportsAction, getPdfSignedUrlAction } from '@/app/actions/pdf';

interface AppealVersionData {
  id: string;
  versionNumber: number;
  letterContent: string;
  createdAt: Date | string;
  editorState?: any;
}

interface AiAppealViewProps {
  appealId: string;
  versions: AppealVersionData[];
  aiGenerations: any[];
  initialPdfExports?: any[];
}

export default function AiAppealView({
  appealId,
  versions,
  aiGenerations,
  initialPdfExports = [],
}: AiAppealViewProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeVersionNumber, setActiveVersionNumber] = useState<number>(
    versions[0]?.versionNumber || 1
  );

  const [pdfExports, setPdfExports] = useState<any[]>(initialPdfExports);
  const [selectedTemplate, setSelectedTemplate] = useState<'default' | 'professional'>('default');
  const [selectedSize, setSelectedSize] = useState<'letter' | 'a4'>('letter');
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const activeVersion = versions.find((v) => v.versionNumber === activeVersionNumber) || versions[0];

  const latestGen = aiGenerations[0] || {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cost: 0,
    promptTemplateUsed: 'v1.0',
    modelUsed: 'gpt-4o',
  };

  useEffect(() => {
    async function loadPdfExports() {
      try {
        const res = await getPdfExportsAction(appealId);
        if (res.success && res.data) {
          setPdfExports(res.data);
        }
      } catch (err) {
        // Fail silently on load
      }
    }
    loadPdfExports();
  }, [appealId]);

  const handleRegenerate = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateAppealAction(appealId);
      if (res.success && res.data) {
        setActiveVersionNumber(res.data.versionNumber);
        window.location.reload();
      } else {
        setError(res.error?.message || 'Failed to regenerate appeal letter.');
      }
    });
  };

  const handleRollback = (versionNumber: number) => {
    setError(null);
    startTransition(async () => {
      const res = await rollbackAppealVersionAction(appealId, versionNumber);
      if (res.success && res.data) {
        setActiveVersionNumber(res.data.versionNumber);
        window.location.reload();
      } else {
        setError(res.error?.message || 'Failed to rollback version.');
      }
    });
  };

  const handleGeneratePdf = async () => {
    setError(null);
    setPdfLoading(true);
    try {
      const res = await generatePdfExportAction(
        appealId,
        activeVersionNumber,
        selectedTemplate,
        selectedSize
      );
      if (res.success && res.data) {
        const listRes = await getPdfExportsAction(appealId);
        if (listRes.success && listRes.data) {
          setPdfExports(listRes.data);
        }
        const urlRes = await getPdfSignedUrlAction(appealId, res.data.id);
        if (urlRes.success && urlRes.data) {
          setPreviewUrl(urlRes.data);
        }
      } else {
        setError(res.error?.message || 'Failed to generate PDF export.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during PDF generation.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePreviewPdf = async (exportId: string) => {
    setError(null);
    try {
      const res = await getPdfSignedUrlAction(appealId, exportId);
      if (res.success && res.data) {
        setPreviewUrl(res.data);
      } else {
        setError(res.error?.message || 'Failed to generate signed url.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signed URL generation.');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5 items-start animate-in fade-in duration-300">
      
      {/* 1. Left Viewport: Document Viewer */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="border border-white/[0.08] bg-[#14171C] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#4F8CFF] via-zinc-500 to-[#6EE7F9]" />
          
          <CardHeader className="border-b border-white/[0.05] pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                <FileText className="h-4.5 w-4.5 text-[#4F8CFF]" />
                <span>Generated Appeal Letter</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-450">
                Review and verify clinical formatting arguments.
              </CardDescription>
            </div>
            
            <span className="text-[9px] font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Version {activeVersion?.versionNumber} (Latest: {versions[0]?.versionNumber})
            </span>
          </CardHeader>

          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 p-3 text-xs rounded border border-rose-900 bg-rose-955/20 text-rose-450">
                {error}
              </div>
            )}

            {/* Letter Body Textbox */}
            <div className="w-full bg-[#08090B] border border-white/[0.08] rounded-md p-6 font-mono text-xs text-zinc-350 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto min-h-[300px] select-text">
              {activeVersion?.letterContent || 'No letter content has been generated.'}
            </div>

            {/* PDF Print Preview Frame */}
            {previewUrl && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between items-center bg-[#101216] border border-white/[0.08] rounded px-4 py-2 text-xs">
                  <span className="font-semibold text-zinc-300 flex items-center">
                    <Printer className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
                    PDF Print Preview Mode
                  </span>
                  <div className="flex items-center space-x-3">
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-[#10B981] hover:underline font-bold"
                    >
                      <span>Open in tab</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => setPreviewUrl(null)}
                      className="text-zinc-500 hover:text-zinc-300 ml-1 font-semibold"
                    >
                      Close Preview
                    </button>
                  </div>
                </div>
                <div className="w-full h-[600px] border border-white/[0.08] rounded-md overflow-hidden bg-zinc-900">
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-none"
                    title="PDF Print Preview"
                    id="pdfPreviewIframe"
                  />
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-white/[0.05] py-3.5 flex items-center justify-between text-[10px] text-zinc-550">
            <span className="flex items-center space-x-1.5 font-semibold">
              <ShieldCheck className="h-4 w-4 text-[#10B981]" />
              <span>HIPAA Compliant Clinician Seal</span>
            </span>
            <span className="font-mono">Generated on {activeVersion ? new Date(activeVersion.createdAt).toLocaleDateString() : 'N/A'}</span>
          </CardFooter>
        </Card>
      </div>

      {/* 2. Right Viewport: Controls & History */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Document Rendering & PDF Generation Frame */}
        <Card className="border border-white/[0.08] bg-[#14171C]">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white flex items-center space-x-2">
              <Printer className="h-4 w-4 text-zinc-400" />
              <span>Document Export Options</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-450">Compile and export print-ready PDF formats.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-455 tracking-wider">Styling Template</label>
              <select
                value={selectedTemplate}
                id="templateSelect"
                onChange={(e) => setSelectedTemplate(e.target.value as any)}
                className="w-full bg-[#08090B] border border-white/[0.08] rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-white/[0.15]"
              >
                <option value="default">Default Template (Modern Sans)</option>
                <option value="professional">Professional Template (Serif Legal)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-455 tracking-wider">Page Size Layout</label>
              <select
                value={selectedSize}
                id="pageSizeSelect"
                onChange={(e) => setSelectedSize(e.target.value as any)}
                className="w-full bg-[#08090B] border border-white/[0.08] rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-white/[0.15]"
              >
                <option value="letter">US Letter Size</option>
                <option value="a4">A4 Page Size</option>
              </select>
            </div>

            <Button
              onClick={handleGeneratePdf}
              disabled={pdfLoading || isPending}
              id="generatePdfButton"
              className="w-full flex items-center justify-center space-x-2 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold h-9 shadow-lg shadow-[#4F8CFF]/10 active:scale-[0.98]"
            >
              <Printer className={`h-4 w-4 text-white ${pdfLoading ? 'animate-pulse' : ''}`} />
              <span>
                {pdfLoading ? 'Generating PDF Document...' : 'Generate PDF Document'}
              </span>
            </Button>
          </CardContent>
        </Card>

        {/* PDF Version Archive History */}
        <Card className="border border-white/[0.08] bg-[#14171C]">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">PDF Export Archive History</CardTitle>
            <CardDescription className="text-xs text-zinc-450">Securely download generated PDF files.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 border-t border-white/[0.05] max-h-48 overflow-y-auto">
            {pdfExports.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                No PDF documents exported yet.
              </div>
            ) : (
              pdfExports.map((exp) => (
                <div
                  key={exp.id}
                  className="flex w-full items-center justify-between px-4 py-3 border-b border-white/[0.05] text-xs hover:bg-white/[0.01]"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-zinc-200">
                      PDF Export (AI v#{exp.appealVersionNumber})
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Template: {exp.templateName} ({exp.pageSize}) • {(exp.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreviewPdf(exp.id)}
                      className="h-7 text-[10px] px-2 py-0 border-white/[0.08] text-zinc-350 hover:bg-white/[0.04]"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const urlRes = await getPdfSignedUrlAction(appealId, exp.id);
                        if (urlRes.success && urlRes.data) {
                          window.open(urlRes.data, '_blank');
                        }
                      }}
                      className="h-7 text-[10px] px-2 py-0 border-white/[0.08] text-[#10B981] hover:bg-[#064E3B]/20"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Get
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Actions panel */}
        <Card className="border border-white/[0.08] bg-[#14171C]">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">Appeal Engine Operations</CardTitle>
            <CardDescription className="text-xs text-zinc-450">Trigger document actions and prompt evaluations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleRegenerate}
              disabled={isPending}
              className="w-full flex items-center justify-center space-x-2 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold h-9 active:scale-[0.98]"
            >
              <RefreshCw className={`h-4 w-4 text-white ${isPending ? 'animate-spin' : ''}`} />
              <span>Regenerate Letter</span>
            </Button>
          </CardContent>
        </Card>

        {/* Versions selector card */}
        <Card className="border border-white/[0.08] bg-[#14171C]">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">Version History Archive</CardTitle>
            <CardDescription className="text-xs text-zinc-455">Roll back or restore previous clinical drafts.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 border-t border-white/[0.05] max-h-48 overflow-y-auto">
            {versions.map((ver) => {
              const isActive = ver.versionNumber === activeVersionNumber;
              return (
                <div
                  key={ver.id}
                  onClick={() => setActiveVersionNumber(ver.versionNumber)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors text-xs cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-zinc-200">
                      Draft Version #{ver.versionNumber} {isActive && '(Viewing)'}
                    </p>
                    <p className="text-[10px] text-zinc-550 font-mono">
                      {new Date(ver.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isActive ? (
                      <Check className="h-4 w-4 text-[#10B981]" />
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRollback(ver.versionNumber);
                        }}
                        disabled={isPending}
                        className="h-7 text-[10px] px-2 py-0 border-white/[0.08] text-zinc-300 hover:text-white"
                      >
                        <Undo2 className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Audit Metrics Panel */}
        <Card className="border border-white/[0.08] bg-[#14171C]">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-[#6EE7F9]" />
              <span>Generation Metadata</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-450">Usage audit parameters logged for billing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-xs">
            <div className="flex justify-between items-center py-2.5 border-b border-white/[0.05] text-zinc-450">
              <span className="flex items-center"><Activity className="h-3.5 w-3.5 mr-1.5" /> Model Used</span>
              <span className="font-semibold text-zinc-200 font-mono">{latestGen.modelUsed || 'gpt-4o'}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-white/[0.05] text-zinc-455">
              <span>Prompt Version</span>
              <span className="font-semibold text-zinc-200 font-mono">{latestGen.promptTemplateUsed || 'v1.0'}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-white/[0.05] text-zinc-455">
              <span>Tokens Logged (Total)</span>
              <span className="font-semibold text-zinc-200 font-mono">{latestGen.totalTokens || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 text-zinc-455">
              <span className="flex items-center"><DollarSign className="h-3.5 w-3.5 mr-1 text-[#10B981]" /> Est. Cost (USD)</span>
              <span className="font-bold text-[#10B981] font-mono">${(latestGen.cost || 0).toFixed(5)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
