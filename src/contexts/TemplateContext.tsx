
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
    console.log('[DEBUG] TemplateContext: Initializing - loading templates from localStorage or seed.');
    
    let loadedTemplates: CardTemplate[];
    try {
      const storedTemplates = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedTemplates) {
        console.log('[DEBUG] TemplateContext: Found templates in localStorage.');
        loadedTemplates = JSON.parse(storedTemplates);
      } else {
        console.log('[DEBUG] TemplateContext: No templates in localStorage, using seed data.');
        loadedTemplates = initialSeedTemplates;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(loadedTemplates));
      }
    } catch (error) {
      console.error("Failed to load templates from localStorage, using initial seed:", error);
      loadedTemplates = initialSeedTemplates;
    }
    console.log('[DEBUG] TemplateContext: loadedTemplates', loadedTemplates);

    const validatedTemplates = loadedTemplates.map(t => ({
      ...t,
      fields: Array.isArray(t.fields) ? t.fields : [],
      layoutDefinition: (typeof t.layoutDefinition === 'string' && t.layoutDefinition.trim() !== '') 
                          ? t.layoutDefinition 
                          : DEFAULT_CARD_LAYOUT_JSON_STRING,
    }));
    console.log('[DEBUG] TemplateContext: validatedTemplates', validatedTemplates);

    setTemplates(validatedTemplates);
    setIsLoading(false);
    console.log('[DEBUG] TemplateContext: Initialization complete. Templates loaded:', validatedTemplates.length);
  }, []);

  const persistTemplates = useCallback((updatedTemplates: CardTemplate[]) => {
    console.log('[DEBUG] TemplateContext/persistTemplates: Persisting templates to localStorage', updatedTemplates.length);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTemplates));
    } catch (error) {
      console.error("Failed to save templates to localStorage:", error);
    }
  }, []);

  const getTemplateById = useCallback((id: CardTemplateId | undefined): CardTemplate | undefined => {
    if (!id) return undefined;
    const template = templates.find(t => t.id === id);
    // console.log(`[DEBUG] TemplateContext/getTemplateById: ID: ${id}, Found: ${!!template}`);
    return template;
  }, [templates]);

  const addTemplate = useCallback(async (templateData: CardTemplate): Promise<{ success: boolean; message: string }> => {
    console.log('[DEBUG] TemplateContext/addTemplate: Attempting to add template', templateData.id, templateData.name);
    if (templates.some(t => t.id === templateData.id)) {
      console.error('[DEBUG] TemplateContext/addTemplate: Error - Duplicate ID', templateData.id);
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
    console.log('[DEBUG] TemplateContext/addTemplate: Success - Template added', newTemplateData.id);
    return { success: true, message: `Template '${newTemplateData.name}' saved successfully.` };
  }, [templates, persistTemplates]);

  const updateTemplate = useCallback(async (templateData: CardTemplate): Promise<{ success: boolean; message: string }> => {
    console.log('[DEBUG] TemplateContext/updateTemplate: Attempting to update template', templateData.id, templateData.name);
    if (!templateData.id) {
      console.error('[DEBUG] TemplateContext/updateTemplate: Error - Template ID missing.');
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
      console.warn(`[DEBUG] TemplateContext/updateTemplate: Template with ID '${updatedTemplateData.id}' not found during update.`);
      return prevTemplates; 
    });

    if (found) {
      console.log('[DEBUG] TemplateContext/updateTemplate: Success - Template updated', updatedTemplateData.id);
      return { success: true, message: `Template '${updatedTemplateData.name}' updated successfully.` };
    } else {
      console.error('[DEBUG] TemplateContext/updateTemplate: Error - Template not found', updatedTemplateData.id);
      return { success: false, message: `Template with ID '${updatedTemplateData.id}' not found. Update failed.` };
    }
  }, [persistTemplates, templates]); // Added `templates` to dep array as it's used for checking existence implicitly.

  const deleteTemplate = useCallback(async (templateId: CardTemplateId): Promise<{ success: boolean; message: string }> => {
    console.log('[DEBUG] TemplateContext/deleteTemplate: Attempting to delete template', templateId);
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
      console.log('[DEBUG] TemplateContext/deleteTemplate: Success - Template deleted', templateId);
      return { success: true, message: `Template '${templateName}' deleted successfully.` };
    } else {
      console.error('[DEBUG] TemplateContext/deleteTemplate: Error - Template not found', templateId);
      return { success: false, message: `Template with ID '${templateId}' not found. Deletion failed.` };
    }
  }, [persistTemplates]);

  const getAvailableTemplatesForSelect = useCallback((allowedTemplateIds?: CardTemplateId[]) => {
    // console.log('[DEBUG] TemplateContext/getAvailableTemplatesForSelect: Allowed IDs:', allowedTemplateIds);
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
    

