
import Link from 'next/link';
import Image from 'next/image';
import type { Project } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit3, ArrowRight, Settings, StickyNote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  onEditDetailsClick: () => void; // Added prop for handling details edit
}

export default function ProjectCard({ project, onEditDetailsClick }: ProjectCardProps) {
  const lastModifiedDate = project.lastModified ? new Date(project.lastModified) : new Date();
  const timeAgo = formatDistanceToNow(lastModifiedDate, { addSuffix: true });
  const cardCount = project.cards?.length || 0;

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
             <CardTitle className="text-xl font-semibold text-white hover:text-primary transition-colors line-clamp-2">
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
        {/* Removed descriptive paragraph:
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description || `Manage and edit the cards for the "${project.name}" project.`}
        </p>
        */}
      </CardContent>
      <CardFooter className="p-3 border-t grid grid-cols-2 gap-2">
        <Button onClick={onEditDetailsClick} variant="outline" size="sm" className="w-full">
          <Settings className="mr-2 h-4 w-4" />
          Details
        </Button>
        <Link href={`/project/${project.id}/editor`} className="w-full">
          <Button variant="default" size="sm" className="w-full">
            <Edit3 className="mr-2 h-4 w-4" />
            Editor
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
