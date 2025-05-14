// src/app/templates/page.tsx
import { cardTemplates, type CardTemplate, type TemplateField } from '@/lib/card-templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

function TemplateFieldDetail({ field }: { field: TemplateField }) {
  return (
    <li className="text-sm py-1">
      <span className="font-semibold">{field.label}</span> ({field.key}): <Badge variant="outline" className="ml-1">{field.type}</Badge>
      {field.defaultValue !== undefined && (
        <span className="text-xs text-muted-foreground ml-2">Default: {String(field.defaultValue)}</span>
      )}
       {field.placeholder && (
        <span className="text-xs text-muted-foreground ml-2 italic">Placeholder: "{field.placeholder}"</span>
      )}
      {field.type === 'select' && field.options && (
        <div className="text-xs text-muted-foreground ml-4">
          Options: {field.options.map(opt => `${opt.label} (${opt.value})`).join(', ')}
        </div>
      )}
    </li>
  );
}


export default function TemplateLibraryPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Template Library</h1>
        <Button asChild>
          <Link href="/templates/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Template
          </Link>
        </Button>
      </div>

      <Alert variant="default" className="mb-6 bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Important Note</AlertTitle>
        <AlertDescription>
          This library displays templates defined in <code>src/lib/card-templates.ts</code>.
          If you create a new template using the Template Designer, a <strong>server restart</strong> is typically required for it to appear here and be usable in the editor.
        </AlertDescription>
      </Alert>

      {cardTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cardTemplates.map((template: CardTemplate) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>ID: <code>{template.id}</code></CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Fields:</h4>
                {template.fields.length > 0 ? (
                  <ScrollArea className="h-[150px] pr-3"> {/* Max height for field list */}
                    <ul className="list-disc list-inside pl-2 space-y-1">
                      {template.fields.map((field) => (
                        <TemplateFieldDetail key={field.key} field={field} />
                      ))}
                    </ul>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">No fields defined for this template.</p>
                )}
              </CardContent>
              {/* Optional Footer
              <CardFooter>
                <Button variant="outline" size="sm">View Details (Not Implemented)</Button>
              </CardFooter>
              */}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">No Templates Found</h2>
          <p className="text-muted-foreground mt-2">
            It looks like there are no card templates defined in <code>src/lib/card-templates.ts</code>.
          </p>
          <Button asChild className="mt-4">
            <Link href="/templates/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Your First Template
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
