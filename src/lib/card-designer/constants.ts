
// src/lib/card-designer/constants.ts

export const NONE_VALUE = "_none_"; // Represents no selection or default theme value

export const COMMON_CARD_SIZES = [
  { label: "Default (280x400 px)", width: "280px", height: "400px", value: "280x400" },
  { label: "Poker (250x350 px)", width: "250px", height: "350px", value: "250x350" },
  { label: "Bridge (225x350 px)", width: "225px", height: "350px", value: "225x350" },
  { label: "Tarot (275x475 px)", width: "275px", height: "475px", value: "275x475" },
  { label: "Small Square (250x250 px)", width: "250px", height: "250px", value: "250x250" },
  { label: "Jumbo (350x500 px)", width: "350px", height: "500px", value: "350x500" },
  { label: "Business Card (350x200 px)", width: "350px", height: "200px", value: "350x200" },
  { label: "Custom", value: "custom" }
];

export const TAILWIND_TEXT_COLORS: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Theme Default)" },
    { value: "text-black", label: "Black" }, { value: "text-white", label: "White" },
    { value: "text-slate-500", label: "Slate 500" }, { value: "text-red-500", label: "Red 500" },
    { value: "text-orange-500", label: "Orange 500" }, { value: "text-amber-500", label: "Amber 500" },
    { value: "text-yellow-500", label: "Yellow 500" }, { value: "text-lime-500", label: "Lime 500" },
    { value: "text-green-500", label: "Green 500" }, { value: "text-emerald-500", label: "Emerald 500" },
    { value: "text-teal-500", label: "Teal 500" }, { value: "text-cyan-500", label: "Cyan 500" },
    { value: "text-sky-500", label: "Sky 500" }, { value: "text-blue-500", label: "Blue 500" },
    { value: "text-indigo-500", label: "Indigo 500" }, { value: "text-violet-500", label: "Violet 500" },
    { value: "text-purple-500", label: "Purple 500" }, { value: "text-fuchsia-500", label: "Fuchsia 500" },
    { value: "text-pink-500", label: "Pink 500" }, { value: "text-rose-500", label: "Rose 500" },
];

export const TAILWIND_FONT_SIZES: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Default)" },
    { value: "text-xs", label: "XS" }, { value: "text-sm", label: "Small" }, { value: "text-base", label: "Base" },
    { value: "text-lg", label: "Large" }, { value: "text-xl", label: "XL" }, { value: "text-2xl", label: "2XL" },
];

export const TAILWIND_FONT_WEIGHTS: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Default)" },
    { value: "font-light", label: "Light (300)" }, { value: "font-normal", label: "Normal (400)" },
    { value: "font-medium", label: "Medium (500)" }, { value: "font-semibold", label: "Semi-Bold (600)" },
    { value: "font-bold", label: "Bold (700)" }, { value: "font-extrabold", label: "Extra Bold (800)" },
];

export const TAILWIND_LINE_HEIGHTS: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Default)" },
    { value: "leading-none", label: "None (1)"}, { value: "leading-tight", label: "Tight (1.25)" }, { value: "leading-snug", label: "Snug (1.375)" },
    { value: "leading-normal", label: "Normal (1.5)" }, { value: "leading-relaxed", label: "Relaxed (1.625)" }, { value: "leading-loose", label: "Loose (2)" },
    { value: "leading-3", label: ".75rem (12px)"}, { value: "leading-4", label: "1rem (16px)"}, { value: "leading-5", label: "1.25rem (20px)"},
    { value: "leading-6", label: "1.5rem (24px)"}, { value: "leading-7", label: "1.75rem (28px)"}, { value: "leading-8", label: "2rem (32px)"},
    { value: "leading-9", label: "2.25rem (36px)"}, { value: "leading-10", label: "2.5rem (40px)"},
];

export const TAILWIND_OVERFLOW: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Default)" },
    { value: "overflow-auto", label: "Auto" }, { value: "overflow-hidden", label: "Hidden" },
    { value: "overflow-clip", label: "Clip" }, { value: "overflow-visible", label: "Visible" },
    { value: "overflow-scroll", label: "Scroll"},
    { value: "overflow-x-auto", label: "X: Auto"}, { value: "overflow-y-auto", label: "Y: Auto"},
    { value: "overflow-x-hidden", label: "X: Hidden"}, { value: "overflow-y-hidden", label: "Y: Hidden"},
    { value: "overflow-x-scroll", label: "X: Scroll"}, { value: "overflow-y-scroll", label: "Y: Scroll"},
];

export const TAILWIND_TEXT_OVERFLOW: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Default)" }, { value: "truncate", label: "Truncate" },
    { value: "text-ellipsis", label: "Ellipsis" }, { value: "text-clip", label: "Clip" },
];

export const TAILWIND_BORDER_RADIUS_OPTIONS: Array<{value: string, label: string}> = [
  { value: NONE_VALUE, label: "None (Default)" }, { value: "rounded-none", label: "None (Explicit)"},
  { value: "rounded-sm", label: "Small"}, { value: "rounded", label: "Default"},
  { value: "rounded-md", label: "Medium"}, { value: "rounded-lg", label: "Large"},
  { value: "rounded-xl", label: "XL"}, { value: "rounded-2xl", label: "2XL"},
  { value: "rounded-3xl", label: "3XL"}, { value: "rounded-full", label: "Full"},
];

// For individual side border widths
export const BORDER_SIDE_WIDTH_OPTIONS: { value: string; label: string; classPrefix: string }[] = [
  { value: NONE_VALUE, label: "None (No Border)", classPrefix: ''}, // No class for no border
  { value: 'default', label: "Default (1px)", classPrefix: 'border-'}, // e.g., border-t
  { value: '0', label: "0px", classPrefix: 'border-?-0'}, // e.g., border-t-0
  { value: '2', label: "2px", classPrefix: 'border-?-2'}, // e.g., border-t-2
  { value: '4', label: "4px", classPrefix: 'border-?-4'},
  { value: '8', label: "8px", classPrefix: 'border-?-8'},
];


export const TAILWIND_BORDER_PALETTE_OPTIONS: Array<{value: string, label: string}> = [
  { value: NONE_VALUE, label: "None (Theme Default)" }, { value: "transparent", label: "Transparent" },
  { value: "current", label: "Current Text Color" }, { value: "primary", label: "Primary Theme" },
  { value: "secondary", label: "Secondary Theme" }, { value: "muted", label: "Muted Theme" },
  { value: "destructive", label: "Destructive Theme" }, { value: "white", label: "White" },
  { value: "black", label: "Black" },
  ...["slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"].flatMap(color => [
    { value: `${color}-300`, label: `${color.charAt(0).toUpperCase() + color.slice(1)} 300` },
    { value: `${color}-500`, label: `${color.charAt(0).toUpperCase() + color.slice(1)} 500` },
    { value: `${color}-700`, label: `${color.charAt(0).toUpperCase() + color.slice(1)} 700` },
  ])
];

export const TAILWIND_BACKGROUND_COLORS: Array<{value: string, label: string}> = [
    { value: NONE_VALUE, label: "None (Use Direct CSS Input or Theme Default)"},
    { value: "bg-transparent", label: "Transparent" },
    { value: "bg-card", label: "Default (Card BG)" },
    { value: "bg-background", label: "Default (Page BG)" },
    { value: "bg-primary", label: "Primary" },
    { value: "bg-secondary", label: "Secondary" },
    { value: "bg-muted", label: "Muted" },
    { value: "bg-accent", label: "Accent" },
    { value: "bg-destructive", label: "Destructive" },
    { value: "bg-white", label: "White" },
    { value: "bg-black", label: "Black" },
    ...["slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"].flatMap(color => [
        { value: `bg-${color}-300`, label: `${color.charAt(0).toUpperCase() + color.slice(1)} 300` },
        { value: `bg-${color}-500`, label: `${color.charAt(0).toUpperCase() + color.slice(1)} 500` },
        { value: `bg-${color}-700`, label: `${color.charAt(0).toUpperCase() + color.slice(1)} 700` },
    ])
];

export const commonLucideIconsForGuide = [
  "Coins", "Sword", "Shield", "Zap", "Brain", "Heart", "Skull", "Star", "Gem",
  "Settings", "PlusCircle", "MinusCircle", "XCircle", "CheckCircle2",
  "AlertTriangle", "Info", "HelpCircle", "Wand2", "Sparkles", "Sun", "Moon",
  "Cloud", "Flame", "Leaf", "Droplets", "Feather", "Eye", "Swords", "ShieldCheck",
  "ShieldAlert", "Aperture", "Book", "Camera", "Castle", "Crown", "Diamond", "Dice5",
  "Flag", /* "Flash", // Removed due to build error */ "Flower", "Gift", "Globe", "KeyRound", "Lightbulb", "Lock",
  "MapPin", "Medal", "Mountain", "Music", "Package", "Palette", "PawPrint", "Pencil",
  "Phone", "Puzzle", "Rocket", "Save", "Search", "Ship", "Sprout", "Ticket", "Trash2",
  "TreePine", "Trophy", "Umbrella", "User", "Video", "Wallet", "Watch", "Wifi", "Wrench"
] as const;

// console.log('[DEBUG] card-designer/constants.ts: Module loaded');

    