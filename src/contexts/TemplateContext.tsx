
// src/contexts/TemplateContext.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CardTemplate, CardTemplateId as ImportedCardTemplateId } from '@/lib/card-templates'; // Assuming this is where CardTemplate is defined
import { cardTemplates as initialSeedTemplates } from '@/lib/card-templates'; // The seed data

export type CardTemplateId = ImportedCardTemplateId;

interface TemplateContextType {
  templates: CardTemplate[];
  getTemplateById: (id: CardTemplateId | undefined) => CardTemplate | undefined;
  saveTemplate: (templateData: CardTemplate) => void;
  addTemplate: (templateData: CardTemplate) => Promise<{ success: boolean; message: string }>;
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
        setTemplates(JSON.parse(storedTemplates));
      } else {
        // Seed with initial templates if nothing in localStorage
        setTemplates(initialSeedTemplates);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialSeedTemplates));
      }
    } catch (error) {
      console.error("Failed to load templates from localStorage, using initial seed:", error);
      setTemplates(initialSeedTemplates);
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

  const saveTemplate = useCallback((templateData: CardTemplate) => {
    setTemplates(prevTemplates => {
      const existingIndex = prevTemplates.findIndex(t => t.id === templateData.id);
      let updatedTemplates;
      if (existingIndex > -1) {
        updatedTemplates = [...prevTemplates];
        updatedTemplates[existingIndex] = templateData;
      } else {
        updatedTemplates = [...prevTemplates, templateData];
      }
      persistTemplates(updatedTemplates);
      return updatedTemplates;
    });
  }, [persistTemplates]);

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
    <TemplateContext.Provider value={{ templates, getTemplateById, saveTemplate, addTemplate, getAvailableTemplatesForSelect, isLoading }}>
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
