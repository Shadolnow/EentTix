import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
    en: {
        translation: {
            // Navigation
            "nav.home": "Home",
            "nav.events": "Events",
            "nav.myTickets": "My Tickets",
            "nav.login": "Login",
            "nav.logout": "Logout",

            // Common
            "common.loading": "Loading...",
            "common.error": "Error",
            "common.success": "Success",
            "common.cancel": "Cancel",
            "common.confirm": "Confirm",
            "common.save": "Save",
            "common.delete": "Delete",
            "common.edit": "Edit",
            "common.share": "Share",
            "common.download": "Download",

            // Event Page
            "event.title": "Event Details",
            "event.date": "Date",
            "event.time": "Time",
            "event.venue": "Venue",
            "event.description": "Description",
            "event.claimTicket": "Claim Ticket",
            "event.bulkTickets": "Bulk Tickets",
            "event.freeEvent": "Free Event",
            "event.price": "Price",

            // Ticket
            "ticket.code": "Ticket Code",
            "ticket.attendee": "Attendee",
            "ticket.issued": "Issued",
            "ticket.generalAdmission": "Entry Pass",
            "ticket.download": "Download Ticket",
            "ticket.share": "Share Ticket",
            "ticket.print": "Print Ticket",

            // Forms
            "form.name": "Full Name",
            "form.email": "Email Address",
            "form.phone": "Phone Number",
            "form.required": "This field is required",
            "form.submit": "Submit",

            // Comments
            "comments.title": "Comments",
            "comments.placeholder": "Share your thoughts about this event...",
            "comments.post": "Post Comment",
            "comments.noComments": "No comments yet. Be the first to comment!",

            // Reactions
            "reactions.like": "Like",
            "reactions.love": "Love",
            "reactions.fire": "Fire",
            "reactions.party": "Party",

            // Social
            "social.shareEvent": "Share Event",
            "social.facebook": "Facebook",
            "social.twitter": "Twitter",
            "social.linkedin": "LinkedIn",
            "social.instagram": "Instagram",

            // Messages
            "message.ticketClaimed": "Ticket claimed successfully!",
            "message.loginRequired": "Please sign in to continue",
            "message.paymentRequired": "Payment Required",
            "message.linkCopied": "Link copied to clipboard!"
        }
    },
    hi: {
        translation: {
            // Navigation
            "nav.home": "होम",
            "nav.events": "इवेंट्स",
            "nav.myTickets": "मेरे टिकट",
            "nav.login": "लॉगिन",
            "nav.logout": "लॉगआउट",

            // Common
            "common.loading": "लोड हो रहा है...",
            "common.error": "त्रुटि",
            "common.success": "सफलता",
            "common.cancel": "रद्द करें",
            "common.confirm": "पुष्टि करें",
            "common.save": "सहेजें",
            "common.delete": "हटाएं",
            "common.edit": "संपादित करें",
            "common.share": "साझा करें",
            "common.download": "डाउनलोड",

            // Event Page
            "event.title": "इवेंट विवरण",
            "event.date": "तारीख",
            "event.time": "समय",
            "event.venue": "स्थान",
            "event.description": "विवरण",
            "event.claimTicket": "टिकट प्राप्त करें",
            "event.bulkTickets": "बल्क टिकट",
            "event.freeEvent": "मुफ़्त इवेंट",
            "event.price": "मूल्य",

            // Ticket
            "ticket.code": "टिकट कोड",
            "ticket.attendee": "उपस्थित",
            "ticket.issued": "जारी किया",
            "ticket.generalAdmission": "प्रवेश पास",
            "ticket.download": "टिकट डाउनलोड करें",
            "ticket.share": "टिकट साझा करें",
            "ticket.print": "टिकट प्रिंट करें",

            // Forms
            "form.name": "पूरा नाम",
            "form.email": "ईमेल पता",
            "form.phone": "फोन नंबर",
            "form.required": "यह फ़ील्ड आवश्यक है",
            "form.submit": "जमा करें",

            // Comments
            "comments.title": "टिप्पणियाँ",
            "comments.placeholder": "इस इवेंट के बारे में अपने विचार साझा करें...",
            "comments.post": "टिप्पणी पोस्ट करें",
            "comments.noComments": "अभी तक कोई टिप्पणी नहीं। पहले टिप्पणी करें!",

            // Reactions
            "reactions.like": "पसंद",
            "reactions.love": "प्यार",
            "reactions.fire": "आग",
            "reactions.party": "पार्टी",

            // Social
            "social.shareEvent": "इवेंट साझा करें",
            "social.facebook": "फेसबुक",
            "social.twitter": "ट्विटर",
            "social.linkedin": "लिंक्डइन",
            "social.instagram": "इंस्टाग्राम",

            // Messages
            "message.ticketClaimed": "टिकट सफलतापूर्वक प्राप्त हुआ!",
            "message.loginRequired": "जारी रखने के लिए कृपया साइन इन करें",
            "message.paymentRequired": "भुगतान आवश्यक",
            "message.linkCopied": "लिंक क्लिपबोर्ड पर कॉपी किया गया!"
        }
    }
};

i18n
    .use(LanguageDetector) // Detect user language
    .use(initReactI18next) // Pass i18n instance to react-i18next
    .init({
        resources,
        fallbackLng: 'en', // Default language
        debug: false,

        interpolation: {
            escapeValue: false // React already escapes values
        },

        detection: {
            // Order of language detection
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        }
    });

export default i18n;
