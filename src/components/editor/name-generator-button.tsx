"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface NameGeneratorButtonProps {
  currentDescription: string;
  onGenerateName: (description: string) => Promise<string>;
  onNameGenerated: (name: string) => void;
  isLoading: boolean;
}

export default function NameGeneratorButton({ currentDescription, onGenerateName, onNameGenerated, isLoading }: NameGeneratorButtonProps) {
  const handleClick = async () => {
    const generatedName = await onGenerateName(currentDescription);
    if (generatedName) {
      onNameGenerated(generatedName);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isLoading || !currentDescription.trim()}
      variant="outline"
      size="icon"
      aria-label="Generate card name"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
    </Button>
  );
}
