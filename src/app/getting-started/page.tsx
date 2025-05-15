// src/app/getting-started/page.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, ListChecks, PencilRuler, LibrarySquare, PlusCircle, Edit3, LayoutGrid, Rocket, Info } from 'lucide-react';

export default function GettingStartedPage() {
  const steps = [
    {
      icon: <LibrarySquare className="h-6 w-6 text-primary" />,
      title: "1. Create a Card Template",
      description: "Templates define the data structure of your cards (e.g., name, cost, attack, description). Think of them as blueprints.",
      actionText: "Go to Template Designer",
      href: "/templates/new",
      details: [
        "Give your template a Name (e.g., 'Monster Card', 'Spell Card'). The ID will be auto-generated.",
        "Add Data Fields relevant to this card type (e.g., 'hitPoints', 'manaCost', 'effectText').",
        "Choose a type for each field (Text, Textarea, Number, Boolean, Select, Placeholder Image).",
        "Set optional placeholders or default values for some fields."
      ]
    },
    {
      icon: <PencilRuler className="h-6 w-6 text-primary" />,
      title: "2. Define the Card's Visual Layout",
      description: "Once you have a template, define how its data fields will be displayed visually on the card. This is done using a JSON definition within the Template Designer.",
      actionText: "Go to Template Library (to edit a template)",
      href: "/templates", 
      details: [
        "In the Template Designer (when creating or editing a template), find the 'Layout Definition (JSON)' section.",
        "Use the default JSON as a starting point. You can see a live preview as you edit.",
        "Match `fieldKey` values in the JSON to the 'Field Key's from your Data Fields section.",
        "Adjust positions, fonts, colors, and add icons to create your desired look.",
        "Refer to the 'Layout JSON Guide' within the designer for schema details and available field keys."
      ]
    },
    {
      icon: <PlusCircle className="h-6 w-6 text-primary" />,
      title: "3. Create Your Game Project",
      description: "A Project holds all the cards for a specific game or set you're designing.",
      actionText: "Go to Dashboard & Create Project",
      href: "/",
      details: [
        "Navigate to the Dashboard (main page).",
        "Click the 'New Project' button.",
        "Give your project a name (e.g., 'My Epic Fantasy Game').",
        "Optionally, select which of your globally defined Card Templates you want to associate with this project from the start."
      ]
    },
    {
      icon: <ListChecks className="h-6 w-6 text-primary" />,
      title: "4. Associate Templates with Your Project",
      description: "Make sure your project knows which global card templates it can use. This is crucial for adding cards of specific types to your project.",
      actionText: "Manage Template Assignments",
      href: "/templates/assignments",
      details: [
        "Go to 'Template Library' > 'Manage Assignments'.",
        "For each project, check the boxes for the Card Templates you want to use in it.",
        "This makes those templates available in that project's Card Editor."
      ]
    },
    {
      icon: <Edit3 className="h-6 w-6 text-primary" />,
      title: "5. Add and Edit Cards in Your Project",
      description: "With your project and templates set up, start creating and detailing your cards!",
      actionText: "Go to Project Dashboard (to open a project)",
      href: "/",
      details: [
        "From the Dashboard, open your project by clicking its 'Editor' button.",
        "Click 'Add Card'. You'll first select a template for the new card (from those associated with the project).",
        "Fill in the data for each field defined in the template.",
        "The card will render using the layout you defined for its template."
      ]
    },
    {
      icon: <LayoutGrid className="h-6 w-6 text-primary" />,
      title: "6. View Your Deck",
      description: "See all the cards in your project in a clean grid layout.",
      actionText: "Open a Project Editor (then 'View Deck')",
      href: "/", 
      details: [
        "While in a project's Card Editor, click the 'View Deck' button.",
        "This provides a read-only overview of all cards in that project."
      ]
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card className="mb-8 shadow-lg">
        <CardHeader className="bg-muted/30 dark:bg-muted/20">
          <div className="flex items-center space-x-3">
            <Rocket className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold">Getting Started with CardForge</CardTitle>
              <CardDescription className="text-md">
                Follow these steps to design and manage your card game projects.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
           <Alert variant="default" className="mb-6 bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary font-semibold">Tip for a Smooth Experience</AlertTitle>
            <AlertDescription className="text-primary/80 dark:text-primary/90">
              CardForge saves your templates and projects in your browser's local storage. This means your work persists between sessions on the same browser!
            </AlertDescription>
          </Alert>
          <p className="mb-6 text-muted-foreground">
            Welcome to CardForge! This guide will walk you through the core workflow for creating your own cards and projects. Each step builds upon the last, so it's recommended to follow them in order if you're new.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {steps.map((step, index) => (
          <Card key={index} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start space-x-4">
                {step.icon}
                <div>
                  <CardTitle className="text-xl font-semibold">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-4 mb-4">
                {step.details.map((detail, i) => (
                  <li key={i}>{detail}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild variant="default" size="sm">
                <Link href={step.href}>
                  {step.actionText} <CheckCircle2 className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="mt-10 text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Happy Designing!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You're now equipped with the basics of CardForge. Explore, experiment, and bring your card game ideas to life!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
