import type { Metadata } from 'next';
import { validateEnvironment } from '@/lib/env';
import './globals.css'; // We will create this file next to hold base Tailwind classes

// Validate configuration variables at server startup
validateEnvironment();

export const metadata: Metadata = {
  title: 'ClaimAppealPro - Secure Insurance Appeal Automation',
  description: 'AI-powered SaaS helping you generate professional health insurance appeal letters and fight denial decisions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
