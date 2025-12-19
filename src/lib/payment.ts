import Razorpay from 'razorpay';

const razorpay = new Razorpay({
    key_id: import.meta.env.VITE_RAZORPAY_KEY_ID,
    key_secret: import.meta.env.RAZORPAY_KEY_SECRET,
});

export interface PaymentOrder {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
}

export interface CreateOrderParams {
    amount: number;
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
}

export const createPaymentOrder = async (params: CreateOrderParams): Promise<PaymentOrder> => {
    try {
        const order = await razorpay.orders.create({
            amount: params.amount * 100, // Razorpay expects amount in paise
            currency: params.currency || 'INR',
            receipt: params.receipt,
            notes: params.notes || {},
        });

        return {
            id: order.id,
            amount: order.amount / 100,
            currency: order.currency,
            receipt: order.receipt,
            status: order.status,
        };
    } catch (error) {
        console.error('Error creating payment order:', error);
        throw new Error('Failed to create payment order');
    }
};

export const verifyPayment = async (
    orderId: string,
    paymentId: string,
    signature: string
): Promise<boolean> => {
    try {
        const sign = orderId + '|' + paymentId;
        const expectedSign = crypto
            .createHmac('sha256', import.meta.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        return expectedSign === signature;
    } catch (error) {
        console.error('Error verifying payment:', error);
        return false;
    }
};

export const getPaymentStatus = async (paymentId: string) => {
    try {
        const payment = await razorpay.payments.fetch(paymentId);
        return {
            id: payment.id,
            status: payment.status,
            amount: payment.amount / 100,
            currency: payment.currency,
            method: payment.method,
            orderId: payment.order_id,
            captured: payment.captured,
        };
    } catch (error) {
        console.error('Error fetching payment status:', error);
        throw new Error('Failed to fetch payment status');
    }
};

// Client-side utilities for React component
export const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
        color?: string;
    };
    handler: (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
    }) => void;
}

export const initializeRazorpay = (options: RazorpayOptions) => {
    if (typeof window.Razorpay !== 'undefined') {
        const rzp = new window.Razorpay(options);
        return rzp;
    }
    throw new Error('Razorpay SDK not loaded');
};
