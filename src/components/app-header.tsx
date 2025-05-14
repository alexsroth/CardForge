import Link from 'next/link';
import { Package2, PencilRuler, LibrarySquare } from 'lucide-react'; // Using Package2 as a generic app icon

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Package2 className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block text-foreground">
            CardForge
          </span>
        </Link>
        <nav className="flex items-center space-x-6"> {/* Increased space-x for new item */}
          <Link href="/templates" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center">
            <LibrarySquare className="mr-1 h-4 w-4" />
            Template Library
          </Link>
          <Link href="/templates/new" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center">
            <PencilRuler className="mr-1 h-4 w-4" />
            Template Designer
          </Link>
        </nav>
        {/* Add navigation items here if needed later */}
      </div>
    </header>
  );
}
