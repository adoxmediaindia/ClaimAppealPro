'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, Loader2, Download, CheckCircle2 } from 'lucide-react';
import { updateAppealStructuredData } from '@/app/actions/ocr';
import { generateAppealAction } from '@/app/actions/ai';
import { type OcrWarning } from '@/lib/ocr/validator';

const appealReviewSchema = z.object({
  patientName: z.string().min(1, 'Patient Name is required.'),
  insuranceCompany: z.string().min(1, 'Insurance Company is required.'),
  claimNumber: z.string().min(1, 'Claim Number is required.'),
  memberId: z.string().min(1, 'Member ID is required.'),
  policyNumber: z.string().min(1, 'Policy Number is required.'),
  dateOfService: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of Service must be in YYYY-MM-DD format.'),
  denialDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Denial Date must be in YYYY-MM-DD format.'),
  providerName: z.string().min(1, 'Provider Name is required.'),
  cptCodes: z.string().optional().or(z.literal('')),
  icdCodes: z.string().optional().or(z.literal('')),
  denialReason: z.string().min(1, 'Denial Reason is required.'),
  appealDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Appeal Deadline must be in YYYY-MM-DD format.'),
  contactInformation: z.string().min(1, 'Contact Information is required.'),
  address: z.string().min(1, 'Address is required.'),
});

type AppealReviewFormValues = z.infer<typeof appealReviewSchema>;

interface OcrReviewFormProps {
  appealId: string;
  initialData: any;
  warnings: OcrWarning[];
  fileDownloadUrl: string;
  fileName: string;
}

export default function OcrReviewForm({
  appealId,
  initialData,
  warnings,
  fileDownloadUrl,
  fileName,
}: OcrReviewFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialFields = {
    patientName: initialData.patientName?.value || '',
    insuranceCompany: initialData.insuranceCompany?.value || '',
    claimNumber: initialData.claimNumber?.value || '',
    memberId: initialData.memberId?.value || '',
    policyNumber: initialData.policyNumber?.value || '',
    dateOfService: initialData.dateOfService?.value || '',
    denialDate: initialData.denialDate?.value || '',
    providerName: initialData.providerName?.value || '',
    cptCodes: Array.isArray(initialData.cptCodes?.value) ? initialData.cptCodes.value.join(', ') : '',
    icdCodes: Array.isArray(initialData.icdCodes?.value) ? initialData.icdCodes.value.join(', ') : '',
    denialReason: initialData.denialReason?.value || '',
    appealDeadline: initialData.appealDeadline?.value || '',
    contactInformation: initialData.contactInformation?.value || '',
    address: initialData.address?.value || '',
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AppealReviewFormValues>({
    resolver: zodResolver(appealReviewSchema),
    defaultValues: initialFields,
  });

  const onSubmit = (data: AppealReviewFormValues) => {
    setError(null);
    setSuccess(false);

    const cptArray = data.cptCodes ? data.cptCodes.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const icdArray = data.icdCodes ? data.icdCodes.split(',').map((s) => s.trim()).filter(Boolean) : [];

    startTransition(async () => {
      const response = await updateAppealStructuredData(appealId, {
        patientName: { value: data.patientName, confidence: 1.0 },
        insuranceCompany: { value: data.insuranceCompany, confidence: 1.0 },
        claimNumber: { value: data.claimNumber, confidence: 1.0 },
        memberId: { value: data.memberId, confidence: 1.0 },
        policyNumber: { value: data.policyNumber, confidence: 1.0 },
        dateOfService: { value: data.dateOfService, confidence: 1.0 },
        denialDate: { value: data.denialDate, confidence: 1.0 },
        providerName: { value: data.providerName, confidence: 1.0 },
        cptCodes: { value: cptArray, confidence: 1.0 },
        icdCodes: { value: icdArray, confidence: 1.0 },
        denialReason: { value: data.denialReason, confidence: 1.0 },
        appealDeadline: { value: data.appealDeadline, confidence: 1.0 },
        contactInformation: { value: data.contactInformation, confidence: 1.0 },
        address: { value: data.address, confidence: 1.0 },
        rawOcrText: initialData.rawOcrText,
      });

      if (response.success) {
        setSuccess(true);
        const genResponse = await generateAppealAction(appealId);
        if (genResponse.success) {
          window.location.href = `/appeals/${appealId}`;
        } else {
          setError(genResponse.error?.message || 'Metadata updated, but AI appeal draft generation encountered an issue.');
        }
      } else {
        setError(response.error?.message || 'Failed to update appeal metadata details.');
      }
    });
  };

  const hasWarning = (fieldKey: string) => {
    return warnings.some((w) => w.field === fieldKey);
  };

  const getConfidenceText = (fieldKey: string) => {
    const fieldObj = initialData[fieldKey];
    if (fieldObj && fieldObj.confidence < 0.70 && fieldObj.confidence > 0.0) {
      return `Low Conf (${Math.round(fieldObj.confidence * 100)}%)`;
    }
    return null;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5 items-start animate-in fade-in duration-300">
      
      {/* 1. Left Viewport: Document Preview Metadata */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border border-white/[0.08] bg-[#14171C]">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">Document Reference Source</CardTitle>
            <CardDescription className="text-xs text-zinc-450">Original file scanned for claim denial parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 rounded bg-[#08090B] p-4 border border-white/[0.08]">
              <FileText className="h-6 w-6 text-zinc-450 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate">{fileName}</p>
                <p className="text-[10px] text-zinc-550">Secure signed download link available.</p>
              </div>
            </div>
            <a
              href={fileDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center space-x-2 rounded-md border border-white/[0.08] bg-[#101216] py-2.5 text-xs text-zinc-300 hover:bg-[#101216]/80 hover:text-white transition-colors h-9 font-semibold"
            >
              <Download className="h-4 w-4" />
              <span>Download Original PDF File</span>
            </a>
          </CardContent>
        </Card>

        {/* Validation Warning Alert Panel */}
        {warnings.length > 0 && (
          <Card className="border border-amber-900/40 bg-amber-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider flex items-center">
                <AlertTriangle className="h-4 w-4 text-[#F59E0B] mr-2" />
                <span>Verification Warnings ({warnings.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {warnings.map((w, index) => (
                <div key={index} className="text-[11px] text-[#F59E0B]/90 flex items-start space-x-1.5 leading-normal">
                  <span className="text-[#F59E0B] shrink-0 mt-0.5">•</span>
                  <span>{w.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 2. Right Viewport: Structured Edit Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-3 space-y-6">
        <Card className="border border-white/[0.08] bg-[#14171C]">
          <CardHeader className="border-b border-white/[0.05] pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">Structured Claim Metadata</CardTitle>
            <CardDescription className="text-xs text-zinc-455">
              Verify and edit every value before starting AI letter generations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-xs rounded border border-rose-900 bg-rose-955/20 text-rose-450 animate-in fade-in">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 text-xs rounded border border-emerald-900 bg-[#064E3B]/20 text-[#10B981] animate-in fade-in">
                Structured values saved successfully. Routing back to appeals overview...
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              
              {/* Patient Name */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="patientName" className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Patient Name</label>
                  {getConfidenceText('patientName') && (
                    <span className="text-[9px] text-[#F59E0B] bg-amber-950/20 border border-amber-900/30 px-1.5 py-0.5 rounded">
                      {getConfidenceText('patientName')}
                    </span>
                  )}
                </div>
                <input
                  id="patientName"
                  type="text"
                  {...register('patientName')}
                  className={`w-full px-3 py-2 text-xs rounded border bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none ${
                    hasWarning('patientName') 
                      ? 'border-amber-900/60 focus:border-[#F59E0B]/50 focus:ring-1 focus:ring-[#F59E0B]/30' 
                      : 'border-white/[0.08] focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30'
                  } transition-all`}
                  disabled={isPending}
                />
                {errors.patientName?.message && <p className="text-[10px] text-rose-450 mt-1">{errors.patientName.message as string}</p>}
              </div>

              {/* Insurance payor */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="insuranceCompany" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Insurance Payor</label>
                  {getConfidenceText('insuranceCompany') && (
                    <span className="text-[9px] text-[#F59E0B] bg-amber-950/20 border border-amber-900/30 px-1.5 py-0.5 rounded">
                      {getConfidenceText('insuranceCompany')}
                    </span>
                  )}
                </div>
                <input
                  id="insuranceCompany"
                  type="text"
                  {...register('insuranceCompany')}
                  className={`w-full px-3 py-2 text-xs rounded border bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none ${
                    hasWarning('insuranceCompany') 
                      ? 'border-amber-900/60 focus:border-[#F59E0B]/50 focus:ring-1 focus:ring-[#F59E0B]/30' 
                      : 'border-white/[0.08] focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30'
                  } transition-all`}
                  disabled={isPending}
                />
                {errors.insuranceCompany?.message && <p className="text-[10px] text-rose-455 mt-1">{errors.insuranceCompany.message as string}</p>}
              </div>

              {/* Claim ID */}
              <div className="space-y-1.5">
                <label htmlFor="claimNumber" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Claim ID / Number</label>
                <input
                  id="claimNumber"
                  type="text"
                  {...register('claimNumber')}
                  className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                  disabled={isPending}
                />
                {errors.claimNumber?.message && <p className="text-[10px] text-rose-455 mt-1">{errors.claimNumber.message as string}</p>}
              </div>

              {/* Member ID */}
              <div className="space-y-1.5">
                <label htmlFor="memberId" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Member ID</label>
                <input
                  id="memberId"
                  type="text"
                  {...register('memberId')}
                  className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                  disabled={isPending}
                />
                {errors.memberId?.message && <p className="text-[10px] text-rose-455 mt-1">{errors.memberId.message as string}</p>}
              </div>

              {/* Policy Number */}
              <div className="space-y-1.5">
                <label htmlFor="policyNumber" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Policy Number</label>
                <input
                  id="policyNumber"
                  type="text"
                  {...register('policyNumber')}
                  className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                  disabled={isPending}
                />
                {errors.policyNumber?.message && <p className="text-[10px] text-rose-455 mt-1">{errors.policyNumber.message as string}</p>}
              </div>

              {/* Provider Name */}
              <div className="space-y-1.5">
                <label htmlFor="providerName" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Provider Doctor Name</label>
                <input
                  id="providerName"
                  type="text"
                  {...register('providerName')}
                  className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                  disabled={isPending}
                />
                {errors.providerName?.message && <p className="text-[10px] text-rose-455 mt-1">{errors.providerName.message as string}</p>}
              </div>

              {/* DOS Date */}
              <div className="space-y-1.5">
                <label htmlFor="dateOfService" className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider">Date of Service (YYYY-MM-DD)</label>
                <input
                  id="dateOfService"
                  type="text"
                  {...register('dateOfService')}
                  className={`w-full px-3 py-2 text-xs rounded border bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none ${
                    hasWarning('dateOfService') 
                      ? 'border-amber-900/60 focus:border-[#F59E0B]/50 focus:ring-1 focus:ring-[#F59E0B]/30' 
                      : 'border-white/[0.08] focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30'
                  } transition-all`}
                  placeholder="YYYY-MM-DD"
                  disabled={isPending}
                />
                {errors.dateOfService?.message && <p className="text-[10px] text-rose-455 mt-1">{errors.dateOfService.message as string}</p>}
              </div>

              {/* Denial Date */}
              <div className="space-y-1.5">
                <label htmlFor="denialDate" className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider">Denial Date (YYYY-MM-DD)</label>
                <input
                  id="denialDate"
                  type="text"
                  {...register('denialDate')}
                  className={`w-full px-3 py-2 text-xs rounded border bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none ${
                    hasWarning('denialDate') 
                      ? 'border-amber-900/60 focus:border-[#F59E0B]/50 focus:ring-1 focus:ring-[#F59E0B]/30' 
                      : 'border-white/[0.08] focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30'
                  } transition-all`}
                  placeholder="YYYY-MM-DD"
                  disabled={isPending}
                />
                {errors.denialDate?.message && <p className="text-[10px] text-rose-455 mt-1">{errors.denialDate.message as string}</p>}
              </div>

              {/* CPT Codes */}
              <div className="space-y-1.5">
                <label htmlFor="cptCodes" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">CPT Billing Codes (comma separated)</label>
                <input
                  id="cptCodes"
                  type="text"
                  {...register('cptCodes')}
                  placeholder="e.g. 99214, 93000"
                  className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                  disabled={isPending}
                />
              </div>

              {/* ICD Codes */}
              <div className="space-y-1.5">
                <label htmlFor="icdCodes" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">ICD Diagnosis Codes (comma separated)</label>
                <input
                  id="icdCodes"
                  type="text"
                  {...register('icdCodes')}
                  placeholder="e.g. I10, E11.9"
                  className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                  disabled={isPending}
                />
              </div>

              {/* Appeal Deadline */}
              <div className="space-y-1.5">
                <label htmlFor="appealDeadline" className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider">Appeal Submission Deadline (YYYY-MM-DD)</label>
                <input
                  id="appealDeadline"
                  type="text"
                  {...register('appealDeadline')}
                  className={`w-full px-3 py-2 text-xs rounded border bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none ${
                    hasWarning('appealDeadline') 
                      ? 'border-amber-900/60 focus:border-[#F59E0B]/50 focus:ring-1 focus:ring-[#F59E0B]/30' 
                      : 'border-white/[0.08] focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30'
                  } transition-all`}
                  placeholder="YYYY-MM-DD"
                  disabled={isPending}
                />
                {errors.appealDeadline?.message && <p className="text-[10px] text-rose-455 mt-1">{errors.appealDeadline.message as string}</p>}
              </div>

              {/* Contact Information */}
              <div className="space-y-1.5">
                <label htmlFor="contactInformation" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Insurance Contact Phone</label>
                <input
                  id="contactInformation"
                  type="text"
                  {...register('contactInformation')}
                  className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                  disabled={isPending}
                />
                {errors.contactInformation?.message && <p className="text-[10px] text-rose-455 mt-1">{errors.contactInformation.message as string}</p>}
              </div>

            </div>

            {/* Denial Reason detail text */}
            <div className="space-y-1.5">
              <label htmlFor="denialReason" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Insurance Denial Reason</label>
              <textarea
                id="denialReason"
                rows={3}
                {...register('denialReason')}
                className={`w-full px-3 py-2 text-xs rounded border bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none ${
                  hasWarning('denialReason') 
                    ? 'border-amber-900/60 focus:border-[#F59E0B]/50 focus:ring-1 focus:ring-[#F59E0B]/30' 
                    : 'border-white/[0.08] focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30'
                } transition-all`}
                disabled={isPending}
              />
              {errors.denialReason?.message && <p className="text-[10px] text-rose-455 mt-1">{errors.denialReason.message as string}</p>}
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label htmlFor="address" className="text-[10px] font-bold text-zinc-455 uppercase tracking-wider">Insurance Appeal Mailing Address</label>
              <input
                id="address"
                type="text"
                {...register('address')}
                className="w-full px-3 py-2 text-xs rounded border border-white/[0.08] bg-[#08090B] text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#4F8CFF]/50 focus:ring-1 focus:ring-[#4F8CFF]/30 transition-all"
                disabled={isPending}
              />
              {errors.address?.message && <p className="text-[10px] text-rose-455 mt-1">{errors.address.message as string}</p>}
            </div>

          </CardContent>
          <CardFooter className="flex justify-end bg-[#101216]/50 border-t border-white/[0.05] p-4">
            <Button type="submit" disabled={isPending} className="flex items-center space-x-2 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold h-9">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Saving structured data...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>Verify & Proceed</span>
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

    </div>
  );
}
