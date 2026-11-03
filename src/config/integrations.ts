/** Feature toggle for reservation notifications and Google Calendar.
 * OFF by request while the marketplace is being prepared for commercial launch.
 * The Supabase booking_delivery_config.enabled flag MUST also be enabled and
 * the recurring worker restored before enabling in the web app.
 */
export const BOOKING_EXTERNAL_INTEGRATIONS_ENABLED = false;
