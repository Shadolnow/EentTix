import { HelpCircle, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface HelpSection {
    heading: string;
    content: string;
    image?: string;
    steps?: string[];
}

interface HelpDialogProps {
    title: string;
    description?: string;
    sections: HelpSection[];
    variant?: 'button' | 'icon-only' | 'inline';
    buttonText?: string;
    className?: string;
}

export const HelpDialog = ({
    title,
    description,
    sections,
    variant = 'icon-only',
    buttonText = 'Help',
    className = ''
}: HelpDialogProps) => {
    const triggerButton = variant === 'button' ? (
        <Button variant="outline" className={`gap-2 ${className}`}>
            <HelpCircle className="w-4 h-4" />
            {buttonText}
        </Button>
    ) : variant === 'inline' ? (
        <button className={`inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold text-sm ${className}`}>
            <HelpCircle className="w-4 h-4" />
            {buttonText}
        </button>
    ) : (
        <Button
            variant="ghost"
            size="icon"
            className={`rounded-full h-10 w-10 bg-primary/10 hover:bg-primary/20 ${className}`}
        >
            <HelpCircle className="w-5 h-5 text-primary" />
        </Button>
    );

    return (
        <Dialog>
            <DialogTrigger asChild>
                {triggerButton}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <HelpCircle className="w-6 h-6 text-primary" />
                        {title}
                    </DialogTitle>
                    {description && (
                        <DialogDescription className="text-base">
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-6">
                        {sections.map((section, index) => (
                            <div key={index} className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-primary/20 text-primary font-bold">
                                        {index + 1}
                                    </Badge>
                                    <h3 className="font-bold text-lg">{section.heading}</h3>
                                </div>

                                <div className="pl-8 space-y-3">
                                    {section.content && (
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {section.content}
                                        </p>
                                    )}

                                    {section.steps && section.steps.length > 0 && (
                                        <ul className="space-y-2">
                                            {section.steps.map((step, stepIndex) => (
                                                <li key={stepIndex} className="flex items-start gap-2 text-sm">
                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                                                        {stepIndex + 1}
                                                    </span>
                                                    <span>{step}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {section.image && (
                                        <img
                                            src={section.image}
                                            alt={section.heading}
                                            className="rounded-lg border border-border w-full"
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="bg-muted/50 rounded-lg p-4 mt-4">
                    <p className="text-xs text-muted-foreground text-center">
                        💡 <strong>Still need help?</strong> Contact support at{' '}
                        <a href="tel:7507066880" className="text-primary hover:underline font-semibold">
                            7507066880
                        </a>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};
