"use client";

import type { CardData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileJson, FileText } from 'lucide-react';
import { ChangeEvent, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DataControlsProps {
  cards: CardData[];
  onImport: (importedCards: CardData[]) => void;
}

export default function DataControls({ cards, onImport }: DataControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExportJSON = () => {
    if (cards.length === 0) {
      toast({ title: "Export Failed", description: "No cards to export.", variant: "destructive"});
      return;
    }
    const jsonData = JSON.stringify(cards, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'card_deck.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: "Deck exported as JSON."});
  };

  const handleExportCSV = () => {
    if (cards.length === 0) {
      toast({ title: "Export Failed", description: "No cards to export.", variant: "destructive"});
      return;
    }
    // Basic CSV export, assuming flat structure or specific fields
    // More complex data might need a more robust CSV parser/stringifier
    const headers = ['id', 'templateId', 'name', 'description', 'cost', 'attack', 'defense', 'imageUrl', 'rarity', 'effectText', 'flavorText'];
    const csvRows = [
      headers.join(','),
      ...cards.map(card => 
        headers.map(header => {
          let value = card[header as keyof CardData] ?? '';
          if (typeof value === 'string') {
            // Escape quotes and handle commas
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];
    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'card_deck.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: "Deck exported as CSV."});
  };

  const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importedData: CardData[];
        if (file.name.endsWith('.json')) {
          importedData = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          // Basic CSV parsing - this is very naive and should be replaced by a library for production
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
          importedData = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.replace(/"/g, '').trim()); // Naive parsing
            const card: Partial<CardData> = {};
            headers.forEach((header, index) => {
              const key = header as keyof CardData;
              let value: any = values[index];
              // Attempt to convert numbers
              if (key === 'cost' || key === 'attack' || key === 'defense') {
                value = value !== '' ? Number(value) : undefined;
              }
              (card as any)[key] = value;
            });
            if (!card.id) card.id = `imported-${Date.now()}-${Math.random()}`; // Ensure ID
            if (!card.templateId) card.templateId = 'generic'; // Default template
            return card as CardData;
          }).filter(card => card.name); // Filter out potentially empty rows
        } else {
          toast({ title: "Import Failed", description: "Unsupported file type.", variant: "destructive" });
          return;
        }
        // Validate importedData structure here if necessary
        onImport(importedData);
      } catch (error) {
        console.error("Import error:", error);
        toast({ title: "Import Failed", description: "Could not parse file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) { // Reset file input
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mt-4 flex gap-2">
      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
        <Upload className="mr-2 h-4 w-4" /> Import
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".json,.csv"
        onChange={handleFileImport}
      />
      <Button variant="outline" size="sm" onClick={handleExportJSON}>
        <FileJson className="mr-2 h-4 w-4" /> Export JSON
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportCSV}>
        <FileText className="mr-2 h-4 w-4" /> Export CSV
      </Button>
    </div>
  );
}
