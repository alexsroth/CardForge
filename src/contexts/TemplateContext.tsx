
// src/contexts/TemplateContext.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CardTemplate as ImportedCardTemplate, CardTemplateId as ImportedCardTemplateId } from '@/lib/card-templates';
import { cardTemplates as initialSeedTemplates, DEFAULT_CARD_LAYOUT_JSON_STRING } from '@/lib/card-templates'; // The seed data and default layout

export type CardTemplate = ImportedCardTemplate;
export type CardTemplateId = ImportedCardTemplateId;

interface TemplateContextType {
  templates: CardTemplate[];
  getTemplateById: (id: CardTemplateId | undefined) => CardTemplate | undefined;
  addTemplate: (templateData: CardTemplate) => Promise<{ success: boolean; message: string }>;
  updateTemplate: (templateData: CardTemplate) => Promise<{ success: boolean; message: string }>;
  deleteTemplate: (templateId: CardTemplateId) => Promise<{ success: boolean; message: string }>;
  getAvailableTemplatesForSelect: (allowedTemplateIds?: CardTemplateId[]) => Array<{ value: CardTemplateId; label: string }>;
  isLoading: boolean;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'cardForgeTemplates';

export const TemplateProvider = ({ children }: { children: ReactNode }) => {
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let loadedTemplates: CardTemplate[];
    try {
      const storedTemplates = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedTemplates) {
        loadedTemplates = JSON.parse(storedTemplates);
      } else {
        loadedTemplates = initialSeedTemplates;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(loadedTemplates));
      }
    } catch (error) {
      console.error("Failed to load templates from localStorage, using initial seed:", error);
      loadedTemplates = initialSeedTemplates;
    }
    
    const validatedTemplates = loadedTemplates.map(t => ({
      ...t,
      fields: Array.isArray(t.fields) ? t.fields : [],
      layoutDefinition: (typeof t.layoutDefinition === 'string' && t.layoutDefinition.trim() !== '') 
                          ? t.layoutDefinition 
                          : DEFAULT_CARD_LAYOUT_JSON_STRING,
    }));

    setTemplates(validatedTemplates);
    setIsLoading(false);
  }, []);

  const persistTemplates = useCallback((updatedTemplates: CardTemplate[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTemplates));
    } catch (error) {
      console.error("Failed to save templates to localStorage:", error);
    }
  }, []);

  const getTemplateById = useCallback((id: CardTemplateId | undefined): CardTemplate | undefined => {
    if (!id) return undefined;
    return templates.find(t => t.id === id);
  }, [templates]);

  const addTemplate = useCallback(async (templateData: CardTemplate): Promise<{ success: boolean; message: string }> => {
    if (templates.some(t => t.id === templateData.id)) {
      return { success: false, message: `Template ID '${templateData.id}' already exists.` };
    }
    
    const newTemplateData = {
      ...templateData,
      layoutDefinition: (typeof templateData.layoutDefinition === 'string' && templateData.layoutDefinition.trim() !== '')
                          ? templateData.layoutDefinition
                          : DEFAULT_CARD_LAYOUT_JSON_STRING,
    };

    setTemplates(prevTemplates => {
      const updatedTemplates = [...prevTemplates, newTemplateData];
      persistTemplates(updatedTemplates);
      return updatedTemplates;
    });
    return { success: true, message: `Template '${newTemplateData.name}' saved successfully.` };
  }, [templates, persistTemplates]);

  const updateTemplate = useCallback(async (templateData: CardTemplate): Promise<{ success: boolean; message: string }> => {
    if (!templateData.id) {
      return { success: false, message: "Template ID is missing, cannot update." };
    }
    let found = false;
    
    const updatedTemplateData = {
      ...templateData,
      layoutDefinition: (typeof templateData.layoutDefinition === 'string' && templateData.layoutDefinition.trim() !== '')
                          ? templateData.layoutDefinition
                          : DEFAULT_CARD_LAYOUT_JSON_STRING,
    };

    setTemplates(prevTemplates => {
      const updatedTemplates = prevTemplates.map(t => {
        if (t.id === updatedTemplateData.id) {
          found = true;
          return updatedTemplateData; 
        }
        return t;
      });
      if (found) {
        persistTemplates(updatedTemplates);
        return updatedTemplates;
      }
      return prevTemplates; 
    });

    if (found) {
      return { success: true, message: `Template '${updatedTemplateData.name}' updated successfully.` };
    } else {
      return { success: false, message: `Template with ID '${updatedTemplateData.id}' not found. Update failed.` };
    }
  }, [persistTemplates]);

  const deleteTemplate = useCallback(async (templateId: CardTemplateId): Promise<{ success: boolean; message: string }> => {
    let templateName = 'Unknown Template';
    let found = false;
    setTemplates(prevTemplates => {
      const templateToDelete = prevTemplates.find(t => t.id === templateId);
      if (templateToDelete) {
        templateName = templateToDelete.name;
        found = true;
      }
      const updatedTemplates = prevTemplates.filter(t => t.id !== templateId);
      persistTemplates(updatedTemplates);
      return updatedTemplates;
    });
    if (found) {
      return { success: true, message: `Template '${templateName}' deleted successfully.` };
    } else {
      return { success: false, message: `Template with ID '${templateId}' not found. Deletion failed.` };
    }
  }, [persistTemplates]);

  const getAvailableTemplatesForSelect = useCallback((allowedTemplateIds?: CardTemplateId[]) => {
    const templatesToConsider = allowedTemplateIds
      ? templates.filter(template => allowedTemplateIds.includes(template.id as CardTemplateId))
      : templates;

    return templatesToConsider.map(template => ({
      value: template.id as CardTemplateId,
      label: template.name,
    }));
  }, [templates]);

  return (
    <TemplateContext.Provider value={{ templates, getTemplateById, addTemplate, updateTemplate, deleteTemplate, getAvailableTemplatesForSelect, isLoading }}>
      {children}
    </TemplateContext.Provider>
  );
};

export const useTemplates = (): TemplateContextType => {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error('useTemplates must be used within a TemplateProvider');
  }
  return context;
};
    
