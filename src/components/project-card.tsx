
import Link from 'next/link';
import Image from 'next/image';
import type { Project, CardTemplateId } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Edit3, ArrowRight, Settings, StickyNote, EllipsisVertical, Trash2, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTemplates } from '@/contexts/TemplateContext';
import { useMemo } from 'react';

interface ProjectCardProps {
  project: Project;
  onEditDetailsClick: () => void;
  onDeleteProjectClick: () => void;
}

export default function ProjectCard({ project, onEditDetailsClick, onDeleteProjectClick }: ProjectCardProps) {
  const { getTemplateById, isLoading: templatesLoading } = useTemplates();
  const lastModifiedDate = project.lastModified ? new Date(project.lastModified) : new Date();
  const timeAgo = formatDistanceToNow(lastModifiedDate, { addSuffix: true });
  const cardCount = project.cards?.length || 0;

  const templateCounts = useMemo(() => {
    if (templatesLoading || !project.cards || project.cards.length === 0) {
      return [];
    }
    const counts: Record<string, { name: string; count: number }> = {};
    project.cards.forEach(card => {
      const template = getTemplateById(card.templateId as CardTemplateId);
      const templateName = template?.name || 'Unknown Template';
      if (counts[templateName]) {
        counts[templateName].count++;
      } else {
        counts[templateName] = { name: templateName, count: 1 };
      }
    });
    return Object.values(counts).sort((a,b) => b.count - a.count); // Sort by count descending
  }, [project.cards, getTemplateById, templatesLoading]);

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
      <CardHeader className="p-0">
        <Link href={`/project/${project.id}/editor`} className="block aspect-[3/2] relative group">
          <Image
            src={project.thumbnailUrl || 'https://placehold.co/300x200.png'}
            alt={`${project.name} thumbnail`}
            fill
            style={{ objectFit: 'cover' }}
            className="transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={project.dataAiHint || 'abstract game'}
          />
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>
           <div className="absolute bottom-2 left-2 right-2 p-2">
            <CardTitle className="text-xl font-semibold text-white group-hover:text-primary transition-colors line-clamp-2">
              {project.name}
            </CardTitle>
           </div>
        </Link>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
          <span>
            Last modified: {timeAgo}
          </span>
          <div className="flex items-center gap-1">
            <StickyNote className="h-3 w-3" />
            <span>{cardCount} card{cardCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        {cardCount > 0 && templateCounts.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Card Types:</p>
            <div className="flex flex-wrap gap-1">
              {templateCounts.slice(0, 3).map(tc => ( // Show top 3 for brevity
                <Badge key={tc.name} variant="secondary" className="text-xs">
                  {tc.name}: {tc.count}
                </Badge>
              ))}
              {templateCounts.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  + {templateCounts.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3 border-t flex items-center justify-between">
        <Link href={`/project/${project.id}/editor`} className="flex-grow mr-2">
          <Button variant="default" size="sm" className="w-full">
            <Edit3 className="mr-2 h-4 w-4" />
            Editor
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <EllipsisVertical className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEditDetailsClick}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteProjectClick} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
