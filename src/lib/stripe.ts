/** Stripe.js is loaded from Stripe; PAN/CVC are entered only in its isolated iframe. */
export interface SecurePaymentElement {
  mount(node: HTMLElement): void;
  destroy(): void;
  on(event: 'ready', callback: () => void): void;
  on(event: 'carddetailschange', callback: (event: { loading: boolean; details?: { brands: string[] | null; funding: string | null } }) => void): void;
  on(event: 'change', callback: (event: { empty: boolean; complete: boolean; value: { type: string } }) => void): void;
  on(event: 'loaderror', callback: (event: { error?: { message?: string } }) => void): void;
}
export interface SecureElements {
  create(type: 'payment', options: { layout: string; defaultValues?: object }): SecurePaymentElement;
  update(options: { appearance?: object; locale?: string }): void;
}
export interface StripeClient {
  elements(options: { clientSecret: string; appearance: object; locale: string }): SecureElements;
  confirmPayment(options: { elements: SecureElements; confirmParams: { return_url: string; payment_method_data: { billing_details: { name: string; email: string } } }; redirect: 'if_required' }): Promise<{ error?: { message?: string }; paymentIntent?: { status: string } }>;
}
declare global { interface Window { Stripe?: (key: string) => StripeClient; } }
let pending: Promise<StripeClient> | null = null;
export function loadStripeClient(): Promise<StripeClient> {
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!/^pk_(test|live)_/.test(key || '')) { reject(new Error('Os pagamentos estarão disponíveis em breve.')); return; }
    if (window.Stripe) { resolve(window.Stripe(key)); return; }
    const script = document.createElement('script'); script.src = 'https://js.stripe.com/v3/'; script.async = true;
    const timer = window.setTimeout(() => { script.remove(); pending = null; reject(new Error('Não foi possível carregar o pagamento seguro.')); }, 20000);
    script.onload = () => { clearTimeout(timer); if (window.Stripe) resolve(window.Stripe(key)); else { pending = null; reject(new Error('Não foi possível carregar o pagamento seguro.')); } };
    script.onerror = () => { clearTimeout(timer); pending = null; script.remove(); reject(new Error('Não foi possível carregar o pagamento seguro.')); };
    document.head.appendChild(script);
  });
  return pending;
}
export function paymentAppearance(dark: boolean) {
  return { theme: dark ? 'night' : 'stripe', variables: { colorPrimary: dark ? '#ffae79' : '#b84613', colorBackground: dark ? '#142033' : '#ffffff', colorText: dark ? '#edf2fa' : '#172840', colorDanger: dark ? '#ffa6a6' : '#b42318', fontFamily: 'Inter, system-ui, sans-serif', borderRadius: '12px', spacingUnit: '4px' }, rules: { '.Input': { padding: '14px', boxShadow: 'none' }, '.Label': { fontWeight: '500', marginBottom: '8px' } } };
}
