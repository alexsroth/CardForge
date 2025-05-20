
// src/components/template-designer/TemplateDesigner/index.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Link from 'next/link';
import { PlusCircle, Palette, Save, Loader2, Eye, HelpCircle, Settings, EllipsisVertical, Copy, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';

import { useTemplateDesigner, type UseTemplateDesignerProps } from '@/hooks/useTemplateDesigner';
import FieldRow from '@/components/template-designer/field-row';
import DynamicCardRenderer from '@/components/editor/templates/dynamic-card-renderer';
import {
  NONE_VALUE,
  COMMON_CARD_SIZES,
  TAILWIND_TEXT_COLORS,
  TAILWIND_FONT_SIZES,
  TAILWIND_FONT_WEIGHTS,
  TAILWIND_LINE_HEIGHTS,
  TAILWIND_OVERFLOW,
  TAILWIND_TEXT_OVERFLOW,
  TAILWIND_BORDER_RADIUS_OPTIONS,
  BORDER_SIDE_WIDTH_OPTIONS,
  TAILWIND_BORDER_PALETTE_OPTIONS,
  TAILWIND_BACKGROUND_COLORS,
  commonLucideIconsForGuide,
  IconComponent,
} from '@/lib/card-designer';

console.log('[DEBUG] TemplateDesigner/index.tsx: Component loaded');

export interface TemplateDesignerProps extends UseTemplateDesignerProps {
  // No additional props specific to this wrapper for now
}

export const TemplateDesigner: React.FC<TemplateDesignerProps> = (props) => {
  const designer = useTemplateDesigner(props);
  console.log('[DEBUG] TemplateDesigner/index.tsx: Rendering. Mode from props:', props.mode, 'Active Editor View from hook:', designer.activeEditorView);

  const pageTitle = props.mode === 'create' ? "Create New Template" : `Edit Template: ${props.initialTemplate?.name || designer.templateName || '...'}`;
  const saveButtonText = props.mode === 'create' ? "Save Template" : "Save Changes";

  const isGenerateJsonDisabled = designer.isSaving || props.isLoadingContexts || designer.layoutElementGuiConfigs.filter(c => c.isEnabledOnCanvas).length === 0;
  const isSaveButtonDisabled = designer.isSaving || props.isLoadingContexts || !designer.templateName.trim() || designer.fields.length === 0 || (designer.activeEditorView === 'json' && !!designer.layoutJsonError);


  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Section: Template Info & Data Fields */}
      <Card className="shadow-lg">
         <CardHeader>
           <div className="sticky top-[56px] z-30 bg-background/95 backdrop-blur-sm -mx-6 -mt-6 px-6 pt-6 pb-4 border-b shadow-sm flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">{pageTitle}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/templates"><Palette className="mr-2 h-4 w-4" /> Back to Library</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9" disabled={props.isLoadingContexts || designer.isSaving}>
                    <EllipsisVertical className="h-4 w-4" /> <span className="sr-only">Page Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => designer.handleGenerateJsonFromBuilder(true)}
                    disabled={isGenerateJsonDisabled}
                    title={designer.activeEditorView === 'json' ? "Switch to GUI Builder view to use this effectively" :
                      (designer.layoutElementGuiConfigs.filter(c => c.isEnabledOnCanvas).length === 0 ? "Enable at least one element in GUI builder first" : undefined)}
                  >
                    <Palette className="mr-2 h-4 w-4" /> Generate/Update JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={designer.handleSave}
                    disabled={isSaveButtonDisabled}
                  >
                    {designer.isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>) : (<><Save className="mr-2 h-4 w-4" /> {saveButtonText}</>)}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardDescription className="text-sm pt-4 text-muted-foreground">
            {props.mode === 'create'
              ? "Define template name and data fields. Then, use the Visual Layout Builder (or JSON editor) to configure how card data is displayed. Template ID is auto-generated from name."
              : `Template ID (<code className="bg-muted px-1 rounded-sm">${designer.templateId}</code>) is fixed. Edit name, data fields, and use the builder or JSON editor for the visual layout.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor={`templateName-${props.mode}`} className="font-semibold">Template Name</Label>
              <Input
                id={`templateName-${props.mode}`}
                value={designer.templateName}
                onChange={(e) => designer.setTemplateName(e.target.value)}
                placeholder={props.mode === 'create' ? "e.g., 'Hero Unit Card'" : props.initialTemplate?.name}
                disabled={designer.isSaving || props.isLoadingContexts}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`templateIdDisplay-${props.mode}`} className="font-semibold">Template ID {props.mode === 'create' ? '(auto-generated)' : '(Read-only)'}</Label>
              <Input
                id={`templateIdDisplay-${props.mode}`}
                value={designer.templateId}
                readOnly
                disabled
                className="mt-1 bg-muted/50"
              />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Data Fields</h3>
            <div className="space-y-2">
              {designer.fields.map((field) => (
                <FieldRow
                  key={field._uiId || field.key} // Use _uiId if available, fallback to key
                  field={field}
                  onChange={(updatedField) => designer.handleFieldChange(field._uiId!, updatedField)}
                  onRemove={() => designer.removeField(field._uiId!)}
                  isSaving={designer.isSaving || props.isLoadingContexts}
                />
              ))}
              {designer.fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                  No fields added yet. Click "Add Field" to begin.
                </p>
              )}
            </div>
            <Button
              onClick={designer.addField}
              variant="outline"
              size="sm"
              disabled={designer.isSaving || props.isLoadingContexts}
              className="mt-4"
              title="Add a new data field"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section: Layout Builder & Preview */}
      <div className="flex flex-col md:flex-row md:gap-6 items-start">
        <Card className="md:w-[65%] flex flex-col shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Visual Layout Builder & JSON Output</CardTitle>
                <div className="flex items-center space-x-2">
                    <Label htmlFor={`editor-view-toggle-${props.mode}`} className="text-xs text-muted-foreground whitespace-nowrap">
                    {designer.activeEditorView === 'gui' ? 'Using GUI Builder' : 'Using JSON Editor'}
                    </Label>
                    <Switch
                    id={`editor-view-toggle-${props.mode}`}
                    checked={designer.activeEditorView === 'gui'}
                    onCheckedChange={(checked) => {
                        designer.setActiveEditorView(checked ? 'gui' : 'json');
                    }}
                    aria-label="Toggle editor view"
                    disabled={designer.isSaving || props.isLoadingContexts}
                    />
                </div>
            </div>
            <CardDescription className="text-sm pt-2 text-muted-foreground">
              {designer.activeEditorView === 'gui'
                ? "Use the GUI to configure canvas properties and layout elements. The JSON output updates in the background to feed the Live Preview. Click 'Generate/Update JSON' from page actions to manually sync if needed."
                : "Directly edit the Layout Definition JSON. Changes here will update the preview. GUI controls will reflect these changes if you switch back to GUI mode (if JSON is valid)."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 flex flex-col">
            {designer.activeEditorView === 'gui' && (
              <>
                {/* Card Canvas Setup */}
                <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                  <h4 className="text-base font-semibold mb-2">Card Canvas Setup</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-end">
                    <div>
                      <Label htmlFor={`canvasSizePreset-${props.mode}`} className="text-xs font-medium">Canvas Size Preset</Label>
                      <Select value={designer.selectedSizePreset} onValueChange={designer.handleSizePresetChange} disabled={designer.isSaving || props.isLoadingContexts}>
                        <SelectTrigger id={`canvasSizePreset-${props.mode}`} className="mt-1 h-8 text-xs"><SelectValue placeholder="Select size preset" /></SelectTrigger>
                        <SelectContent>{COMMON_CARD_SIZES.map(size => (<SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    {designer.selectedSizePreset === 'custom' ? (
                      <>
                        <div><Label htmlFor={`canvasWidth-${props.mode}`} className="text-xs font-medium">Custom Width (CSS)</Label><Input id={`canvasWidth-${props.mode}`} value={designer.canvasWidthSetting} onChange={(e) => designer.setCanvasWidthSetting(e.target.value)} disabled={designer.isSaving || props.isLoadingContexts} className="mt-1 h-8 text-xs" /></div>
                        <div><Label htmlFor={`canvasHeight-${props.mode}`} className="text-xs font-medium">Custom Height (CSS)</Label><Input id={`canvasHeight-${props.mode}`} value={designer.canvasHeightSetting} onChange={(e) => designer.setCanvasHeightSetting(e.target.value)} disabled={designer.isSaving || props.isLoadingContexts} className="mt-1 h-8 text-xs" /></div>
                      </>
                    ) : (
                      <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                        <div><Label className="text-xs font-medium text-muted-foreground">Width</Label><p className="text-xs mt-1 h-8 flex items-center">{COMMON_CARD_SIZES.find(s => s.value === designer.selectedSizePreset)?.width || designer.canvasWidthSetting}</p></div>
                        <div><Label className="text-xs font-medium text-muted-foreground">Height</Label><p className="text-xs mt-1 h-8 flex items-center">{COMMON_CARD_SIZES.find(s => s.value === designer.selectedSizePreset)?.height || designer.canvasHeightSetting}</p></div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-end mt-2">
                    <div> <Label htmlFor={`tailwindCanvasBgColor-${props.mode}`} className="text-xs font-medium">BG Color (Tailwind)</Label> <Select value={designer.tailwindCanvasBackgroundColor} onValueChange={(v) => designer.setTailwindCanvasBackgroundColor(v)} disabled={designer.isSaving || props.isLoadingContexts}> <SelectTrigger id={`tailwindCanvasBgColor-${props.mode}`} className="mt-1 h-8 text-xs"><SelectValue placeholder="Select color" /></SelectTrigger> <SelectContent>{TAILWIND_BACKGROUND_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent> </Select> </div>
                    <div> <Label htmlFor={`canvasDirectBgColor-${props.mode}`} className="text-xs font-medium">BG Color (CSS)</Label> <Input id={`canvasDirectBgColor-${props.mode}`} value={designer.canvasDirectBackgroundColor} onChange={(e) => designer.setCanvasDirectBackgroundColor(e.target.value)} placeholder="e.g., #RRGGBB or hsl(...)" disabled={designer.isSaving || props.isLoadingContexts || (designer.tailwindCanvasBackgroundColor !== NONE_VALUE && !!designer.tailwindCanvasBackgroundColor)} className="mt-1 h-8 text-xs" /> </div>
                    <div> <Label htmlFor={`tailwindCanvasBorderRadius-${props.mode}`} className="text-xs font-medium">Border Radius (Tailwind)</Label> <Select value={designer.tailwindCanvasBorderRadius} onValueChange={(v) => designer.setTailwindCanvasBorderRadius(v)} disabled={designer.isSaving || props.isLoadingContexts}> <SelectTrigger id={`tailwindCanvasBorderRadius-${props.mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{TAILWIND_BORDER_RADIUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent> </Select> </div>
                    <div> <Label htmlFor={`tailwindCanvasBorderWidth-${props.mode}`} className="text-xs font-medium">Border Width (Tailwind)</Label> <Select value={designer.tailwindCanvasBorderWidth} onValueChange={(v) => designer.setTailwindCanvasBorderWidth(v)} disabled={designer.isSaving || props.isLoadingContexts}> <SelectTrigger id={`tailwindCanvasBorderWidth-${props.mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{BORDER_SIDE_WIDTH_OPTIONS.filter(o => !o.label.includes("Side Specific") && o.value !== NONE_VALUE).map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent> </Select> </div>
                    <div> <Label htmlFor={`tailwindCanvasBorderColor-${props.mode}`} className="text-xs font-medium">Border Color (Tailwind)</Label> <Select value={designer.tailwindCanvasBorderColor} onValueChange={(v) => designer.setTailwindCanvasBorderColor(v)} disabled={designer.isSaving || props.isLoadingContexts}> <SelectTrigger id={`tailwindCanvasBorderColor-${props.mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent>{TAILWIND_BORDER_PALETTE_OPTIONS.filter(opt => opt.value === NONE_VALUE || !opt.value.startsWith('t-') && !opt.value.startsWith('r-') && !opt.value.startsWith('b-') && !opt.value.startsWith('l-')).map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent> </Select> </div>
                    <div> <Label htmlFor={`canvasBorderStyle-${props.mode}`} className="text-xs font-medium">Border Style (CSS)</Label> <Select value={designer.canvasBorderStyle} onValueChange={(value) => designer.setCanvasBorderStyle(value)} disabled={designer.isSaving || props.isLoadingContexts}> <SelectTrigger id={`canvasBorderStyle-${props.mode}`} className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="solid">Solid</SelectItem><SelectItem value="dashed">Dashed</SelectItem> <SelectItem value="dotted">Dotted</SelectItem><SelectItem value="none">None</SelectItem> </SelectContent> </Select> </div>
                  </div>
                </div>

                {/* Layout Elements Configuration */}
                <div className="space-y-3 p-3 border rounded-md bg-muted/30 flex-grow min-h-0 flex flex-col">
                  <h4 className="text-base font-semibold mb-1">Layout Elements (Toggle to Include & Configure)</h4>
                  <ScrollArea className="pr-2"> {/* No max-h here, allow full scroll */}
                    <div className="space-y-2">
                      {designer.layoutElementGuiConfigs.map((config) => (
                        <div key={config._uiId} className="p-2.5 border rounded-md bg-card/80 hover:bg-card transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Switch id={`enable-${props.mode}-${config._uiId}`} checked={config.isEnabledOnCanvas} onCheckedChange={(checked) => designer.handleGuiConfigChange(config._uiId!, 'isEnabledOnCanvas', checked)} disabled={designer.isSaving || props.isLoadingContexts} />
                              <Label htmlFor={`enable-${props.mode}-${config._uiId}`} className="text-sm font-medium cursor-pointer"> {config.label} <span className="text-xs text-muted-foreground">({config.fieldKey})</span> </Label>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => designer.handleToggleGuiExpand(config._uiId!)} className="h-7 w-7 text-muted-foreground" disabled={!config.isEnabledOnCanvas || designer.isSaving || props.isLoadingContexts}> {config.isExpandedInGui ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} </Button>
                          </div>
                          {config.isExpandedInGui && config.isEnabledOnCanvas && (
                            <div className="mt-3 pt-3 border-t border-dashed space-y-4">
                              {/* Element Type & Icon Name */}
                              <div className="space-y-1.5">
                                <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3" /> Element Type & Icon Name</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 pl-1">
                                  <div>
                                    <Label htmlFor={`el-type-${props.mode}-${config._uiId}`} className="text-xs">Element Type</Label>
                                    <Select value={config.elementType} onValueChange={(value) => designer.handleGuiConfigChange(config._uiId!, 'elementType', value as LayoutElementGuiConfig['elementType'])} disabled={designer.isSaving || props.isLoadingContexts}>
                                      <SelectTrigger id={`el-type-${props.mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent> <SelectItem value="text">Text</SelectItem><SelectItem value="textarea">Textarea</SelectItem> <SelectItem value="image">Image</SelectItem><SelectItem value="iconValue">Icon & Value</SelectItem> <SelectItem value="iconFromData">Icon from Data</SelectItem> </SelectContent>
                                    </Select>
                                  </div>
                                  {config.elementType === 'iconValue' && (
                                    <div>
                                      <Label htmlFor={`el-icon-${props.mode}-${config._uiId}`} className="text-xs">Icon Name (Lucide)</Label>
                                      <Input id={`el-icon-${props.mode}-${config._uiId}`} value={config.iconName || ''} onChange={(e) => designer.handleGuiConfigChange(config._uiId!, 'iconName', e.target.value)} placeholder="e.g., Coins" className="h-8 text-xs mt-0.5" disabled={designer.isSaving || props.isLoadingContexts} />
                                       <Accordion type="single" collapsible className="w-full text-xs mt-1" defaultValue="">
                                        <AccordionItem value={`icon-browser-inline-${config._uiId}`} className="border-b-0">
                                          <AccordionTrigger className="py-1 text-muted-foreground hover:text-foreground text-xs hover:no-underline flex items-center gap-1 [&>svg]:size-3.5"><Copy className="mr-1 h-3 w-3" /> Browse Icons</AccordionTrigger>
                                          <AccordionContent className="p-2 border rounded bg-muted/50 max-h-[150px] overflow-y-auto">
                                            <p className="text-xs font-semibold mb-1 text-foreground">Click icon to Copy Name:</p>
                                            <ScrollArea className="max-h-[120px] bg-background/50 p-1 rounded border">
                                               <div className="grid gap-1 grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16">
                                                {commonLucideIconsForGuide.map(iconKey => (
                                                  <TooltipProvider key={`${iconKey}-${config._uiId}-tooltip`} delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => designer.handleCopyIconName(iconKey as string)} className="h-7 w-7 p-1" ><IconComponent name={iconKey as string} className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="bottom"><p>{iconKey}</p></TooltipContent></Tooltip></TooltipProvider>
                                                ))}
                                              </div>
                                            </ScrollArea>
                                          </AccordionContent>
                                        </AccordionItem>
                                      </Accordion>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Position & Sizing (CSS) */}
                              <div className="space-y-1.5">
                                <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3" /> Position & Sizing (CSS)</h5>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 pl-1">
                                  {(['styleTop', 'styleLeft', 'styleRight', 'styleBottom'] as const).map(prop => (
                                    <div key={prop}>
                                      <Label htmlFor={`el-${prop}-${props.mode}-${config._uiId}`} className="text-xs capitalize">{prop.replace('style', '').replace(/([A-Z])/g, ' $1').trim()} (CSS)</Label>
                                      <Input id={`el-${prop}-${props.mode}-${config._uiId}`} value={(config as any)[prop] || ''} onChange={(e) => designer.handleGuiConfigChange(config._uiId!, prop, e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 10px or auto" disabled={designer.isSaving || props.isLoadingContexts} />
                                    </div>
                                  ))}
                                  <div><Label htmlFor={`el-styleMaxHeight-${props.mode}-${config._uiId}`} className="text-xs">Max Height (CSS)</Label><Input id={`el-styleMaxHeight-${props.mode}-${config._uiId}`} value={config.styleMaxHeight || ''} onChange={(e) => designer.handleGuiConfigChange(config._uiId!, 'styleMaxHeight', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 80px or auto" disabled={designer.isSaving || props.isLoadingContexts} /></div>
                                  <div><Label htmlFor={`el-stylePadding-${props.mode}-${config._uiId}`} className="text-xs">Padding (CSS)</Label><Input id={`el-stylePadding-${props.mode}-${config._uiId}`} value={config.stylePadding || ''} onChange={(e) => designer.handleGuiConfigChange(config._uiId!, 'stylePadding', e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., 5px or 2px 4px" disabled={designer.isSaving || props.isLoadingContexts} /></div>
                                </div>
                              </div>
                              {/* Typography */}
                              {(config.elementType === 'text' || config.elementType === 'textarea' || config.elementType === 'iconValue') && (
                                <div className="space-y-1.5">
                                  <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3" /> Typography</h5>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 pl-1">
                                    <div><Label htmlFor={`el-twTextColor-${props.mode}-${config._uiId}`} className="text-xs">Text Color (Tailwind)</Label><Select value={config.tailwindTextColor || NONE_VALUE} onValueChange={(value) => designer.handleGuiConfigChange(config._uiId!, 'tailwindTextColor', value)} disabled={designer.isSaving || props.isLoadingContexts}><SelectTrigger id={`el-twTextColor-${props.mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_TEXT_COLORS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label htmlFor={`el-twFontSize-${props.mode}-${config._uiId}`} className="text-xs">Font Size (Tailwind)</Label><Select value={config.tailwindFontSize || NONE_VALUE} onValueChange={(value) => designer.handleGuiConfigChange(config._uiId!, 'tailwindFontSize', value)} disabled={designer.isSaving || props.isLoadingContexts}><SelectTrigger id={`el-twFontSize-${props.mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_FONT_SIZES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label htmlFor={`el-twFontWeight-${props.mode}-${config._uiId}`} className="text-xs">Font Weight (Tailwind)</Label><Select value={config.tailwindFontWeight || NONE_VALUE} onValueChange={(value) => designer.handleGuiConfigChange(config._uiId!, 'tailwindFontWeight', value)} disabled={designer.isSaving || props.isLoadingContexts}><SelectTrigger id={`el-twFontWeight-${props.mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_FONT_WEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label htmlFor={`el-twLineHeight-${props.mode}-${config._uiId}`} className="text-xs">Line Height (Tailwind)</Label><Select value={config.tailwindLineHeight || NONE_VALUE} onValueChange={(value) => designer.handleGuiConfigChange(config._uiId!, 'tailwindLineHeight', value)} disabled={designer.isSaving || props.isLoadingContexts}><SelectTrigger id={`el-twLineHeight-${props.mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_LINE_HEIGHTS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label htmlFor={`el-styleFontStyle-${props.mode}-${config._uiId}`} className="text-xs">Font Style (CSS)</Label><Select value={config.styleFontStyle || 'normal'} onValueChange={(value) => designer.handleGuiConfigChange(config._uiId!, 'styleFontStyle', value)} disabled={designer.isSaving || props.isLoadingContexts}><SelectTrigger id={`el-styleFontStyle-${props.mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="italic">Italic</SelectItem></SelectContent></Select></div>
                                    <div><Label htmlFor={`el-styleTextAlign-${props.mode}-${config._uiId}`} className="text-xs">Text Align (CSS)</Label><Select value={config.styleTextAlign || 'left'} onValueChange={(value) => designer.handleGuiConfigChange(config._uiId!, 'styleTextAlign', value)} disabled={designer.isSaving || props.isLoadingContexts}><SelectTrigger id={`el-styleTextAlign-${props.mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem><SelectItem value="justify">Justify</SelectItem></SelectContent></Select></div>
                                  </div>
                                </div>
                              )}
                              {/* Overflow & Display (Text - Tailwind) */}
                              {(config.elementType === 'text' || config.elementType === 'textarea') && (
                                <div className="space-y-1.5">
                                  <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3" /> Overflow & Display (Text - Tailwind)</h5>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 pl-1">
                                    <div><Label htmlFor={`el-twOverflow-${props.mode}-${config._uiId}`} className="text-xs">Overflow</Label><Select value={config.tailwindOverflow || NONE_VALUE} onValueChange={(value) => designer.handleGuiConfigChange(config._uiId!, 'tailwindOverflow', value)} disabled={designer.isSaving || props.isLoadingContexts}><SelectTrigger id={`el-twOverflow-${props.mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label htmlFor={`el-twTextOverflow-${props.mode}-${config._uiId}`} className="text-xs">Text Overflow</Label><Select value={config.tailwindTextOverflow || NONE_VALUE} onValueChange={(value) => designer.handleGuiConfigChange(config._uiId!, 'tailwindTextOverflow', value)} disabled={designer.isSaving || props.isLoadingContexts}><SelectTrigger id={`el-twTextOverflow-${props.mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_TEXT_OVERFLOW.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                  </div>
                                </div>
                              )}
                              {/* Borders */}
                              <div className="space-y-1.5">
                                <h5 className="text-xs text-muted-foreground font-semibold flex items-center gap-1"><Settings className="mr-1 h-3 w-3" /> Borders</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 pl-1">
                                  <div><Label htmlFor={`el-twBorderRadius-${props.mode}-${config._uiId}`} className="text-xs">Border Radius (Tailwind)</Label><Select value={config.tailwindBorderRadius || NONE_VALUE} onValueChange={(value) => designer.handleGuiConfigChange(config._uiId!, 'tailwindBorderRadius', value)} disabled={designer.isSaving || props.isLoadingContexts}><SelectTrigger id={`el-twBorderRadius-${props.mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger><SelectContent>{TAILWIND_BORDER_RADIUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 pl-1 mt-2">
                                  {(['Top', 'Right', 'Bottom', 'Left'] as const).map(side => {
                                    const widthPropKey = `tailwindBorder${side}W` as keyof LayoutElementGuiConfig;
                                    const colorPropKey = `tailwindBorder${side}Color` as keyof LayoutElementGuiConfig;
                                    return (
                                      <React.Fragment key={side}>
                                        <div> <Label htmlFor={`el-twBorder${side}W-${props.mode}-${config._uiId}`} className="text-xs">Border {side} W</Label> <Select value={(config as any)[widthPropKey] || NONE_VALUE} onValueChange={(value) => designer.handleGuiConfigChange(config._uiId!, widthPropKey, value)} disabled={designer.isSaving || props.isLoadingContexts}> <SelectTrigger id={`el-twBorder${side}W-${props.mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger> <SelectContent>{BORDER_SIDE_WIDTH_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent> </Select> </div>
                                        <div> <Label htmlFor={`el-twBorder${side}Color-${props.mode}-${config._uiId}`} className="text-xs">{side} Color</Label> <Select value={(config as any)[colorPropKey] || NONE_VALUE} onValueChange={(value) => designer.handleGuiConfigChange(config._uiId!, colorPropKey, value)} disabled={designer.isSaving || props.isLoadingContexts}> <SelectTrigger id={`el-twBorder${side}Color-${props.mode}-${config._uiId}`} className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger> <SelectContent>{TAILWIND_BORDER_PALETTE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent> </Select> </div>
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {designer.layoutElementGuiConfigs.length === 0 && designer.fields.length > 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">No data fields are currently enabled for the layout. Toggle a field above to configure it.</p>
                      )}
                      {designer.fields.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">Add data fields to the template first to configure their layout.</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
            {designer.activeEditorView === 'json' && (
              <div className="mt-4 flex-grow flex flex-col">
                <div>
                  <Label htmlFor={`layoutDefinition-${props.mode}`} className="text-sm font-medium">Layout Definition JSON (Editable)</Label>
                  <Textarea
                    id={`layoutDefinition-${props.mode}`}
                    value={designer.layoutDefinition}
                    onChange={(e) => designer.setLayoutDefinition(e.target.value)}
                    onBlur={designer.validateAndFormatLayoutJsonOnBlur}
                    placeholder='Click "Generate/Update JSON from Builder" (in page actions menu) to populate, or paste/edit your JSON here.'
                    rows={15}
                    className="font-mono text-xs flex-grow min-h-[200px] max-h-[350px] bg-muted/20 mt-1"
                    disabled={designer.isSaving || props.isLoadingContexts}
                  />
                </div>
                {designer.layoutJsonError && (<Alert variant="destructive" className="mt-2"><AlertTriangle className="h-4 w-4 !text-destructive-foreground" /><AlertTitle>JSON Error</AlertTitle><AlertDescription className="text-xs">{designer.layoutJsonError}</AlertDescription></Alert>)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Live Preview */}
        <Card className="md:w-[35%] sticky top-20 self-start shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center">
                <Eye className="mr-2 h-5 w-5" /> Live Layout Preview
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Label htmlFor={`show-pixel-grid-${props.mode}`} className="text-xs text-muted-foreground">Pixel Grid</Label>
                <Switch id={`show-pixel-grid-${props.mode}`} checked={designer.showPixelGrid} onCheckedChange={designer.setShowPixelGrid} aria-label="Show pixel grid" disabled={designer.isSaving || props.isLoadingContexts} />
              </div>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              This preview updates as you modify the {designer.activeEditorView === 'gui' ? 'GUI builder settings' : 'JSON editor content'}. Uses sample data based on your field definitions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-4 min-h-[450px] bg-muted/30 rounded-b-md">
            {designer.sampleCardForPreview && designer.templateForPreview ? (
              <DynamicCardRenderer
                card={designer.sampleCardForPreview}
                template={designer.templateForPreview}
                showPixelGrid={designer.showPixelGrid}
              />
            ) : (
              <p className="text-muted-foreground">Define fields to see a preview.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

