
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
  deleteProject: (projectId: string) => Promise<{ success: boolean; message: string }>;
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
            persistProjects(initialData);
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
      : NEW_CARD_TEMPLATE_ID_PLACEHOLDER;

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
          ...(starterCardTemplateId !== NEW_CARD_TEMPLATE_ID_PLACEHOLDER ? {} : { // Add defaults only if template not pre-selected
            cost: 0,
            attack: 0,
            defense: 0,
            cardType: 'Unit',
            effectText: 'This is a sample effect.'
          })
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
        updatedProjectsList[existingIndex] = {
          ...prevProjects[existingIndex],
          ...updatedProjectData,
          lastModified: new Date().toISOString(),
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
      return prevProjects;
    });

    if (projectWasFoundAndUpdated) {
        return { success: true, message: `Project '${updatedProjectData.name}' updated successfully.` };
    } else {
        return { success: false, message: `Project with ID '${updatedProjectData.id}' not found; update failed.` };
    }
  }, [persistProjects]);

  const deleteProject = useCallback(async (projectId: string): Promise<{ success: boolean; message: string }> => {
    let projectFoundAndDeleted = false;
    let projectName = '';

    setProjects(prevProjects => {
      const projectToDelete = prevProjects.find(p => p.id === projectId);
      if (projectToDelete) {
        projectName = projectToDelete.name;
        projectFoundAndDeleted = true;
        const updatedProjects = prevProjects.filter(p => p.id !== projectId);
        persistProjects(updatedProjects);
        return updatedProjects;
      }
      return prevProjects;
    });

    if (projectFoundAndDeleted) {
      return { success: true, message: `Project "${projectName}" deleted successfully.` };
    } else {
      return { success: false, message: `Project with ID "${projectId}" not found.` };
    }
  }, [persistProjects]);


  const updateProjectAssociatedTemplates = useCallback(async (projectId: string, associatedTemplateIds: CardTemplateId[]): Promise<{ success: boolean; message: string }> => {
    const projectToUpdate = getProjectById(projectId);
    if (!projectToUpdate) {
      return { success: false, message: `Project with ID '${projectId}' not found.` };
    }
    const updatedProject = { ...projectToUpdate, associatedTemplateIds, lastModified: new Date().toISOString() };
    return updateProject(updatedProject);
  }, [getProjectById, updateProject]);


  const updateProjectCards = useCallback(async (projectId: string, cards: CardData[]): Promise<{ success: boolean; message: string }> => {
    const projectToUpdate = getProjectById(projectId);
    if (!projectToUpdate) {
      return { success: false, message: `Project with ID '${projectId}' not found.` };
    }
    const updatedProject = { ...projectToUpdate, cards, lastModified: new Date().toISOString() };
    return updateProject(updatedProject);
  }, [getProjectById, updateProject]);


  return (
    <ProjectContext.Provider value={{ projects, getProjectById, addProject, updateProject, deleteProject, updateProjectAssociatedTemplates, updateProjectCards, isLoading }}>
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
