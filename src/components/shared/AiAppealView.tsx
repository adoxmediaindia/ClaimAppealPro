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

  // PDF Generation & Preview State
  const [pdfExports, setPdfExports] = useState<any[]>(initialPdfExports);
  const [selectedTemplate, setSelectedTemplate] = useState<'default' | 'professional'>('default');
  const [selectedSize, setSelectedSize] = useState<'letter' | 'a4'>('letter');
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Retrieve the selected version to display
  const activeVersion = versions.find((v) => v.versionNumber === activeVersionNumber) || versions[0];

  // Retrieve the latest generation stats for metadata logging display
  const latestGen = aiGenerations[0] || {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cost: 0,
    promptTemplateUsed: 'v1.0',
    modelUsed: 'gpt-4o',
  };

  // Synchronize PDF exports on mount
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
        // Refresh export archive list
        const listRes = await getPdfExportsAction(appealId);
        if (listRes.success && listRes.data) {
          setPdfExports(listRes.data);
        }
        // Set signed preview URL
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
    <div className="grid gap-6 lg:grid-cols-5 items-start">
      {/* 1. Left Viewport: Document Viewer */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="border border-zinc-800 bg-zinc-950 shadow-2xl relative overflow-hidden">
          {/* Decorative clinical certificate header */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-700" />
          
          <CardHeader className="border-b border-zinc-900/60 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-zinc-150 flex items-center space-x-2">
                <FileText className="h-4.5 w-4.5 text-zinc-400" />
                <span>Generated Appeal Letter</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Review and verify clinical formatting arguments.
              </CardDescription>
            </div>
            
            {/* Version Badge */}
            <span className="text-[10px] font-semibold text-emerald-450 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-full">
              Version {activeVersion?.versionNumber} (Latest: {versions[0]?.versionNumber})
            </span>
          </CardHeader>

          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 p-3 text-xs rounded border border-rose-900 bg-rose-955/20 text-rose-455">
                {error}
              </div>
            )}

            {/* Letter Body Textbox */}
            <div className="w-full bg-zinc-900/40 border border-zinc-900 rounded-md p-6 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto min-h-[300px]">
              {activeVersion?.letterContent || 'No letter content has been generated.'}
            </div>

            {/* PDF Print Preview Frame */}
            {previewUrl && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 rounded px-4 py-2 text-xs">
                  <span className="font-semibold text-zinc-300 flex items-center">
                    <Printer className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
                    PDF Print Preview Mode
                  </span>
                  <div className="flex items-center space-x-3">
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-emerald-450 hover:underline"
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
                <div className="w-full h-[600px] border border-zinc-800 rounded-md overflow-hidden bg-zinc-900">
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

          <CardFooter className="border-t border-zinc-900/40 py-3 flex items-center justify-between text-[10px] text-zinc-500">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
              <span>HIPAA Compliant Clinician Seal</span>
            </span>
            <span>Generated on {activeVersion ? new Date(activeVersion.createdAt).toLocaleDateString() : 'N/A'}</span>
          </CardFooter>
        </Card>
      </div>

      {/* 2. Right Viewport: Controls & History */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Document Rendering & PDF Generation Frame */}
        <Card className="border border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center space-x-1.5">
              <Printer className="h-4.5 w-4.5 text-zinc-400" />
              <span>Document Export Options</span>
            </CardTitle>
            <CardDescription className="text-xs">Compile and export print-ready PDF formats.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-500">Styling Template</label>
              <select
                value={selectedTemplate}
                id="templateSelect"
                onChange={(e) => setSelectedTemplate(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
              >
                <option value="default">Default Template (Modern Sans)</option>
                <option value="professional">Professional Template (Serif Legal)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-500">Page Size Layout</label>
              <select
                value={selectedSize}
                id="pageSizeSelect"
                onChange={(e) => setSelectedSize(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
              >
                <option value="letter">US Letter Size</option>
                <option value="a4">A4 Page Size</option>
              </select>
            </div>

            <Button
              onClick={handleGeneratePdf}
              disabled={pdfLoading || isPending}
              id="generatePdfButton"
              className="w-full flex items-center justify-center space-x-2 bg-emerald-550 hover:bg-emerald-500 text-zinc-950"
            >
              <Printer className={`h-4 w-4 text-zinc-950 ${pdfLoading ? 'animate-pulse' : ''}`} />
              <span className="font-semibold text-zinc-950">
                {pdfLoading ? 'Generating PDF Document...' : 'Generate PDF Document'}
              </span>
            </Button>
          </CardContent>
        </Card>

        {/* PDF Version Archive History */}
        <Card className="border border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold">PDF Export Archive History</CardTitle>
            <CardDescription className="text-xs">Securely download generated PDF files.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 border-t border-zinc-900/60 max-h-48 overflow-y-auto">
            {pdfExports.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                No PDF documents exported yet.
              </div>
            ) : (
              pdfExports.map((exp) => (
                <div
                  key={exp.id}
                  className="flex w-full items-center justify-between px-4 py-3 border-b border-zinc-900/40 text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-zinc-300">
                      PDF Export (AI v#{exp.appealVersionNumber})
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Template: {exp.templateName} ({exp.pageSize}) • {(exp.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreviewPdf(exp.id)}
                      className="h-7 text-[10px] px-2 py-0"
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
                      className="h-7 text-[10px] px-2 py-0 border-emerald-900/40 text-emerald-450 hover:bg-emerald-950/20"
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
        <Card className="border border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Appeal Engine Operations</CardTitle>
            <CardDescription className="text-xs">Trigger document actions and prompt evaluations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleRegenerate}
              disabled={isPending}
              className="w-full flex items-center justify-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 text-zinc-950 ${isPending ? 'animate-spin' : ''}`} />
              <span className="font-semibold text-zinc-950">Regenerate Letter</span>
            </Button>
          </CardContent>
        </Card>

        {/* Versions selector card */}
        <Card className="border border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Version History Archive</CardTitle>
            <CardDescription className="text-xs">Roll back or restore previous clinical drafts.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 border-t border-zinc-900/60 max-h-48 overflow-y-auto">
            {versions.map((ver) => {
              const isActive = ver.versionNumber === activeVersionNumber;
              return (
                <div
                  key={ver.id}
                  onClick={() => setActiveVersionNumber(ver.versionNumber)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left border-b border-zinc-900/40 hover:bg-zinc-900/30 transition-colors text-xs cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-zinc-300">
                      Draft Version #{ver.versionNumber} {isActive && '(Viewing)'}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {new Date(ver.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isActive ? (
                      <Check className="h-4 w-4 text-emerald-450" />
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRollback(ver.versionNumber);
                        }}
                        disabled={isPending}
                        className="h-7 text-[10px] px-2 py-0"
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
        <Card className="border border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-zinc-400" />
              <span>Generation Metadata</span>
            </CardTitle>
            <CardDescription className="text-xs">Usage audit parameters logged for billing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-zinc-900/40 text-zinc-400">
              <span className="flex items-center"><Activity className="h-3.5 w-3.5 mr-1.5" /> Model Used</span>
              <span className="font-medium text-zinc-250 font-mono">{latestGen.modelUsed || 'gpt-4o'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-900/40 text-zinc-400">
              <span>Prompt Version</span>
              <span className="font-medium text-zinc-250 font-mono">{latestGen.promptTemplateUsed || 'v1.0'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-900/40 text-zinc-400">
              <span>Tokens Logged (Total)</span>
              <span className="font-medium text-zinc-250 font-mono">{latestGen.totalTokens || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-zinc-400">
              <span className="flex items-center"><DollarSign className="h-3.5 w-3.5 mr-1" /> Est. Cost (USD)</span>
              <span className="font-semibold text-emerald-450 font-mono">${(latestGen.cost || 0).toFixed(5)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
