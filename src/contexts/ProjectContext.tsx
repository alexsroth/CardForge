
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

// Seed data is now an empty array, or could be a single "Example Project" if desired.
// For a truly blank start, an empty array is best.
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
      thumbnailUrl: 'https://placehold.co/300x200.png', // Default thumbnail
      dataAiHint: 'abstract game concept', // Default hint
      lastModified: new Date().toISOString(),
      associatedTemplateIds: projectData.associatedTemplateIds || [],
      cards: [
        // Add a default starter card for new projects
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
    setProjects(prevProjects => {
      const existingIndex = prevProjects.findIndex(p => p.id === updatedProjectData.id);
      let updatedProjectsList;
      if (existingIndex > -1) {
        updatedProjectsList = [...prevProjects];
        updatedProjectsList[existingIndex] = {
          ...updatedProjectData,
          lastModified: new Date().toISOString() 
        };
      } else {
        // This case should ideally not happen if addProject is used for new ones.
        // If it does, it means we're trying to update a non-existent project.
        console.warn(`Project with ID ${updatedProjectData.id} not found for update. This might indicate an issue.`);
        // To prevent data loss, we could add it, but it's better to ensure projects are added via addProject.
        // updatedProjectsList = [...prevProjects, { ...updatedProjectData, lastModified: new Date().toISOString() }];
        updatedProjectsList = [...prevProjects]; // Keep current list if project not found for update
         return updatedProjectsList; // Early return if project not found to prevent altering persistProjects
      }
      persistProjects(updatedProjectsList);
      return updatedProjectsList;
    });
    // This message might be misleading if the project wasn't found.
    // Consider returning success based on whether the project was actually found and updated.
    const projectWasFound = projects.some(p => p.id === updatedProjectData.id);
    if (projectWasFound) {
        return { success: true, message: `Project '${updatedProjectData.name}' updated successfully.` };
    } else {
        return { success: false, message: `Project with ID '${updatedProjectData.id}' not found for update.` };
    }
  }, [persistProjects, projects]); 


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
