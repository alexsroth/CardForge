import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming your cn function is in this path

interface IconComponentProps extends LucideIcons.LucideProps {
  name: string;
}

const IconComponent = ({ name, className, ...props }: IconComponentProps) => {
  const Icon = (LucideIcons as any)[name]; // Use 'any' or a more specific type if you have a list of valid icon names
  if (!Icon) {
    console.warn(`[DEBUG] IconComponent: Lucide icon "${name}" not found or not a function. Fallback HelpCircle will be used.`);
    return <LucideIcons.HelpCircle className={cn("h-4 w-4", className)} {...props} />;
  }
  return <Icon className={cn("h-4 w-4", className)} {...props} />;
};

export default IconComponent;
