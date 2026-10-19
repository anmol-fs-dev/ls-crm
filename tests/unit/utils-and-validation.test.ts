import { describe, it, expect } from 'vitest';
import { calculateFractionalPosition, sanitizeCsvCell } from '@/lib/utils';
import { verticalSchema, leadSchema, loginSchema } from '@/lib/validations/crm.schemas';

describe('Fractional Indexing Algorithm', () => {
  it('returns default step (1000) when column is empty', () => {
    expect(calculateFractionalPosition(null, null)).toBe(1000);
    expect(calculateFractionalPosition(undefined, undefined)).toBe(1000);
  });

  it('inserts at the top of a column (half of first item position)', () => {
    expect(calculateFractionalPosition(null, 1000)).toBe(500);
    expect(calculateFractionalPosition(null, 500)).toBe(250);
  });

  it('inserts at the bottom of a column (adds 1000 to last item)', () => {
    expect(calculateFractionalPosition(2000, null)).toBe(3000);
  });

  it('inserts between two adjacent cards', () => {
    expect(calculateFractionalPosition(1000, 2000)).toBe(1500);
    expect(calculateFractionalPosition(1000, 1500)).toBe(1250);
  });
});

describe('CSV Formula Injection Sanitizer', () => {
  it('escapes dangerous spreadsheet formula prefixes (=, +, -, @, \\t)', () => {
    expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
    expect(sanitizeCsvCell('+cmd|/C')).toBe("'+cmd|/C");
    expect(sanitizeCsvCell('-2*5')).toBe("'-2*5");
    expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
    expect(sanitizeCsvCell('\tmalicious')).toBe("'\tmalicious");
  });

  it('preserves legitimate text and numeric values', () => {
    expect(sanitizeCsvCell('Acme Corporation')).toBe('Acme Corporation');
    expect(sanitizeCsvCell('john.doe@company.com')).toBe('john.doe@company.com');
    expect(sanitizeCsvCell(45000)).toBe('45000');
  });

  it('handles null and undefined gracefully', () => {
    expect(sanitizeCsvCell(null)).toBe('');
    expect(sanitizeCsvCell(undefined)).toBe('');
  });
});

describe('Zod Validation Schemas', () => {
  it('validates a correct vertical definition', () => {
    const validVertical = {
      name: 'Executive Coaching',
      slug: 'executive-coaching',
      color: '#6366f1',
      icon: 'briefcase',
      description: 'C-suite mentorship',
      status: 'active' as const,
    };
    expect(verticalSchema.safeParse(validVertical).success).toBe(true);
  });

  it('rejects an invalid vertical slug with uppercase or spaces', () => {
    const invalidVertical = {
      name: 'Executive Coaching',
      slug: 'Executive Coaching!',
      color: '#6366f1',
      icon: 'briefcase',
    };
    expect(verticalSchema.safeParse(invalidVertical).success).toBe(false);
  });

  it('rejects negative estimated values in leads', () => {
    const invalidLead = {
      vertical_id: 'vert-1',
      stage_id: 'stg-1',
      name: 'Bad Lead',
      estimated_value: -500,
    };
    expect(leadSchema.safeParse(invalidLead).success).toBe(false);
  });

  it('validates corporate email format for login', () => {
    expect(loginSchema.safeParse({ email: 'user@company.com', password: 'password123' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'password123' }).success).toBe(false);
  });
});

describe('Duplicate Detection & Normalization Logic', () => {
  it('normalizes phone strings by stripping formatting characters', () => {
    const raw = '+1 (555) 234-5678';
    const digitsOnly = raw.replace(/\D/g, '');
    expect(digitsOnly).toBe('15552345678');
  });

  it('matches case-insensitive emails', () => {
    const emailA = 'Procurement@AcmeHealth.ORG ';
    const emailB = 'procurement@acmehealth.org';
    expect(emailA.trim().toLowerCase()).toBe(emailB);
  });
});
