import Link from 'next/link';
import { Package2 } from 'lucide-react'; // Using Package2 as a generic app icon

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
        {/* Add navigation items here if needed later */}
      </div>
    </header>
  );
}
