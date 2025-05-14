
// src/contexts/ProjectContext.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Project, CardData, CardTemplateId } from '@/lib/types';

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

// Seed data is now an empty array.
const seedProjectsData: Project[] = [];


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
        initialData = seedProjectsData.map(p => ({ ...p }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialData));
      }
    } catch (error) {
      console.error("Failed to load projects from localStorage, using initial seed:", error);
      initialData = seedProjectsData.map(p => ({ ...p }));
    }

    setProjects(initialData);
    setIsLoading(false);

  }, []);

  const persistProjects = useCallback((updatedProjects: Project[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProjects));
    } catch (error) {
      console.error("Failed to save projects to localStorage:", error);
    }
  }, []);

  const getProjectById = useCallback((id: string | undefined): Project | undefined => {
    if (!id) return undefined;
    return projects.find(p => p.id === id);
  }, [projects]);

  const addProject = useCallback(async (
    projectData: { name: string; associatedTemplateIds?: CardTemplateId[] }
  ): Promise<{ success: boolean; message: string; newProject?: Project }> => {

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
          templateId: (projectData.associatedTemplateIds && projectData.associatedTemplateIds.length > 0) ? projectData.associatedTemplateIds[0] : 'generic',
          name: 'My First Card',
          description: 'This is a new card in your project. Edit its properties and template!',
          imageUrl: 'https://placehold.co/280x400.png',
          dataAiHint: 'card game concept',
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
        projectWasFoundAndUpdated = true; // Mark that the project was found and will be updated
        const updatedProjectsList = [...prevProjects];
        updatedProjectsList[existingIndex] = {
          ...updatedProjectData, // Use the incoming project data
          lastModified: new Date().toISOString() // Always update lastModified timestamp
        };
        persistProjects(updatedProjectsList);
        return updatedProjectsList;
      }
      // Project not found, return previous state without changes
      console.warn(`Project with ID ${updatedProjectData.id} not found for update during setProjects. No update performed.`);
      return prevProjects; // Return prevProjects if not found to avoid changing state unnecessarily
    });

    // The success/failure message depends on whether the project was found *within the setProjects updater*.
    // This approach makes the `updateProject` callback itself more stable by not depending on `projects` state from its outer scope.
    if (projectWasFoundAndUpdated) {
        return { success: true, message: `Project '${updatedProjectData.name}' updated successfully.` };
    } else {
        // This message implies that the project ID didn't match anything in the current list.
        return { success: false, message: `Project with ID '${updatedProjectData.id}' not found; update failed.` };
    }
  }, [persistProjects]);


  const updateProjectAssociatedTemplates = useCallback(async (projectId: string, associatedTemplateIds: CardTemplateId[]): Promise<{ success: boolean; message: string }> => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (!projectToUpdate) {
      return { success: false, message: `Project with ID '${projectId}' not found.` };
    }
    // Create a new project object with updated associations
    const updatedProject = { ...projectToUpdate, associatedTemplateIds };
    return updateProject(updatedProject); // Call the main updateProject function
  }, [projects, updateProject]);


  const updateProjectCards = useCallback(async (projectId: string, cards: CardData[]): Promise<{ success: boolean; message: string }> => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (!projectToUpdate) {
      return { success: false, message: `Project with ID '${projectId}' not found.` };
    }
    // Create a new project object with updated cards
    const updatedProject = { ...projectToUpdate, cards };
    return updateProject(updatedProject); // Call the main updateProject function
  }, [projects, updateProject]);


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
