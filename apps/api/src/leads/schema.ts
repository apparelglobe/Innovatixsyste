/**
 * Strict request contract for POST /v1/leads. Zod enforces types, presence, and
 * length ceilings; sanitization (defense-in-depth) happens after parse. Unknown
 * keys are stripped. Attribution/technical fields are optional.
 */
import { z } from 'zod';

export const LeadFormEnum = z.enum(['CONTACT', 'BOOK', 'SERVICE_CTA', 'HOMEPAGE_CTA', 'LANDING_PAGE']);

export const leadRequestSchema = z
  .object({
    // Identity
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().max(120).optional().default(''),
    businessEmail: z.string().trim().toLowerCase().email().max(320),
    phone: z.string().trim().max(40).optional(),
    company: z.string().trim().max(200).optional(),
    jobTitle: z.string().trim().max(160).optional(),

    // Qualification
    form: LeadFormEnum.default('CONTACT'),
    serviceInterest: z.string().trim().max(160).optional(),
    projectDescription: z.string().trim().max(5000).optional(),
    budgetRange: z.string().trim().max(80).optional(),
    desiredStartWindow: z.string().trim().max(80).optional(),

    // Consent (when required by the form/jurisdiction)
    consentGranted: z.boolean().optional(),
    consentPolicyVersion: z.string().trim().max(40).optional(),

    // Idempotency (client-generated; browser retries/double-clicks reuse it)
    idempotencyKey: z.string().trim().min(8).max(100),

    // Anti-spam signals
    honeypot: z.string().max(200).optional(),
    submitElapsedMs: z.number().int().nonnegative().max(1000 * 60 * 60).optional(),

    // Attribution (all optional; never trusted for auth)
    attribution: z
      .object({
        landingPage: z.string().trim().max(2048).optional(),
        referrerUrl: z.string().trim().max(2048).optional(),
        utmSource: z.string().trim().max(200).optional(),
        utmMedium: z.string().trim().max(200).optional(),
        utmCampaign: z.string().trim().max(200).optional(),
        utmTerm: z.string().trim().max(200).optional(),
        utmContent: z.string().trim().max(200).optional(),
        gclid: z.string().trim().max(200).optional(),
      })
      .strip()
      .optional()
      .default({}),
  })
  .strip();

export type LeadRequest = z.infer<typeof leadRequestSchema>;
