
// src/components/project/create-project-dialog.tsx
"use client";

import { useState, useEffect } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTemplates, type CardTemplateId } from '@/contexts/TemplateContext';
import { Loader2, LibrarySquare } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectName: string, associatedTemplateIds: CardTemplateId[]) => Promise<void>;
}

export default function CreateProjectDialog({ isOpen, onClose, onSubmit }: CreateProjectDialogProps) {
  const [projectName, setProjectName] = useState('');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<CardTemplateId[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { templates: globalTemplates, isLoading: templatesLoading } = useTemplates();

  // console.log('[DEBUG] CreateProjectDialog: Rendering. Global templates loading:', templatesLoading, 'Count:', globalTemplates.length);

  const handleTemplateSelectionChange = (templateId: CardTemplateId, checked: boolean | string) => {
    // console.log('[DEBUG] CreateProjectDialog/handleTemplateSelectionChange: Template ID:', templateId, 'Checked:', checked);
    setSelectedTemplateIds(prev => {
      if (checked) {
        return [...prev, templateId];
      } else {
        return prev.filter(id => id !== templateId);
      }
    });
  };

  const handleSubmit = async () => {
    // console.log('[DEBUG] CreateProjectDialog/handleSubmit: Submitting. Project name:', projectName, 'Selected templates:', selectedTemplateIds);
    setIsSubmitting(true);
    await onSubmit(projectName, selectedTemplateIds);
    setIsSubmitting(false);
    // Dialog closure and field reset is handled by onOpenChange or parent
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setProjectName('');
      setSelectedTemplateIds([]);
      setIsSubmitting(false);
    }
  };
  
  const canSubmit = projectName.trim() !== '' && (!templatesLoading && globalTemplates.length > 0);


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Enter a name for your new project and select any initial card templates to associate with it.
            Card templates define the structure of your cards.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="projectName" className="text-left">
              Project Name
            </Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Awesome Game"
              disabled={isSubmitting || templatesLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Associate Card Templates (Optional)</Label>
            {templatesLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">Loading templates...</p>
              </div>
            ) : globalTemplates.length > 0 ? (
              <ScrollArea className="h-48 rounded-md border p-2">
                <div className="space-y-2">
                  {globalTemplates.map(template => (
                    <div key={template.id} className="flex items-center space-x-2 hover:bg-muted/50 p-1.5 rounded-sm transition-colors">
                      <Checkbox
                        id={`template-${template.id}`}
                        checked={selectedTemplateIds.includes(template.id as CardTemplateId)}
                        onCheckedChange={(checked) => handleTemplateSelectionChange(template.id as CardTemplateId, checked)}
                        disabled={isSubmitting}
                      />
                      <Label
                        htmlFor={`template-${template.id}`}
                        className="font-normal cursor-pointer"
                      >
                        {template.name} (<code>{template.id}</code>)
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
               <Alert variant="default" className="bg-accent/10 border-accent/30">
                <LibrarySquare className="h-4 w-4 text-accent" />
                <AlertTitle className="text-accent">No Card Templates Exist</AlertTitle>
                <AlertDescription className="text-accent/90">
                  You must define at least one card template before creating a project.
                  <Link href="/templates/new" className="font-semibold underline hover:text-accent ml-1" onClick={onClose}>
                    Go to Template Designer.
                  </Link>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>) : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
