import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, getRateLimitHeaders, resetRateLimiterStore } from '@/lib/rate-limiter';
import { sanitizeCsvCell } from '@/lib/utils';
import { leadSchema, verticalSchema } from '@/lib/validations/crm.schemas';

describe('Phase 7: Enterprise Security & Rate Limiting', () => {
  beforeEach(() => {
    resetRateLimiterStore();
  });

  describe('1. Sliding Window Rate Limiter', () => {
    it('allows requests within the defined threshold', () => {
      const res1 = checkRateLimit('test_ip_1', 5, 1000);
      expect(res1.success).toBe(true);
      expect(res1.limit).toBe(5);
      expect(res1.remaining).toBe(4);

      const res2 = checkRateLimit('test_ip_1', 5, 1000);
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(3);
    });

    it('blocks burst requests once the limit is reached', () => {
      const ip = 'test_ip_burst';
      const limit = 3;

      for (let i = 0; i < limit; i++) {
        const res = checkRateLimit(ip, limit, 1000);
        expect(res.success).toBe(true);
      }

      // 4th request must be blocked
      const blocked = checkRateLimit(ip, limit, 1000);
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetMs).toBeGreaterThan(0);
    });

    it('generates compliant HTTP rate limit and Retry-After headers', () => {
      const ip = 'test_ip_headers';
      const res = checkRateLimit(ip, 2, 5000);
      const headers = getRateLimitHeaders(res);

      expect(headers['X-RateLimit-Limit']).toBe('2');
      expect(headers['X-RateLimit-Remaining']).toBe('1');
      expect(headers['X-RateLimit-Reset']).toBeDefined();

      // Blocked request includes Retry-After
      checkRateLimit(ip, 2, 5000); // 2nd request
      const blockedRes = checkRateLimit(ip, 2, 5000); // 3rd request blocked
      const blockedHeaders = getRateLimitHeaders(blockedRes);

      expect(blockedRes.success).toBe(false);
      expect(blockedHeaders['Retry-After']).toBeDefined();
      expect(Number(blockedHeaders['Retry-After'])).toBeGreaterThanOrEqual(1);
    });

    it('isolates limits across different IP addresses', () => {
      const ipA = '192.168.1.1';
      const ipB = '192.168.1.2';

      // Exhaust limit on ipA
      checkRateLimit(ipA, 1, 1000);
      const blockedA = checkRateLimit(ipA, 1, 1000);
      expect(blockedA.success).toBe(false);

      // ipB should remain unaffected
      const allowedB = checkRateLimit(ipB, 1, 1000);
      expect(allowedB.success).toBe(true);
    });
  });

  describe('2. CSV Formula Injection Defense', () => {
    it('sanitizes formula triggers by prepending single quotes', () => {
      expect(sanitizeCsvCell('=SUM(A1:A100)')).toBe("'=SUM(A1:A100)");
      expect(sanitizeCsvCell('+cmd|"/C calc"!A0')).toBe("'+cmd|\"/C calc\"!A0");
      expect(sanitizeCsvCell('-5000')).toBe("'-5000");
      expect(sanitizeCsvCell('@dangerous_macro()')).toBe("'@dangerous_macro()");
      expect(sanitizeCsvCell('\tmalicious_tab')).toBe("'\tmalicious_tab");
    });

    it('leaves safe alphanumeric data unaltered', () => {
      expect(sanitizeCsvCell('Acme Health Systems')).toBe('Acme Health Systems');
      expect(sanitizeCsvCell('contact@company.org')).toBe('contact@company.org');
      expect(sanitizeCsvCell(45000)).toBe('45000');
      expect(sanitizeCsvCell(null)).toBe('');
      expect(sanitizeCsvCell(undefined)).toBe('');
    });
  });

  describe('3. Cross-Vertical RLS & RBAC Access Matrix', () => {
    interface UserSession {
      id: string;
      role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
      assignedVerticalIds: string[];
    }

    // Pure reference implementation of Postgres RLS helper functions
    function hasVerticalAccess(user: UserSession, targetVerticalId: string): boolean {
      if (user.role === 'owner' || user.role === 'admin') return true;
      return user.assignedVerticalIds.includes(targetVerticalId);
    }

    function canWriteVertical(user: UserSession, targetVerticalId: string): boolean {
      if (!hasVerticalAccess(user, targetVerticalId)) return false;
      if (user.role === 'viewer') return false;
      return true;
    }

    function canDeleteRecord(user: UserSession, targetVerticalId: string, recordOwnerId: string): boolean {
      if (!canWriteVertical(user, targetVerticalId)) return false;
      if (user.role === 'owner' || user.role === 'admin' || user.role === 'manager') return true;
      // Member can only delete their own records
      if (user.role === 'member') return user.id === recordOwnerId;
      return false;
    }

    const saasMember: UserSession = {
      id: 'usr-member',
      role: 'member',
      assignedVerticalIds: ['vert-saas'],
    };

    const mentorshipViewer: UserSession = {
      id: 'usr-viewer',
      role: 'viewer',
      assignedVerticalIds: ['vert-mentorship'],
    };

    const companyAdmin: UserSession = {
      id: 'usr-admin',
      role: 'admin',
      assignedVerticalIds: ['vert-saas'],
    };

    it('blocks cross-vertical read access for non-admin roles', () => {
      expect(hasVerticalAccess(saasMember, 'vert-saas')).toBe(true);
      expect(hasVerticalAccess(saasMember, 'vert-c2c')).toBe(false);
      expect(hasVerticalAccess(saasMember, 'vert-training')).toBe(false);

      expect(hasVerticalAccess(companyAdmin, 'vert-c2c')).toBe(true);
      expect(hasVerticalAccess(companyAdmin, 'vert-training')).toBe(true);
    });

    it('enforces read-only enforcement for viewer role', () => {
      expect(hasVerticalAccess(mentorshipViewer, 'vert-mentorship')).toBe(true);
      expect(canWriteVertical(mentorshipViewer, 'vert-mentorship')).toBe(false);
    });

    it('prevents member from deleting records created by other users', () => {
      expect(canDeleteRecord(saasMember, 'vert-saas', 'usr-member')).toBe(true);
      expect(canDeleteRecord(saasMember, 'vert-saas', 'usr-other')).toBe(false);
      expect(canDeleteRecord(companyAdmin, 'vert-saas', 'usr-other')).toBe(true);
    });
  });

  describe('4. Server-Side Zod Input Hardening', () => {
    it('rejects invalid email formats', () => {
      const invalidLead = {
        vertical_id: 'vert-1',
        stage_id: 'stg-1',
        name: 'Invalid Lead',
        email: 'not-an-email',
      };
      const result = leadSchema.safeParse(invalidLead);
      expect(result.success).toBe(false);
    });

    it('rejects negative deal valuations', () => {
      const negativeLead = {
        vertical_id: 'vert-1',
        stage_id: 'stg-1',
        name: 'Negative Deal',
        estimated_value: -1000,
      };
      const result = leadSchema.safeParse(negativeLead);
      expect(result.success).toBe(false);
    });

    it('enforces lowercase alphanumeric slug formatting on verticals', () => {
      const badVertical = {
        name: 'Bad Slug Corp',
        slug: 'Bad_Slug_With_Spaces!',
        color: '#6366f1',
        icon: 'briefcase',
      };
      const result = verticalSchema.safeParse(badVertical);
      expect(result.success).toBe(false);

      const goodVertical = {
        name: 'Good Slug Corp',
        slug: 'good-slug-corp',
        color: '#6366f1',
        icon: 'briefcase',
      };
      const goodResult = verticalSchema.safeParse(goodVertical);
      expect(goodResult.success).toBe(true);
    });
  });
});
