
// src/contexts/ProjectContext.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Project, CardData, CardTemplateId } from '@/lib/types';
import { NEW_CARD_TEMPLATE_ID_PLACEHOLDER } from '@/lib/types'; // Import placeholder


export interface ProjectContextType {
  projects: Project[];
  getProjectById: (id: string | undefined) => Project | undefined;
  addProject: (projectData: { name: string; associatedTemplateIds?: CardTemplateId[] }) => Promise<{ success: boolean; message: string; newProject?: Project }>;
  updateProject: (updatedProject: Project) => Promise<{ success: boolean; message: string }>;
  updateProjectAssociatedTemplates: (projectId: string, associatedTemplateIds: CardTemplateId[]) => Promise<{ success: boolean; message: string }>;
  updateProjectCards: (projectId: string, cards: CardData[]) => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'cardForgeProjects';

// Seed data is now an empty array. Projects are created via UI.
const seedProjectsData: Project[] = [];


export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const persistProjects = useCallback((updatedProjects: Project[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProjects));
    } catch (error) {
      console.error("Failed to save projects to localStorage:", error);
    }
  }, []);

  useEffect(() => {
    let initialData: Project[];
    try {
      const storedProjects = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedProjects) {
        let parsedProjects: Project[] = JSON.parse(storedProjects);
        // Data integrity check and augmentation
        initialData = parsedProjects.map(p => ({
          ...p,
          cards: Array.isArray(p.cards) ? p.cards.map(c => ({
            ...c, // ensure existing card data is preserved
            templateId: c.templateId || NEW_CARD_TEMPLATE_ID_PLACEHOLDER, // Default to placeholder if missing
            imageUrl: c.imageUrl || 'https://placehold.co/280x400.png',
            dataAiHint: c.dataAiHint || 'card art',
          })) : [],
          associatedTemplateIds: Array.isArray(p.associatedTemplateIds) ? p.associatedTemplateIds : [],
          lastModified: p.lastModified || new Date().toISOString(), 
          thumbnailUrl: p.thumbnailUrl || 'https://placehold.co/300x200.png', 
          dataAiHint: p.dataAiHint || 'abstract game concept', 
        }));
      } else {
        initialData = seedProjectsData; 
        if (initialData.length > 0) { // Only persist if seed data actually exists
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialData));
        }
      }
    } catch (error) {
      console.error("Failed to load projects from localStorage, using empty seed:", error);
      initialData = seedProjectsData; 
    }

    setProjects(initialData);
    setIsLoading(false);

  }, [persistProjects]);


  const getProjectById = useCallback((id: string | undefined): Project | undefined => {
    if (!id) return undefined;
    return projects.find(p => p.id === id);
  }, [projects]);

  const addProject = useCallback(async (
    projectData: { name: string; associatedTemplateIds?: CardTemplateId[] }
  ): Promise<{ success: boolean; message: string; newProject?: Project }> => {

    const starterCardTemplateId = 
      (projectData.associatedTemplateIds && projectData.associatedTemplateIds.length > 0)
      ? projectData.associatedTemplateIds[0] 
      : NEW_CARD_TEMPLATE_ID_PLACEHOLDER; // Use placeholder if no templates selected
      // If a real template is selected as first, use it, otherwise starter card will require template selection.

    const newProject: Project = {
      id: `project-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: projectData.name.trim() || "Untitled Project",
      thumbnailUrl: 'https://placehold.co/300x200.png',
      dataAiHint: 'abstract game concept',
      lastModified: new Date().toISOString(),
      associatedTemplateIds: projectData.associatedTemplateIds || [],
      cards: [
        {
          id: `card-${Date.now()}`,
          templateId: starterCardTemplateId,
          name: 'My First Card',
          description: 'This is a new card in your project. Edit its properties and template!',
          imageUrl: 'https://placehold.co/280x400.png',
          dataAiHint: 'card game concept',
          // Add other default fields for the starter card as needed,
          // or rely on CardDataForm to populate them based on the template.
          // For example, if starterCardTemplateId is 'generic', these could be:
          ...(starterCardTemplateId === 'generic' || starterCardTemplateId === NEW_CARD_TEMPLATE_ID_PLACEHOLDER ? {
            cost: 0,
            attack: 0,
            defense: 0,
            cardType: 'Unit',
            effectText: 'This is a sample effect.'
          } : {})
        }
      ],
    };

    setProjects(prevProjects => {
      const updatedProjects = [...prevProjects, newProject];
      persistProjects(updatedProjects);
      return updatedProjects;
    });

    return { success: true, message: `Project "${newProject.name}" created.`, newProject };
  }, [persistProjects]);


  const updateProject = useCallback(async (updatedProjectData: Project): Promise<{ success: boolean; message: string }> => {
    if (!updatedProjectData.id) {
        return { success: false, message: "Project ID is missing." };
    }
    let projectWasFoundAndUpdated = false;

    setProjects(prevProjects => {
      const existingIndex = prevProjects.findIndex(p => p.id === updatedProjectData.id);
      if (existingIndex > -1) {
        projectWasFoundAndUpdated = true;
        const updatedProjectsList = [...prevProjects];
        // Ensure all fields are preserved, and cards are correctly updated
        updatedProjectsList[existingIndex] = {
          ...prevProjects[existingIndex], // Preserve any fields not in updatedProjectData
          ...updatedProjectData,          // Apply updates
          lastModified: new Date().toISOString(), // Always update lastModified timestamp
          // Ensure cards are properly mapped, especially if templateId might be placeholder
          cards: updatedProjectData.cards.map(c => ({
            ...c,
            templateId: c.templateId || NEW_CARD_TEMPLATE_ID_PLACEHOLDER,
            imageUrl: c.imageUrl || 'https://placehold.co/280x400.png',
            dataAiHint: c.dataAiHint || 'card art',
          }))
        };
        persistProjects(updatedProjectsList);
        return updatedProjectsList;
      }
      console.warn(`Project with ID ${updatedProjectData.id} not found for update during setProjects. No update performed.`);
      return prevProjects;
    });

    if (projectWasFoundAndUpdated) {
        return { success: true, message: `Project '${updatedProjectData.name}' updated successfully.` };
    } else {
        return { success: false, message: `Project with ID '${updatedProjectData.id}' not found; update failed.` };
    }
  }, [persistProjects]);


  const updateProjectAssociatedTemplates = useCallback(async (projectId: string, associatedTemplateIds: CardTemplateId[]): Promise<{ success: boolean; message: string }> => {
    const projectToUpdate = getProjectById(projectId); 
    if (!projectToUpdate) {
      return { success: false, message: `Project with ID '${projectId}' not found.` };
    }
    const updatedProject = { ...projectToUpdate, associatedTemplateIds };
    return updateProject(updatedProject);
  }, [getProjectById, updateProject]);


  const updateProjectCards = useCallback(async (projectId: string, cards: CardData[]): Promise<{ success: boolean; message: string }> => {
    const projectToUpdate = getProjectById(projectId); 
    if (!projectToUpdate) {
      return { success: false, message: `Project with ID '${projectId}' not found.` };
    }
    const updatedProject = { ...projectToUpdate, cards };
    return updateProject(updatedProject);
  }, [getProjectById, updateProject]);


  return (
    <ProjectContext.Provider value={{ projects, getProjectById, addProject, updateProject, updateProjectAssociatedTemplates, updateProjectCards, isLoading }}>
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
