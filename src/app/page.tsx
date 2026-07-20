import React from 'react';
import Link from 'next/link';
import { FileText, Shield, Sparkles, ArrowRight, CheckCircle2, Activity, Zap, ClipboardCheck, Star } from 'lucide-react';

export default function LandingPage() {
  const faqs = [
    {
      q: "Is ClaimAppealPro HIPAA compliant?",
      a: "Yes. We encrypt all data in transit and at rest using AES-256 and SSL/TLS. No protected health information (PHI) is ever used to train AI models, and all processed medical files can be purged immediately."
    },
    {
      q: "How does the OCR denial parsing engine work?",
      a: "Our advanced optical character recognition (OCR) scanner extracts data points from raw PDF scans or image files, automatically identifying patient details, medical procedure codes (CPT/ICD-10), and insurer denial reasons."
    },
    {
      q: "Can I customize the generated appeal templates?",
      a: "Absolutely. Once the AI generates the initial draft, you can customize the wording, insert specific daily progress notes, change letter structures, and select between professional print formats."
    },
    {
      q: "What is your refund policy?",
      a: "We offer a 14-day money-back guarantee on all subscription plans if you are not satisfied with the quality of the generated claim letters."
    }
  ];

  return (
    <div className="min-h-screen bg-[#08090B] text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-100 overflow-x-hidden relative">
      
      {/* Background Gradient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />
      
      {/* Modern Transparent Glassmorphic Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#08090B]/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-[#4F8CFF] to-[#6EE7F9] p-2 flex items-center justify-center shadow-lg shadow-[#4F8CFF]/20">
              <Activity className="h-5 w-5 text-black" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white">
              ClaimAppeal<span className="text-zinc-550 font-medium">Pro</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-xs font-semibold rounded bg-[#4F8CFF] text-white hover:bg-[#4F8CFF]/90 transition-all duration-200 shadow-lg shadow-[#4F8CFF]/10 active:scale-[0.98]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-36 md:pb-28 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          <div className="inline-flex items-center space-x-2 rounded-full border border-white/[0.08] bg-[#101216]/60 px-4 py-1 text-xs text-zinc-350 backdrop-blur-sm shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-[#6EE7F9]" />
            <span className="font-medium">Version 2.0 now live with OCR Intelligence</span>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white leading-tight">
              Turn Insurance Denials Into <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#4F8CFF] via-zinc-100 to-[#6EE7F9] bg-clip-text text-transparent">
                Approved Medical Claims
              </span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-450 max-w-2xl mx-auto leading-relaxed">
              ClaimAppealPro utilizes clinical intelligence and OCR to automatically generate comprehensive, legally-sound insurance appeal letters in seconds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/register"
              className="px-6 py-3 font-bold text-xs rounded bg-white text-black hover:bg-zinc-200 transition-all duration-200 flex items-center justify-center space-x-1.5 shadow-lg active:scale-[0.98]"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="#features"
              className="px-6 py-3 font-semibold text-xs rounded border border-white/[0.08] text-zinc-300 hover:bg-white/[0.04] transition-all duration-200"
            >
              Explore Capabilities
            </a>
          </div>

          {/* Premium Animated Dashboard Preview Card */}
          <div className="max-w-5xl mx-auto pt-16 px-2 sm:px-0">
            <div className="rounded-xl border border-white/[0.08] bg-[#101216]/40 p-3 backdrop-blur-md shadow-2xl relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#4F8CFF]/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              
              <div className="rounded-lg border border-white/[0.05] bg-[#08090B]/90 p-4 sm:p-6 text-left space-y-6">
                
                {/* Header Mockup */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-rose-500/60" />
                    <div className="h-3 w-3 rounded-full bg-[#F59E0B]/60" />
                    <div className="h-3 w-3 rounded-full bg-[#10B981]/60" />
                    <span className="text-[10px] text-zinc-550 font-mono pl-2">dashboard_preview_v2.tsx</span>
                  </div>
                  <div className="h-4 w-28 rounded bg-[#101216] animate-pulse" />
                </div>

                {/* Body Content Grid Mockup */}
                <div className="grid gap-4 md:grid-cols-3">
                  
                  {/* Left Column: Input Form Mockup */}
                  <div className="md:col-span-2 border border-white/[0.08] rounded bg-[#101216]/40 p-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-[#4F8CFF]" />
                      </div>
                      <span className="text-xs font-semibold text-zinc-300">AI Appeal Generator</span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="h-3 w-16 bg-[#08090B] rounded" />
                        <div className="h-8 bg-[#08090B] border border-white/[0.08] rounded flex items-center px-3 text-[10px] text-zinc-400 font-medium">
                          Aetna Choice POS II
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-3 w-28 bg-[#08090B] rounded" />
                        <div className="h-20 bg-[#08090B] border border-white/[0.08] rounded p-3 text-[10px] text-zinc-400 font-medium leading-relaxed">
                          Denial Code: 97110 (Therapeutic Procedure). The payor denies claims due to missing clinical justification of daily progress note metrics.
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="h-8 w-28 bg-[#4F8CFF] rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm cursor-default">
                        Generate Letter
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Generated Letter Mockup */}
                  <div className="border border-white/[0.08] rounded bg-[#101216]/40 p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-300">Appeal Output</span>
                        <span className="text-[9px] uppercase font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2 py-0.5 rounded">Ready</span>
                      </div>
                      <div className="space-y-2 pt-1 font-mono text-[8px] text-zinc-500 leading-normal">
                        <p className="font-bold text-zinc-300">SUBJECT: Formal Expedited Appeal for Patient John Doe</p>
                        <p>Pursuant to ERISA guidelines, this letter serves as a formal appeal regarding the denial of coverage for therapeutic code 97110...</p>
                        <p>Based on documented clinical records, the therapeutic procedures executed were medically necessary due to active deficits in musculoskeletal mobility...</p>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.08] pt-3 flex items-center justify-between text-[10px] text-zinc-400 font-semibold">
                      <span>Standard PDF Template</span>
                      <div className="h-6 w-12 rounded bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-300 border border-white/[0.08]">A4</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Healthcare Brand Indicators */}
      <section className="py-12 border-y border-white/[0.08] bg-[#101216]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Trusted by providers appealing claims from major insurers</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-30 grayscale hover:opacity-50 transition-opacity">
            <span className="text-sm font-black tracking-tighter text-white">AETNA MEDICAL</span>
            <span className="text-sm font-black tracking-tighter text-white">BLUE CROSS SHIELD</span>
            <span className="text-sm font-black tracking-tighter text-white">CIGNA GROUP</span>
            <span className="text-sm font-black tracking-tighter text-white">HUMANA CLINICAL</span>
            <span className="text-sm font-black tracking-tighter text-white">UNITED HEALTHCARE</span>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Engineered for Medical Practices & Patient Advocacy
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl mx-auto">
              Automated pipelines built to scale clinical justification letters and reduce claim response times.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-16">
            
            {/* Feature 1 */}
            <div className="rounded-lg border border-white/[0.08] bg-[#101216]/40 p-6 space-y-4 hover:border-white/[0.15] transition-all duration-200 group">
              <div className="h-10 w-10 rounded bg-[#08090B] border border-white/[0.08] flex items-center justify-center text-[#4F8CFF] group-hover:scale-105 transition-transform">
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
            <div className="rounded-lg border border-white/[0.08] bg-[#101216]/40 p-6 space-y-4 hover:border-white/[0.15] transition-all duration-200 group">
              <div className="h-10 w-10 rounded bg-[#08090B] border border-white/[0.08] flex items-center justify-center text-[#6EE7F9] group-hover:scale-105 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-200">OCR Denial Parsing</h3>
                <p className="text-xs text-zinc-450 leading-relaxed">
                  Upload raw insurer PDF scans or image files. Our system extracts medical codes, patient info, and insurers automatically.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg border border-white/[0.08] bg-[#101216]/40 p-6 space-y-4 hover:border-white/[0.15] transition-all duration-200 group">
              <div className="h-10 w-10 rounded bg-[#08090B] border border-white/[0.08] flex items-center justify-center text-[#10B981] group-hover:scale-105 transition-transform">
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
      <section id="workflow" className="py-24 border-t border-white/[0.08] bg-[#101216]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Three Steps to Resolve Claim Denials
            </h2>
            <p className="text-xs text-zinc-400">
              A simplified, secure clinical appeal generation workflow.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 pt-16 relative">
            
            {/* Step 1 */}
            <div className="space-y-4 text-center sm:text-left border border-white/[0.06] bg-[#101216]/30 p-6 rounded-lg">
              <div className="text-xs font-bold text-zinc-550 font-mono uppercase tracking-wider text-[#4F8CFF]">Step 01</div>
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center justify-center sm:justify-start">
                <ClipboardCheck className="h-4.5 w-4.5 mr-1.5 text-zinc-400 shrink-0" />
                Upload Insurer Denial
              </h3>
              <p className="text-xs text-zinc-450 leading-relaxed">
                Drag-and-drop the PDF document received from the insurance payor. Our OCR engine parses codes and payor addresses.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4 text-center sm:text-left border border-white/[0.06] bg-[#101216]/30 p-6 rounded-lg">
              <div className="text-xs font-bold text-zinc-550 font-mono uppercase tracking-wider text-[#6EE7F9]">Step 02</div>
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center justify-center sm:justify-start">
                <Sparkles className="h-4.5 w-4.5 mr-1.5 text-zinc-400 shrink-0" />
                Review & Edit Metadata
              </h3>
              <p className="text-xs text-zinc-450 leading-relaxed">
                Validate patient names, medical necessity arguments, and NPI credentials inside a split-screen dashboard view.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4 text-center sm:text-left border border-white/[0.06] bg-[#101216]/30 p-6 rounded-lg">
              <div className="text-xs font-bold text-zinc-550 font-mono uppercase tracking-wider text-[#10B981]">Step 03</div>
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center justify-center sm:justify-start">
                <FileText className="h-4.5 w-4.5 mr-1.5 text-zinc-400 shrink-0" />
                Download Expedited PDF
              </h3>
              <p className="text-xs text-zinc-450 leading-relaxed">
                Render the generated letter using standard professional templates and print or download the export archive for submission.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 border-t border-white/[0.08] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Praised by Clinical & Billing Specialists
            </h2>
            <p className="text-xs text-zinc-400">See how providers are saving hours of work every week.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-16">
            
            <div className="rounded-lg border border-white/[0.08] bg-[#101216]/40 p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex text-yellow-500">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed italic">
                  &quot;ClaimAppealPro reduced our response times for denial appeal letters from days to literally under a minute. The OCR engine parses codes with high accuracy.&quot;
                </p>
              </div>
              <div className="flex items-center space-x-3 pt-4 border-t border-white/[0.08]">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs">M</div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Dr. Marcus Vance, MD</h4>
                  <p className="text-[10px] text-zinc-500">Vance Rehabilitation Center</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-[#101216]/40 p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex text-yellow-500">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed italic">
                  &quot;The layout is clean, and generating letters has never been easier. We appeal complex therapeutic procedures with ready clinical justifications mapped to insurer policies.&quot;
                </p>
              </div>
              <div className="flex items-center space-x-3 pt-4 border-t border-white/[0.08]">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs">J</div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Jessica L., Billing Manager</h4>
                  <p className="text-[10px] text-zinc-500">Oakridge Orthopedics</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-[#101216]/40 p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex text-yellow-500">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed italic">
                  &quot;Fantastic platform. It addresses the real friction of administrative paperwork in healthcare. The letters generated are professional and cite ERISA/HIPAA guides properly.&quot;
                </p>
              </div>
              <div className="flex items-center space-x-3 pt-4 border-t border-white/[0.08]">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs">A</div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Dr. Arthur Pendelton</h4>
                  <p className="text-[10px] text-zinc-500">Integrated Medical Partners</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 border-t border-white/[0.08] bg-[#08090B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Flexible Tiers for Clinics of All Sizes
            </h2>
            <p className="text-xs text-zinc-400">
              Start with our free trial or unlock unlimited letters with ClaimAppealPro Pro.
            </p>
          </div>

          <div className="grid gap-8 max-w-4xl mx-auto pt-16 md:grid-cols-2">
            
            {/* Free Tier */}
            <div className="rounded-xl border border-white/[0.08] bg-[#101216]/20 p-8 flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-200">Standard Tier</h3>
                  <p className="text-xs text-zinc-500 mt-1">For initial platform testing</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-xs text-zinc-550 ml-1">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-400 pt-4 border-t border-white/[0.08]">
                  <li className="flex items-center space-x-3">
                    <CheckCircle2 className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span>3 AI Appeal Letters total</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle2 className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span>Standard PDF Template exports</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle2 className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span>Basic OCR extraction</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/register"
                className="w-full py-2.5 text-center text-xs font-semibold rounded border border-white/[0.08] text-zinc-350 hover:bg-white/[0.04] transition-colors"
              >
                Sign Up Free
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="rounded-xl border border-[#4F8CFF]/50 bg-[#101216]/50 p-8 flex flex-col justify-between space-y-8 relative shadow-xl shadow-black/80">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-[#4F8CFF] text-white text-[9px] font-extrabold uppercase px-2.5 py-1 rounded tracking-wider border border-[#4F8CFF] shadow">
                Popular
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Pro Professional</h3>
                  <p className="text-xs text-zinc-450 mt-1">For active clinics & providers</p>
                </div>
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-white">$49</span>
                  <span className="text-xs text-zinc-550 ml-1">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-300 pt-4 border-t border-white/[0.08]">
                  <li className="flex items-center space-x-3 text-zinc-200">
                    <CheckCircle2 className="h-4 w-4 text-[#4F8CFF] shrink-0" />
                    <span className="font-semibold">Unlimited AI generated appeals</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle2 className="h-4 w-4 text-[#4F8CFF]/60" />
                    <span>All Professional & A4 templates</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle2 className="h-4 w-4 text-[#4F8CFF]/60" />
                    <span>High-fidelity OCR parsing pipeline</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle2 className="h-4 w-4 text-[#4F8CFF]/60" />
                    <span>Expedited priority email support</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/register"
                className="w-full py-2.5 text-center text-xs font-bold rounded bg-[#4F8CFF] text-white hover:bg-[#4F8CFF]/90 transition-colors shadow-lg shadow-[#4F8CFF]/15"
              >
                Upgrade to Pro
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 border-t border-white/[0.08] bg-[#101216]/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Frequently Asked Questions</h2>
            <p className="text-xs text-zinc-400">Everything you need to know about the platform.</p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-white/[0.08] bg-[#101216]/30 p-6 rounded-lg">
                <h4 className="text-sm font-semibold text-white">{faq.q}</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-12 bg-[#08090B] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-550 space-y-4 sm:space-y-0">
          <div>
            &copy; {new Date().getFullYear()} ClaimAppealPro. All rights reserved. HIPAA and SOC 2 Compliant Database Operations.
          </div>
          <div className="flex space-x-8">
            <Link href="/support" className="hover:text-zinc-300 transition-colors">Support Center</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">Documentation</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
