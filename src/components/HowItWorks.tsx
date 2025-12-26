import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    Smartphone,
    Mail,
    CreditCard,
    Ticket,
    QrCode,
    Shield,
    ArrowRight,
    Clock,
    Users,
    Download
} from "lucide-react";

interface HowItWorksProps {
    isFreeEvent: boolean;
}

export const HowItWorks = ({ isFreeEvent }: HowItWorksProps) => {
    const steps = isFreeEvent ? [
        {
            number: 1,
            icon: Smartphone,
            title: "Fill Your Details",
            description: "Enter your name, email, phone number, and create a secure PIN",
            details: [
                "Your email receives the ticket instantly",
                "Phone number for WhatsApp updates",
                "PIN protects your ticket (remember it!)"
            ],
            time: "30 seconds"
        },
        {
            number: 2,
            icon: CheckCircle2,
            title: "Get Instant Ticket",
            description: "Receive your premium ticket immediately via email",
            details: [
                "Ticket sent to your email instantly",
                "Download or save on your phone",
                "View anytime in 'My Tickets' section"
            ],
            time: "Instant"
        },
        {
            number: 3,
            icon: QrCode,
            title: "Show QR at Entry",
            description: "Present your ticket QR code at the event entrance",
            details: [
                "Open ticket on your phone",
                "Show QR code to staff",
                "Instant entry verification",
                "Enjoy the event! 🎉"
            ],
            time: "5 seconds"
        }
    ] : [
        {
            number: 1,
            icon: Smartphone,
            title: "Fill Your Details",
            description: "Enter your information and create a secure PIN",
            details: [
                "Full name for ticket personalization",
                "Email for ticket delivery",
                "Phone number for updates",
                "4-6 digit PIN (you choose it!)"
            ],
            time: "30 seconds"
        },
        {
            number: 2,
            icon: CreditCard,
            title: "Complete Payment",
            description: "Secure UPI payment via QR code or UPI ID",
            details: [
                "Click 'Proceed to Payment'",
                "Scan QR with any UPI app (GPay, PhonePe, Paytm)",
                "Or copy UPI ID for manual payment",
                "Paste your UPI transaction ID",
                "Click 'I've Paid' to generate ticket"
            ],
            time: "1-2 minutes"
        },
        {
            number: 3,
            icon: Mail,
            title: "Receive Confirmation",
            description: "Get your ticket via email after verification",
            details: [
                "Payment verified by organizer",
                "Ticket sent to your email",
                "Track status in 'My Tickets'",
                "Usually verified within 1-2 hours"
            ],
            time: "1-2 hours"
        },
        {
            number: 4,
            icon: QrCode,
            title: "Entry at Event",
            description: "Show your ticket QR code for instant entry",
            details: [
                "Open ticket on your phone",
                "Present QR code to staff",
                "PIN verified for security",
                "Enjoy the event! 🎉"
            ],
            time: "5 seconds"
        }
    ];

    return (
        <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-2 border-primary/20">
            <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Ticket className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    How It Works
                </CardTitle>
                <CardDescription className="text-base mt-2">
                    {isFreeEvent
                        ? "Get your free ticket in 3 simple steps"
                        : "Book your ticket in 4 easy steps - secure & fast"}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Visual Timeline */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <div key={step.number} className="relative">
                                {/* Connecting Line */}
                                {index < steps.length - 1 && (
                                    <div className="hidden lg:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-accent/50">
                                        <ArrowRight className="absolute -right-2 -top-2 w-5 h-5 text-accent" />
                                    </div>
                                )}

                                <div className="relative z-10 bg-card border-2 border-primary/30 rounded-xl p-4 hover:shadow-lg hover:border-primary/50 transition-all duration-300 h-full">
                                    {/* Step Number Badge */}
                                    <div className="absolute -top-3 -right-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                                            {step.number}
                                        </div>
                                    </div>

                                    {/* Icon */}
                                    <div className="mb-3 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <Icon className="w-6 h-6 text-primary" />
                                    </div>

                                    {/* Title & Time */}
                                    <div className="mb-2">
                                        <h3 className="font-bold text-sm mb-1">{step.title}</h3>
                                        <Badge variant="outline" className="text-[10px]">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {step.time}
                                        </Badge>
                                    </div>

                                    {/* Description */}
                                    <p className="text-xs text-muted-foreground mb-3">
                                        {step.description}
                                    </p>

                                    {/* Details List */}
                                    <ul className="space-y-1.5">
                                        {step.details.map((detail, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-xs">
                                                <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span className="text-muted-foreground">{detail}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* FAQs */}
                <div className="mt-8">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Frequently Asked Questions
                    </h3>

                    <Accordion type="single" collapsible className="space-y-2">
                        <AccordionItem value="retrieve" className="border rounded-lg px-4">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                                🔑 How do I retrieve my ticket later?
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground space-y-2">
                                <p>You can access your ticket anytime using our "My Tickets" feature:</p>
                                <ol className="list-decimal list-inside space-y-1 ml-2">
                                    <li>Go to "My Tickets" page</li>
                                    <li>Enter your <strong>Email</strong>, <strong>Phone Number</strong>, and <strong>Security PIN</strong></li>
                                    <li>All three must match exactly what you entered during booking</li>
                                    <li>Your ticket will be displayed instantly</li>
                                </ol>
                                <p className="text-yellow-600 dark:text-yellow-400 mt-2">
                                    ⚠️ <strong>Remember your PIN!</strong> Write it down somewhere safe.
                                </p>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="payment" className="border rounded-lg px-4">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                                💳 Is my payment secure?
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground">
                                <p className="mb-2">Yes! Payments are processed via UPI, India's most secure payment system:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>Direct bank-to-bank transfer</li>
                                    <li>No card details stored</li>
                                    <li>Encrypted transactions</li>
                                    <li>Instant confirmation</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="cancel" className="border rounded-lg px-4">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                                ❌ Can I cancel or transfer my ticket?
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground">
                                <p className="mb-2">Contact the event organizer for cancellation or transfer requests:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>Call: <span className="font-semibold text-primary">7507066880</span></li>
                                    <li>Include your ticket details and reason</li>
                                    <li>Refunds subject to organizer's policy</li>
                                    <li>Process within 3-5 business days if approved</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="entry" className="border rounded-lg px-4">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                                🎫 What do I need at the event entrance?
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground">
                                <p className="mb-2">For smooth entry, have these ready:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li><strong>Your ticket QR code</strong> (on phone or printed)</li>
                                    <li><strong>Valid photo ID</strong> (for paid events)</li>
                                    <li><strong>Security PIN</strong> (staff may verify)</li>
                                    <li>Phone with ticket email open as backup</li>
                                </ul>
                                <p className="text-green-600 dark:text-green-400 mt-2">
                                    ✅ <strong>Pro tip:</strong> Save ticket as phone wallpaper or screenshot for quick access!
                                </p>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="help" className="border rounded-lg px-4">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                                🆘 What if I face issues?
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground">
                                <p className="mb-2">We're here to help 24/7:</p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded">
                                        <Smartphone className="w-4 h-4 text-primary" />
                                        <span>Call/WhatsApp: <strong className="text-primary">7507066880</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded">
                                        <Mail className="w-4 h-4 text-primary" />
                                        <span>Email support available</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded">
                                        <Users className="w-4 h-4 text-primary" />
                                        <span>On-site support available at event</span>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                {/* Trust Badges */}
                <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
                    <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-green-600" />
                            <span className="font-semibold">Secure Payments</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Download className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold">Instant Tickets</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-purple-600" />
                            <span className="font-semibold">Easy Entry</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-orange-600" />
                            <span className="font-semibold">24/7 Support</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
