/**
 * One delegated pointer handler for all button-like controls. Lazy React screens
 * work automatically, with no new overlays, wrappers or event listeners per button.
 * This only sets CSS variables; it never changes navigation or click handlers.
 */
const selector = [
  '#root button',
  '#root a.action-primary',
  '#root a.btn',
  '#root a.btn-primary',
  '#root a.btn-dark',
  '#root a.btn-ghost',
  '#root a.home-button',
  '#root a.home-room-image',
  '#root a.home-photo-caption-link',
  '#root a.mva-home-white-cta',
  '#root a.fiscal-white-cta',
  '#root a[class~="home-card-link"]'
].join(', ');

export function installGlobalGlassMotion(): void {
  if (typeof document === 'undefined') return;
  const supportsPointer = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  let active: HTMLElement | null = null;

  const clear = () => {
    if (!active) return;
    active.style.removeProperty('--mva-glass-x');
    active.style.removeProperty('--mva-glass-y');
    active = null;
  };

  const track = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !supportsPointer.matches ||
        document.documentElement.dataset.a11yMotion === 'true') {
      clear();
      return;
    }

    const element = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
    if (!element || element.closest('.mva-accessibility, .mva-contact-glassy') ||
        element.matches(':disabled, [aria-disabled="true"], [data-mva-glass="off"]')) {
      clear();
      return;
    }

    if (active !== element) {
      clear();
      active = element;
    }
    const rect = element.getBoundingClientRect();
    const x = Math.max(-3, Math.min(3, (rect.left + rect.width / 2 - event.clientX) * 0.035));
    const y = Math.max(-2, Math.min(2, (rect.top + rect.height / 2 - event.clientY) * 0.035));
    element.style.setProperty('--mva-glass-x', x.toFixed(2) + 'px');
    element.style.setProperty('--mva-glass-y', y.toFixed(2) + 'px');
  };

  // Keep a single passive delegated listener; no React rerender on pointer move.
  document.addEventListener('pointermove', track, { passive: true });
  document.addEventListener('pointercancel', clear, { passive: true });
  document.addEventListener('pointerout', event => {
    if (event.relatedTarget === null) clear();
  }, { passive: true });
  window.addEventListener('blur', clear);
  supportsPointer.addEventListener('change', clear);
}
