import React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, Star } from 'lucide-react';
import { ICONS } from '@/lib/icons';

interface IconPickerProps {
    value?: string;
    onChange: (value: string) => void;
    className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');

    const SelectedIcon = value && ICONS[value] ? ICONS[value] : null;

    const filteredIcons = React.useMemo(() => {
        return Object.keys(ICONS).filter(name =>
            name.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className="flex-1 relative">
                <Input
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Icon name or 1-4 chars"
                    className="font-mono text-xs pr-8"
                />
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" type="button">
                        {SelectedIcon ? <SelectedIcon className="h-4 w-4" /> : <Star className="h-4 w-4 text-muted-foreground/50" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="end">
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search icons..."
                                className="h-8 pl-8 text-xs"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <ScrollArea className="h-64 p-2">
                        <div className="grid grid-cols-5 gap-2">
                            {filteredIcons.map(name => {
                                const Icon = ICONS[name];
                                return (
                                    <Button
                                        key={name}
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "h-9 w-9 rounded-md shrink-0 hover:bg-muted/50",
                                            value === name && "bg-primary/10 text-primary border-primary/20 border"
                                        )}
                                        onClick={() => {
                                            onChange(name);
                                            setOpen(false);
                                        }}
                                        title={name}
                                        type="button"
                                    >
                                        <Icon className="h-4 w-4" />
                                    </Button>
                                )
                            })}
                            {filteredIcons.length === 0 && (
                                <div className="col-span-5 text-center text-xs text-muted-foreground py-4">
                                    No icons found
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        </div>
    );
}
