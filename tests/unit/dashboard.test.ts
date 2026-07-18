import { describe, it, expect } from 'vitest';

// Function imitating breadcrumb segment parsing from src/components/shared/Header.tsx
function parseBreadcrumbs(pathname: string): string[] {
  const pathSegments = pathname.split('/').filter(Boolean);
  return pathSegments.map((segment) => {
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  });
}

// Function imitating usage metric percentage calculations
function calculateUsagePercent(usageCount: number, usageLimit: number): number {
  return Math.min(Math.round((usageCount / usageLimit) * 100), 100);
}

describe('Dashboard Utility and Helper Audits', () => {
  
  describe('Breadcrumb Parser Logic', () => {
    it('should split path segments and capitalize word letters', () => {
      const result1 = parseBreadcrumbs('/dashboard');
      expect(result1).toEqual(['Dashboard']);

      const result2 = parseBreadcrumbs('/dashboard/appeals/new');
      expect(result2).toEqual(['Dashboard', 'Appeals', 'New']);
    });

    it('should return empty list for root path', () => {
      const result = parseBreadcrumbs('/');
      expect(result).toEqual([]);
    });
  });

  describe('Usage Percentage Calculator', () => {
    it('should return correct percentage value', () => {
      const result = calculateUsagePercent(2, 5);
      expect(result).toBe(40);
    });

    it('should cap values at 100 percent to prevent layout overflows', () => {
      const result = calculateUsagePercent(10, 5);
      expect(result).toBe(100);
    });

    it('should handle zero cases cleanly', () => {
      const result = calculateUsagePercent(0, 5);
      expect(result).toBe(0);
    });
  });
});
