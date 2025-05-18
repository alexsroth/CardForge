// src/app/project/[projectId]/deck-view/page.tsx
"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is intended to be removed as the feature was deprecated.
// It now redirects to the project editor or dashboard to prevent errors.
export default function DeckViewRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : null;

  useEffect(() => {
    if (projectId) {
      console.log(`[DEBUG] DeckViewRedirectPage: Redirecting from deck-view to editor for project ${projectId}`);
      router.replace(`/project/${projectId}/editor`);
    } else {
      console.log('[DEBUG] DeckViewRedirectPage: ProjectId not found, redirecting to dashboard from deck-view.');
      router.replace('/');
    }
  }, [projectId, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">The deck view page has been removed. Redirecting...</p>
    </div>
  );
}
