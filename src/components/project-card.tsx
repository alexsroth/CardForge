import Link from 'next/link';
import Image from 'next/image';
import type { Project } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderKanban, Edit3, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const lastModifiedDate = project.lastModified ? new Date(project.lastModified) : new Date();
  const timeAgo = formatDistanceToNow(lastModifiedDate, { addSuffix: true });

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0">
        <Link href={`/project/${project.id}/editor`} className="block aspect-[3/2] relative">
          <Image
            src={project.thumbnailUrl}
            alt={`${project.name} thumbnail`}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={project.dataAiHint || 'abstract game'}
          />
           <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </Link>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Link href={`/project/${project.id}/editor`}>
          <CardTitle className="text-xl font-semibold hover:text-primary transition-colors">
            {project.name}
          </CardTitle>
        </Link>
        <p className="text-sm text-muted-foreground mt-1">
          Last modified: {timeAgo}
        </p>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <Link href={`/project/${project.id}/editor`} className="w-full">
          <Button variant="outline" className="w-full">
            <Edit3 className="mr-2 h-4 w-4" />
            Open Editor
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
