import { NextRequest, NextResponse } from 'next/server';
import { createServerSideClient } from '@/lib/supabase';
import prisma from '@/lib/prisma';
import log from '@/lib/logger';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

const extractVal = (field: any): string => {
  if (field && typeof field === 'object' && 'value' in field) {
    return String(field.value);
  }
  return field ? String(field) : '';
};

export async function GET(req: NextRequest) {
  const correlationId = crypto.randomUUID();
  log.info({ correlationId }, 'API Route: DOCX export requested');

  try {
    // 1. Authenticate user session
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      log.warn({ correlationId }, 'Unauthenticated access attempt to DOCX export');
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    // 2. Extract and validate parameters
    const { searchParams } = new URL(req.url);
    const appealId = searchParams.get('appealId');
    const versionNumberStr = searchParams.get('versionNumber');

    if (!appealId || !versionNumberStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: appealId and versionNumber.' },
        { status: 400 }
      );
    }

    const versionNumber = parseInt(versionNumberStr, 10);
    if (isNaN(versionNumber)) {
      return NextResponse.json(
        { error: 'Invalid version number parameter.' },
        { status: 400 }
      );
    }

    // 3. Fetch Appeal details and the requested version
    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        versions: {
          where: { versionNumber },
        },
      },
    });

    if (!appeal || appeal.deletedAt) {
      return NextResponse.json(
        { error: 'Appeal letter draft not found.' },
        { status: 404 }
      );
    }

    // 4. BOLA ownership verification
    if (appeal.userId !== user.id) {
      log.warn({ correlationId, appealId, userId: user.id }, 'BOLA violation blocked in DOCX export');
      return NextResponse.json(
        { error: 'Access denied: You do not own this resource.' },
        { status: 403 }
      );
    }

    const appealVersion = appeal.versions[0];
    if (!appealVersion || appealVersion.deletedAt) {
      return NextResponse.json(
        { error: `Requested appeal version #${versionNumber} not found.` },
        { status: 404 }
      );
    }

    // 5. Gather clinical/claim metadata inputs
    const sourceData = (appeal.structuredInput || appeal.extractedMetadata || {}) as Record<string, any>;
    const patientName = extractVal(sourceData.patientName) || 'N/A';
    const memberId = extractVal(sourceData.memberId) || 'N/A';
    const policyId = extractVal(sourceData.policyNumber || sourceData.policyId) || 'N/A';
    const claimNumber = extractVal(sourceData.claimNumber) || 'N/A';
    const denialDate = extractVal(sourceData.denialDate) || 'N/A';
    const denialReason = extractVal(sourceData.denialReason) || 'N/A';
    const insuranceName = extractVal(sourceData.insuranceCompany || sourceData.insuranceName) || 'N/A';
    const insuranceAddress = extractVal(sourceData.address || sourceData.insuranceAddress) || 'N/A';

    // 6. Compile DOCX Structure
    const docChildren: any[] = [];

    // Header info (Date)
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: today, font: 'Calibri' })],
        spacing: { after: 200 },
      })
    );

    // Insurance Address
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'TO:', bold: true, font: 'Calibri' }),
          new TextRun({ text: ` ${insuranceName}`, font: 'Calibri' }),
        ],
      })
    );
    if (insuranceAddress && insuranceAddress !== 'N/A') {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: insuranceAddress, font: 'Calibri' })],
          spacing: { after: 240 },
        })
      );
    } else {
      docChildren.push(new Paragraph({ children: [], spacing: { after: 240 } }));
    }

    // Patient Claim Metadata Table / Block
    const metadataFields = [
      { label: 'Patient Name', value: patientName },
      { label: 'Member ID', value: memberId },
      { label: 'Policy Number', value: policyId },
      { label: 'Claim Number', value: claimNumber },
      { label: 'Date of Denial', value: denialDate },
      { label: 'Reason for Denial', value: denialReason },
    ];

    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'RE: MEDICAL CLAIM APPEAL', bold: true, size: 26, font: 'Calibri', underline: {} })],
        spacing: { after: 180 },
      })
    );

    metadataFields.forEach((field) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${field.label}: `, bold: true, font: 'Calibri' }),
            new TextRun({ text: field.value, font: 'Calibri' }),
          ],
          spacing: { after: 60 },
        })
      );
    });

    // Spacer
    docChildren.push(new Paragraph({ children: [], spacing: { after: 240 } }));

    // Letter Content Body
    const letterBody = appealVersion.letterContent || '';
    const paragraphs = letterBody.split(/\r?\n\r?\n/);

    paragraphs.forEach((pText) => {
      const trimmed = pText.trim();
      if (!trimmed) return;

      // Handle simple markdown headers
      const isHeader = trimmed.startsWith('#') || (trimmed.startsWith('**') && trimmed.endsWith('**'));
      const isList = trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed);

      if (isHeader) {
        const cleanHeader = trimmed.replace(/^[#\s*]+|[#\s*]+$/g, '');
        docChildren.push(
          new Paragraph({
            text: cleanHeader,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (isList) {
        const cleanItem = trimmed.replace(/^[-*\s]+|^\d+\.\s*/, '');
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: cleanItem, font: 'Calibri' })],
            bullet: { level: 0 },
            spacing: { after: 100 },
          })
        );
      } else {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: trimmed, font: 'Calibri' })],
            spacing: { after: 200 },
          })
        );
      }
    });

    // Create the Word Document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    // 7. Compile and pack the document as buffer
    const docBuffer = await Packer.toBuffer(doc);

    // 8. Log successful audit event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DOCX_EXPORTED',
        details: {
          appealId,
          versionNumber,
          fileSize: docBuffer.length,
        },
      },
    });

    log.info({ correlationId, appealId, versionNumber }, 'DOCX export file generated successfully');

    // 9. Return the binary file stream
    return new NextResponse(new Uint8Array(docBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="appeal_letter_v${versionNumber}.docx"`,
        'Content-Length': String(docBuffer.length),
      },
    });
  } catch (error: any) {
    log.error({ correlationId, error: error.message }, 'Unexpected error compiling DOCX export');
    return NextResponse.json(
      { error: 'Internal server error while compiling DOCX.' },
      { status: 500 }
    );
  }
}
