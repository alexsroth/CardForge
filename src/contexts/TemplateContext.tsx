
// src/contexts/TemplateContext.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CardTemplate as ImportedCardTemplate, CardTemplateId as ImportedCardTemplateId } from '@/lib/card-templates'; // Assuming this is where CardTemplate is defined
import { cardTemplates as initialSeedTemplates } from '@/lib/card-templates'; // The seed data

export type CardTemplate = ImportedCardTemplate;
export type CardTemplateId = ImportedCardTemplateId;

interface TemplateContextType {
  templates: CardTemplate[];
  getTemplateById: (id: CardTemplateId | undefined) => CardTemplate | undefined;
  addTemplate: (templateData: CardTemplate) => Promise<{ success: boolean; message: string }>;
  updateTemplate: (templateData: CardTemplate) => Promise<{ success: boolean; message: string }>;
  getAvailableTemplatesForSelect: (allowedTemplateIds?: CardTemplateId[]) => Array<{ value: CardTemplateId; label: string }>;
  isLoading: boolean;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'cardForgeTemplates';

export const TemplateProvider = ({ children }: { children: ReactNode }) => {
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedTemplates = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedTemplates) {
        // Ensure fields are always arrays
        const parsedTemplates: CardTemplate[] = JSON.parse(storedTemplates);
        const validatedTemplates = parsedTemplates.map(t => ({
          ...t,
          fields: Array.isArray(t.fields) ? t.fields : []
        }));
        setTemplates(validatedTemplates);
      } else {
        // Seed with initial templates if nothing in localStorage
        const validatedSeedTemplates = initialSeedTemplates.map(t => ({
          ...t,
          fields: Array.isArray(t.fields) ? t.fields : []
        }));
        setTemplates(validatedSeedTemplates);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(validatedSeedTemplates));
      }
    } catch (error) {
      console.error("Failed to load templates from localStorage, using initial seed:", error);
      const validatedSeedTemplates = initialSeedTemplates.map(t => ({
          ...t,
          fields: Array.isArray(t.fields) ? t.fields : []
        }));
      setTemplates(validatedSeedTemplates);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persistTemplates = useCallback((updatedTemplates: CardTemplate[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTemplates));
    } catch (error) {
      console.error("Failed to save templates to localStorage:", error);
      // Potentially show a toast to the user
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
    setTemplates(prevTemplates => {
      const updatedTemplates = [...prevTemplates, templateData];
      persistTemplates(updatedTemplates);
      return updatedTemplates;
    });
    return { success: true, message: `Template '${templateData.name}' saved successfully.` };
  }, [templates, persistTemplates]);

  const updateTemplate = useCallback(async (templateData: CardTemplate): Promise<{ success: boolean; message: string }> => {
    if (!templateData.id) {
      return { success: false, message: "Template ID is missing, cannot update." };
    }
    let found = false;
    setTemplates(prevTemplates => {
      const updatedTemplates = prevTemplates.map(t => {
        if (t.id === templateData.id) {
          found = true;
          return templateData; // Replace with new data
        }
        return t;
      });
      if (found) {
        persistTemplates(updatedTemplates);
        return updatedTemplates;
      }
      return prevTemplates; // No change if not found (though should ideally not happen if called correctly)
    });

    if (found) {
      return { success: true, message: `Template '${templateData.name}' updated successfully.` };
    } else {
      return { success: false, message: `Template with ID '${templateData.id}' not found. Update failed.` };
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
    <TemplateContext.Provider value={{ templates, getTemplateById, addTemplate, updateTemplate, getAvailableTemplatesForSelect, isLoading }}>
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

    