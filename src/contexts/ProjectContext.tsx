
// src/contexts/ProjectContext.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Project, CardData, CardTemplateId } from '@/lib/types';
// Default mock projects to be used as seed if localStorage is empty.
// This will be the new home for this mock data.
import { mockProjects as initialSeedProjects } from '@/app/page';


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

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedProjects = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      } else {
        setProjects(initialSeedProjects);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialSeedProjects));
      }
    } catch (error) {
      console.error("Failed to load projects from localStorage, using initial seed:", error);
      setProjects(initialSeedProjects);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        updatedProjectsList[existingIndex] = updatedProjectData;
      } else {
        // Optionally handle adding a new project if it doesn't exist, or return error
        // For now, let's assume we only update existing ones through this specific function.
        // To add new projects, a dedicated addProject function would be better.
        console.warn(`Project with ID ${updatedProjectData.id} not found for update. Adding as new project.`);
        updatedProjectsList = [...prevProjects, updatedProjectData];
      }
      persistProjects(updatedProjectsList);
      return updatedProjectsList;
    });
    return { success: true, message: `Project '${updatedProjectData.name}' updated successfully.` };
  }, [persistProjects]);


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
    // In a real app, you might want to merge cards or handle individual card updates more granularly
    // For now, we replace the entire cards array.
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
