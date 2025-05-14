
// src/components/project/edit-project-dialog.tsx
"use client";

import { useState, useEffect } from 'react';
import type { Project } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea'; // If using for dataAiHint or other fields

interface EditProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updatedData: Partial<Omit<Project, 'id' | 'cards' | 'lastModified' | 'associatedTemplateIds'>>) => Promise<void>;
  projectToEdit: Project;
}

export default function EditProjectDialog({ isOpen, onClose, onSubmit, projectToEdit }: EditProjectDialogProps) {
  const [projectName, setProjectName] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [dataAiHint, setDataAiHint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (projectToEdit && isOpen) {
      setProjectName(projectToEdit.name);
      setThumbnailUrl(projectToEdit.thumbnailUrl || '');
      setDataAiHint(projectToEdit.dataAiHint || '');
    }
  }, [projectToEdit, isOpen]);

  const handleSubmit = async () => {
    if (!projectName.trim()) {
        // Potentially add a toast here if using useToast hook
        alert("Project name cannot be empty."); // Simple alert for now
        return;
    }
    setIsSubmitting(true);
    await onSubmit({ 
        name: projectName, 
        thumbnailUrl, 
        dataAiHint 
    });
    setIsSubmitting(false);
    // onClose(); // Dialog closure should be handled by parent based on submission success
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      // Optionally reset fields here if desired when dialog is closed by any means
      // setProjectName(projectToEdit?.name || ''); 
      // setThumbnailUrl(projectToEdit?.thumbnailUrl || '');
      // setDataAiHint(projectToEdit?.dataAiHint || '');
      setIsSubmitting(false); 
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Project Details</DialogTitle>
          <DialogDescription>
            Modify the details for "{projectToEdit?.name}".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="editProjectName">Project Name</Label>
            <Input
              id="editProjectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Awesome Game"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="editThumbnailUrl">Thumbnail URL</Label>
            <Input
              id="editThumbnailUrl"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://placehold.co/300x200.png"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">Use a service like <a href="https://placehold.co" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">placehold.co</a> for placeholders.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="editDataAiHint">AI Hint for Thumbnail</Label>
            <Input
              id="editDataAiHint"
              value={dataAiHint}
              onChange={(e) => setDataAiHint(e.target.value)}
              placeholder="e.g., fantasy landscape, abstract art"
              disabled={isSubmitting}
            />
             <p className="text-xs text-muted-foreground">Keywords for finding a real image later (max 2 words).</p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !projectName.trim()}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
