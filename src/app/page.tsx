import React from 'react';
import Link from 'next/link';
import { FileText, Shield, Sparkles, ArrowRight, CheckCircle2, Activity, Zap, ClipboardCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-100">
      
      {/* Premium Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-zinc-200 to-zinc-600 p-2 flex items-center justify-center shadow-lg shadow-zinc-900/40">
              <Activity className="h-5 w-5 text-zinc-950" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-100">
              ClaimAppeal<span className="text-zinc-400 font-medium">Pro</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-zinc-400">
            <a href="#features" className="hover:text-zinc-200 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-zinc-200 transition-colors">Workflow</a>
            <a href="#pricing" className="hover:text-zinc-200 transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-1.8 text-xs font-semibold rounded bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-all duration-200 shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/50 via-zinc-950 to-zinc-950 pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center space-x-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3.5 py-1 text-xs text-zinc-350 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-medium">Version 2.0 now live with OCR Intelligence</span>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 leading-tight">
              Turn Insurance Denials Into Approved Claims
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              ClaimAppealPro utilizes clinical intelligence and OCR to automatically generate comprehensive, legally-sound insurance appeal letters in seconds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/register"
              className="px-6 py-2.5 font-bold text-xs rounded bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-all duration-200 flex items-center justify-center space-x-1.5 shadow"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="#features"
              className="px-6 py-2.5 font-semibold text-xs rounded border border-zinc-800 text-zinc-400 hover:bg-zinc-900 transition-all duration-200"
            >
              Explore Capabilities
            </a>
          </div>

          {/* Premium Animated Dashboard Preview Card */}
          <div className="max-w-5xl mx-auto pt-10 px-2 sm:px-0">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-2.5 backdrop-blur-md shadow-2xl relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-zinc-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="rounded-lg border border-zinc-850 bg-zinc-950/80 p-4 sm:p-6 text-left space-y-6">
                
                {/* Header Mockup */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/60" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                    <div className="h-3 w-3 rounded-full bg-green-500/60" />
                    <span className="text-[10px] text-zinc-600 font-mono pl-2">dashboard_preview_v2.tsx</span>
                  </div>
                  <div className="h-4 w-28 rounded bg-zinc-900 animate-pulse" />
                </div>

                {/* Body Content Grid Mockup */}
                <div className="grid gap-4 md:grid-cols-3">
                  
                  {/* Left Column: Input Form Mockup */}
                  <div className="md:col-span-2 border border-zinc-850 rounded bg-zinc-900/20 p-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-4.5 w-4.5 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Sparkles className="h-2.5 w-2.5 text-zinc-400" />
                      </div>
                      <span className="text-xs font-semibold text-zinc-350">AI Appeal Generator</span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="h-3 w-16 bg-zinc-900 rounded" />
                        <div className="h-8 bg-zinc-950 border border-zinc-850 rounded flex items-center px-3 text-[10px] text-zinc-505 font-medium">
                          Aetna Choice POS II
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-3 w-28 bg-zinc-900 rounded" />
                        <div className="h-20 bg-zinc-950 border border-zinc-850 rounded p-3 text-[10px] text-zinc-505 font-medium leading-relaxed">
                          Denial Code: 97110 (Therapeutic Procedure). The payor denies claims due to missing clinical justification of daily progress note metrics.
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="h-8 w-28 bg-zinc-100 rounded flex items-center justify-center text-[10px] font-bold text-zinc-950 shadow-sm cursor-default">
                        Generate Letter
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Generated Letter Mockup */}
                  <div className="border border-zinc-850 rounded bg-zinc-900/20 p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-350">Appeal Output</span>
                        <span className="text-[9px] uppercase font-bold text-emerald-450 bg-emerald-950/50 border border-emerald-900/50 px-2 py-0.5 rounded">Ready</span>
                      </div>
                      <div className="space-y-2 pt-1 font-mono text-[8px] text-zinc-500 leading-normal">
                        <p className="font-bold text-zinc-300">SUBJECT: Formal Expedited Appeal for Patient John Doe</p>
                        <p>Pursuant to ERISA guidelines, this letter serves as a formal appeal regarding the denial of coverage for therapeutic code 97110...</p>
                        <p>Based on documented clinical records, the therapeutic procedures executed were medically necessary due to active deficits in musculoskeletal mobility...</p>
                      </div>
                    </div>

                    <div className="border-t border-zinc-900 pt-3 flex items-center justify-between text-[10px] text-zinc-400 font-semibold">
                      <span>Standard PDF Template</span>
                      <div className="h-6 w-12 rounded bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-300 border border-zinc-700">A4</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t border-zinc-900 bg-zinc-950 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              Engineered for Medical Practices & Patient Advocacy
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl mx-auto">
              Automated pipelines built to scale clinical justification letters and reduce claim response times.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-12">
            
            {/* Feature 1 */}
            <div className="rounded-lg border border-zinc-850 bg-zinc-900/20 p-6 space-y-4 hover:border-zinc-800 transition-colors duration-200">
              <div className="h-10 w-10 rounded bg-zinc-950 border border-zinc-850 flex items-center justify-center text-zinc-300">
                <Zap className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-200">Expedited AI Generation</h3>
                <p className="text-xs text-zinc-450 leading-relaxed">
                  Generate comprehensive clinical letters mapped specifically to the insurance payor&apos;s denial code in under 30 seconds.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg border border-zinc-850 bg-zinc-900/20 p-6 space-y-4 hover:border-zinc-800 transition-colors duration-200">
              <div className="h-10 w-10 rounded bg-zinc-950 border border-zinc-850 flex items-center justify-center text-zinc-300">
                <FileText className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-200">OCR Denial Parsing</h3>
                <p className="text-xs text-zinc-450 leading-relaxed">
                  Upload raw insurer PDF scans or image files. Our system extract medical codes, patient info, and insurers automatically.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg border border-zinc-850 bg-zinc-900/20 p-6 space-y-4 hover:border-zinc-800 transition-colors duration-200">
              <div className="h-10 w-10 rounded bg-zinc-950 border border-zinc-850 flex items-center justify-center text-zinc-300">
                <Shield className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-200">Enterprise Security</h3>
                <p className="text-xs text-zinc-450 leading-relaxed">
                  Strict transport security, frames isolation, database audit logging, and clean soft-deletes keep HIPAA boundaries secure.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-20 border-t border-zinc-900 bg-zinc-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              Three Steps to Resolve Claim Denials
            </h2>
            <p className="text-xs text-zinc-400">
              A simplified, secure clinical appeal generation workflow.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 pt-12 relative">
            
            {/* Step 1 */}
            <div className="space-y-4 text-center sm:text-left">
              <div className="text-xs font-bold text-zinc-550 font-mono uppercase tracking-wider">Step 01</div>
              <h3 className="text-sm font-semibold text-zinc-250 flex items-center justify-center sm:justify-start">
                <ClipboardCheck className="h-4.5 w-4.5 mr-1.5 text-zinc-400 shrink-0" />
                Upload Insurer Denial
              </h3>
              <p className="text-xs text-zinc-450 leading-relaxed">
                Drag-and-drop the PDF document received from the insurance payor. Our OCR engine parses codes and payor addresses.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4 text-center sm:text-left">
              <div className="text-xs font-bold text-zinc-550 font-mono uppercase tracking-wider">Step 02</div>
              <h3 className="text-sm font-semibold text-zinc-255 flex items-center justify-center sm:justify-start">
                <Sparkles className="h-4.5 w-4.5 mr-1.5 text-zinc-400 shrink-0" />
                Review & Edit Metadata
              </h3>
              <p className="text-xs text-zinc-455 leading-relaxed">
                Validate patient names, medical necessity arguments, and NPI credentials inside a split-screen dashboard view.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4 text-center sm:text-left">
              <div className="text-xs font-bold text-zinc-550 font-mono uppercase tracking-wider">Step 03</div>
              <h3 className="text-sm font-semibold text-zinc-255 flex items-center justify-center sm:justify-start">
                <FileText className="h-4.5 w-4.5 mr-1.5 text-zinc-400 shrink-0" />
                Download Expedited PDF
              </h3>
              <p className="text-xs text-zinc-455 leading-relaxed">
                Render the generated letter using standard professional templates and print or download the export archive for submission.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              Flexible Tiers for Clinics of All Sizes
            </h2>
            <p className="text-xs text-zinc-400">
              Start with our free trial or unlock unlimited letters with ClaimAppealPro Pro.
            </p>
          </div>

          <div className="grid gap-8 max-w-4xl mx-auto pt-12 md:grid-cols-2">
            
            {/* Free Tier */}
            <div className="rounded-xl border border-zinc-850 bg-zinc-900/10 p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-200">Standard Tier</h3>
                  <p className="text-xs text-zinc-500 mt-1">For initial platform testing</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-zinc-100">$0</span>
                  <span className="text-xs text-zinc-500 ml-1">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-zinc-400 pt-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span>3 AI Appeal Letters total</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span>Standard PDF Template exports</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span>Basic OCR extraction</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/register"
                className="w-full py-2 text-center text-xs font-semibold rounded border border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-colors"
              >
                Sign Up Free
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/30 p-8 flex flex-col justify-between space-y-6 relative shadow-xl shadow-zinc-950/80">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-zinc-100 text-zinc-950 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-wider border border-zinc-100 shadow">
                Popular
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Pro Professional</h3>
                  <p className="text-xs text-zinc-450 mt-1">For active clinics & providers</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-zinc-100">$49</span>
                  <span className="text-xs text-zinc-500 ml-1">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-zinc-300 pt-2">
                  <li className="flex items-center space-x-2 text-zinc-200">
                    <CheckCircle2 className="h-4 w-4 text-zinc-200 shrink-0" />
                    <span className="font-medium">Unlimited AI generated appeals</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>All Professional & A4 templates</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>High-fidelity OCR parsing pipeline</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>Expedited priority email support</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/register"
                className="w-full py-2 text-center text-xs font-bold rounded bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-colors shadow"
              >
                Upgrade to Pro
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-900 py-8 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 space-y-3 sm:space-y-0">
          <div>
            &copy; {new Date().getFullYear()} ClaimAppealPro. All rights reserved. Registered National Provider Identifiers.
          </div>
          <div className="flex space-x-6">
            <Link href="/support" className="hover:text-zinc-300 transition-colors">Support</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">Documentation</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
