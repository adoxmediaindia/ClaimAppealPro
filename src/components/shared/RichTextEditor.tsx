'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link,
  Table as TableIcon,
  Undo2,
  Redo2,
  Printer,
  FileText,
  Download,
  Save,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveAppealVersionAction } from '@/app/actions/ai';

interface RichTextEditorProps {
  appealId: string;
  versionNumber: number;
  initialContent: string;
  onSave?: () => void;
  onExportPdf?: (customContent: string) => Promise<void>;
  pdfLoading?: boolean;
}

export default function RichTextEditor({
  appealId,
  versionNumber,
  initialContent,
  onSave,
  onExportPdf,
  pdfLoading = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Set initial content on load
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent || '';
    }
  }, [initialContent]);

  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Enter the link URL (e.g., https://example.com):', 'https://');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const handleInsertTable = () => {
    const rowsVal = prompt('Number of rows:', '3');
    const colsVal = prompt('Number of columns:', '3');
    const rows = parseInt(rowsVal || '0', 10);
    const cols = parseInt(colsVal || '0', 10);

    if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) return;

    let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 12px 0;">';
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        tableHtml += '<td style="border: 1px solid #3f3f46; padding: 8px; text-align: left; min-width: 50px;">&nbsp;</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table>';

    executeCommand('insertHTML', tableHtml);
  };

  const handleSave = async () => {
    if (!editorRef.current) return;
    setSaveLoading(true);
    setSaveError(null);
    setIsSaved(false);

    try {
      const content = editorRef.current.innerHTML;
      const res = await saveAppealVersionAction(appealId, versionNumber, content);
      if (res.success) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
        if (onSave) onSave();
      } else {
        setSaveError(res.error?.message || 'Failed to save appeal edits.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred while saving.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePrint = () => {
    if (!editorRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Insurance Appeal Letter</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #aaa; padding: 10px; text-align: left; }
          </style>
        </head>
        <body>
          ${editorRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportDocx = () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;

    // Compile Microsoft Word-compatible XML document
    const htmlString = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <title>Insurance Appeal Letter</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #000000; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #000000; padding: 8px; text-align: left; }
          h1 { font-size: 18pt; margin-top: 12pt; margin-bottom: 6pt; }
          h2 { font-size: 14pt; margin-top: 12pt; margin-bottom: 6pt; }
          h3 { font-size: 12pt; margin-top: 12pt; margin-bottom: 6pt; }
          p { margin: 0 0 12pt 0; }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlString], {
      type: 'application/msword;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insurance_appeal_letter_v${versionNumber}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!editorRef.current || !onExportPdf) return;
    onExportPdf(editorRef.current.innerHTML);
  };

  return (
    <div className="flex flex-col h-full border border-white/[0.08] rounded-md overflow-hidden bg-[#14171C] shadow-2xl">
      {/* 1. Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-[#0c0e12] border-b border-white/[0.08] select-none">
        
        {/* Undo/Redo */}
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => executeCommand('undo')} title="Undo">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => executeCommand('redo')} title="Redo">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Headings */}
        <Button size="icon" variant="ghost" className="h-7 w-7 font-bold text-zinc-400" onClick={() => executeCommand('formatBlock', '<h1>')} title="Heading 1">
          <Heading1 className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 font-bold text-zinc-400" onClick={() => executeCommand('formatBlock', '<h2>')} title="Heading 2">
          <Heading2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 font-bold text-zinc-400" onClick={() => executeCommand('formatBlock', '<h3>')} title="Heading 3">
          <Heading3 className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Text style */}
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => executeCommand('bold')} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => executeCommand('italic')} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => executeCommand('underline')} title="Underline">
          <Underline className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Lists */}
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => executeCommand('insertUnorderedList')} title="Bullet List">
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => executeCommand('insertOrderedList')} title="Numbered List">
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Alignment */}
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => executeCommand('justifyLeft')} title="Align Left">
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => executeCommand('justifyCenter')} title="Align Center">
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => executeCommand('justifyRight')} title="Align Right">
          <AlignRight className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => executeCommand('justifyFull')} title="Justify">
          <AlignJustify className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Insert Options */}
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={handleInsertLink} title="Insert Link">
          <Link className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={handleInsertTable} title="Insert Table">
          <TableIcon className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-white/[0.08] mx-1 flex-grow" />

        {/* Print / Export */}
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={handlePrint} title="Print Document">
          <Printer className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-[#10B981]" onClick={handleExportDocx} title="Download Word DOCX">
          <Download className="h-3.5 w-3.5" />
        </Button>
        {onExportPdf && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-[#4F8CFF]" onClick={handleExportPdf} disabled={pdfLoading} title="Compile & Preview PDF">
            <FileText className="h-3.5 w-3.5" />
          </Button>
        )}

        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Save Draft */}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saveLoading}
          className={cn(
            "h-7 px-3 text-[10px] uppercase font-bold tracking-wider transition-colors",
            isSaved ? "bg-[#10B981] hover:bg-[#10B981] text-black" : "bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white"
          )}
        >
          {saveLoading ? 'Saving...' : isSaved ? (
            <span className="flex items-center space-x-1">
              <Check className="h-3 w-3" />
              <span>Saved</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1">
              <Save className="h-3 w-3" />
              <span>Save</span>
            </span>
          )}
        </Button>
      </div>

      {/* 2. Error Display */}
      {saveError && (
        <div className="bg-rose-955/20 border-b border-rose-900/50 p-2.5 text-[10px] text-rose-405 font-bold tracking-wide">
          {saveError}
        </div>
      )}

      {/* 3. contentEditable Body */}
      <div
        ref={editorRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        className="flex-1 p-6 bg-[#08090B] overflow-y-auto min-h-[350px] max-h-[500px] text-zinc-300 font-sans text-xs leading-relaxed outline-none select-text focus:ring-1 focus:ring-white/[0.05]"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      />
    </div>
  );
}
