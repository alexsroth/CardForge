
// src/contexts/ProjectContext.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Project, CardData, CardTemplateId } from '@/lib/types';
// REMOVED: import { mockProjects as initialSeedProjects } from '@/app/page';


export interface ProjectContextType {
  projects: Project[];
  getProjectById: (id: string | undefined) => Project | undefined;
  updateProject: (updatedProject: Project) => Promise<{ success: boolean; message: string }>;
  updateProjectAssociatedTemplates: (projectId: string, associatedTemplateIds: CardTemplateId[]) => Promise<{ success: boolean; message: string }>;
  updateProjectCards: (projectId: string, cards: CardData[]) => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'cardForgeProjects';

// Define seed data directly in this file to avoid circular dependencies
// and use static ISO dates for hydration safety.
const seedProjectsData: Project[] = [
  {
    id: 'project-alpha',
    name: 'Alpha Beasts',
    thumbnailUrl: 'https://placehold.co/300x200.png',
    dataAiHint: 'fantasy creature',
    lastModified: '2024-07-26T10:00:00.000Z', // Static ISO date
    associatedTemplateIds: ['creature', 'spell', 'generic'],
    cards: [ 
        { id: 'card-alpha-1', templateId: 'creature', name: 'Alpha Wolf', description: 'A leader of the pack.', cost: 3, attack: 3, defense: 2, imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'wolf illustration' },
        { id: 'card-alpha-2', templateId: 'spell', name: 'Nature\'s Call', description: 'Summon a beast.', cost: 2, effectText: 'Search your deck for a creature card.', imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'forest magic' },
    ]
  },
  {
    id: 'project-beta',
    name: 'Cyber Spells',
    thumbnailUrl: 'https://placehold.co/300x200.png',
    dataAiHint: 'abstract technology',
    lastModified: '2024-07-23T12:30:00.000Z', // Static ISO date
    associatedTemplateIds: ['spell', 'item', 'generic'],
    cards: [
        { id: 'card-beta-1', templateId: 'spell', name: 'Overload', description: 'Deal damage to all enemies.', cost: 5, effectText: 'Deals 3 damage to all opponent creatures.', imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'electric shock' },
    ]
  },
  {
    id: 'project-gamma',
    name: 'Medieval Items',
    thumbnailUrl: 'https://placehold.co/300x200.png',
    dataAiHint: 'medieval weapon',
    lastModified: '2024-07-28T15:45:00.000Z', // Static ISO date
    associatedTemplateIds: ['item', 'creature', 'generic'],
    cards: [
        { id: 'card-gamma-1', templateId: 'item', name: 'Knight\'s Shield', description: 'A sturdy shield.', cost: 2, effectText: 'Target creature gets +0/+2.', imageUrl: 'https://placehold.co/280x400.png', dataAiHint: 'metal shield' },
    ]
  },
];


export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let initialData: Project[];
    try {
      const storedProjects = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedProjects) {
        initialData = JSON.parse(storedProjects);
      } else {
        // Use the locally defined, static seedProjectsData
        initialData = seedProjectsData.map(p => ({ ...p })); // Create a fresh copy for initial state
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialData));
      }
    } catch (error) {
      console.error("Failed to load projects from localStorage, using initial seed:", error);
      initialData = seedProjectsData.map(p => ({ ...p })); // Create a fresh copy
    }
    
    setProjects(initialData);
    setIsLoading(false);

  }, []); // Empty dependency array means this runs once on mount (client-side)

  const persistProjects = useCallback((updatedProjects: Project[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProjects));
    } catch (error) {
      console.error("Failed to save projects to localStorage:", error);
      // Potentially show a toast to the user
    }
  }, []);

  const getProjectById = useCallback((id: string | undefined): Project | undefined => {
    if (!id) return undefined;
    return projects.find(p => p.id === id);
  }, [projects]);

  const updateProject = useCallback(async (updatedProjectData: Project): Promise<{ success: boolean; message: string }> => {
    if (!updatedProjectData.id) {
        return { success: false, message: "Project ID is missing." };
    }
    setProjects(prevProjects => {
      const existingIndex = prevProjects.findIndex(p => p.id === updatedProjectData.id);
      let updatedProjectsList;
      if (existingIndex > -1) {
        updatedProjectsList = [...prevProjects];
        // Ensure lastModified is updated if it's part of the update operation, otherwise keep existing
        updatedProjectsList[existingIndex] = {
          ...updatedProjectData,
          lastModified: new Date().toISOString() // Update lastModified on any project update
        };
      } else {
        console.warn(`Project with ID ${updatedProjectData.id} not found for update. Adding as new project.`);
        updatedProjectsList = [...prevProjects, { ...updatedProjectData, lastModified: new Date().toISOString() }];
      }
      persistProjects(updatedProjectsList);
      return updatedProjectsList;
    });
    return { success: true, message: `Project '${updatedProjectData.name}' updated successfully.` };
  }, [persistProjects, projects]); // Added projects to dependency array for updateProject


  const updateProjectAssociatedTemplates = useCallback(async (projectId: string, associatedTemplateIds: CardTemplateId[]): Promise<{ success: boolean; message: string }> => {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      return { success: false, message: `Project with ID '${projectId}' not found.` };
    }
    const updatedProject = { ...project, associatedTemplateIds };
    return updateProject(updatedProject);
  }, [projects, updateProject]);


  const updateProjectCards = useCallback(async (projectId: string, cards: CardData[]): Promise<{ success: boolean; message: string }> => {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      return { success: false, message: `Project with ID '${projectId}' not found.` };
    }
    const updatedProject = { ...project, cards };
    return updateProject(updatedProject);
  }, [projects, updateProject]);


  return (
    <ProjectContext.Provider value={{ projects, getProjectById, updateProject, updateProjectAssociatedTemplates, updateProjectCards, isLoading }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};
