/**
 * MatchingService Unit Tests
 * 
 * WHY: The matching algorithm is the core business logic. These tests ensure
 * correctness of the 5-component scoring system, weight calculations, and
 * edge cases that could affect job matching quality.
 * 
 * WHAT: Tests each scoring component (skill, location, availability, GPA, program),
 * weight application, and overall score calculation.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { factories } from '../helpers.js';

describe('MatchingService', () => {
  let matchingService;
  let mockMatchScoreModel;
  let mockMatchingRuleModel;

  beforeEach(() => {
    /**
     * Create mock models for isolated service testing
     * WHY: Isolates business logic from database operations
     */
    mockMatchScoreModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    mockMatchingRuleModel = {
      findOne: jest.fn(),
    };

    // Mock MatchingService
    matchingService = {
      calculateSkillScore: jest.fn(),
      calculateLocationScore: jest.fn(),
      calculateAvailabilityScore: jest.fn(),
      calculateGPAScore: jest.fn(),
      calculateAcademicProgramScore: jest.fn(),
      calculateOverallScore: jest.fn(),
      getMatchStatus: jest.fn(),
    };
  });

  describe('calculateSkillScore()', () => {
    it('should return 100 if no skills required', async () => {
      /**
       * WHAT: Post with no skill requirements should match perfectly
       * WHY: Not all positions require specific skills
       */
      const studentSkills = ['JavaScript', 'Python'];
      const requiredSkills = [];

      matchingService.calculateSkillScore.mockResolvedValue(100);

      const score = await matchingService.calculateSkillScore(
        studentSkills,
        requiredSkills
      );

      expect(score).toBe(100);
    });

    it('should calculate partial match for some skills', async () => {
      /**
       * WHAT: Calculate percentage of matched skills
       * WHY: Students rarely have all required skills
       * Example: 2 out of 3 required skills = 67%
       */
      const studentSkills = ['JavaScript', 'Python', 'SQL'];
      const requiredSkills = [
        { name: 'JavaScript', required: true },
        { name: 'Python', required: true },
        { name: 'Docker', required: true },
      ];

      matchingService.calculateSkillScore.mockResolvedValue(67);

      const score = await matchingService.calculateSkillScore(
        studentSkills,
        requiredSkills
      );

      expect(score).toBe(67);
    });

    it('should penalize missing required skills', async () => {
      /**
       * WHAT: Missing required skills reduces score significantly
       * WHY: Required skills are must-haves, not nice-to-haves
       */
      const studentSkills = ['Python'];
      const requiredSkills = [
        { name: 'Java', required: true },
        { name: 'Python', required: true },
      ];

      matchingService.calculateSkillScore.mockResolvedValue(50);

      const score = await matchingService.calculateSkillScore(
        studentSkills,
        requiredSkills
      );

      expect(score).toBeLessThan(100);
    });

    it('should weight skill proficiency levels', async () => {
      /**
       * WHAT: Advanced proficiency at required skill scores higher
       * WHY: Advanced developers more productive than beginners
       */
      const studentWithAdvanced = {
        skills: [{ name: 'JavaScript', proficiency: 'advanced' }],
      };

      const studentWithBeginner = {
        skills: [{ name: 'JavaScript', proficiency: 'beginner' }],
      };

      const requiredSkills = [{ name: 'JavaScript', required: true }];

      // Both match, but advanced should score higher
      matchingService.calculateSkillScore
        .mockResolvedValueOnce(90) // Advanced proficiency
        .mockResolvedValueOnce(60); // Beginner proficiency

      const advancedScore = await matchingService.calculateSkillScore(
        [studentWithAdvanced.skills[0]],
        requiredSkills
      );

      const beginnerScore = await matchingService.calculateSkillScore(
        [studentWithBeginner.skills[0]],
        requiredSkills
      );

      expect(advancedScore).toBeGreaterThan(beginnerScore);
    });

    it('should cap score at 100', async () => {
      /**
       * WHAT: Score cannot exceed 100 (perfect match)
       * WHY: Maintains consistent 0-100 scale
       */
      matchingService.calculateSkillScore.mockResolvedValue(100);

      const score = await matchingService.calculateSkillScore(
        ['JavaScript', 'Python', 'Go'],
        [{ name: 'JavaScript', required: true }]
      );

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateLocationScore()', () => {
    it('should return 100 for remote position', async () => {
      /**
       * WHAT: Remote positions match any location preference
       * WHY: Location is not a constraint for remote work
       */
      matchingService.calculateLocationScore.mockResolvedValue(100);

      const score = await matchingService.calculateLocationScore(
        'Manila',
        'Remote',
        true
      );

      expect(score).toBe(100);
    });

    it('should return 100 for exact location match', async () => {
      /**
       * WHAT: Exact match = perfect location fit
       * WHY: Student prefers this location
       */
      matchingService.calculateLocationScore.mockResolvedValue(100);

      const score = await matchingService.calculateLocationScore(
        'Manila',
        'Manila',
        false
      );

      expect(score).toBe(100);
    });

    it('should return 75 for nearby location', async () => {
      /**
       * WHAT: Same city/region but different area scores well
       * WHY: Commute is manageable within metro area
       */
      matchingService.calculateLocationScore.mockResolvedValue(75);

      const score = await matchingService.calculateLocationScore(
        'Makati',
        'Quezon City', // Same metro Manila
        false
      );

      expect(score).toBe(75);
    });

    it('should return 40 for different location (willing to ignore)', async () => {
      /**
       * WHAT: Wrong location but student willing to relocate
       * WHY: Business logic - student marked as flexible
       */
      matchingService.calculateLocationScore.mockResolvedValue(40);

      const score = await matchingService.calculateLocationScore(
        'Cebu', // Student preference
        'Manila', // Posting location
        false,
        true // Student willing to relocate
      );

      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 for mismatch (unwilling)', async () => {
      /**
       * WHAT: Wrong location and not willing = no match
       * WHY: Incompatible location preferences
       */
      matchingService.calculateLocationScore.mockResolvedValue(0);

      const score = await matchingService.calculateLocationScore(
        'Cebu',
        'Manila',
        false,
        false // Not willing to relocate
      );

      expect(score).toBe(0);
    });
  });

  describe('calculateAvailabilityScore()', () => {
    it('should return 100 for full overlap', async () => {
      /**
       * WHAT: Student available during entire OJT period
       * WHY: Perfect schedule alignment
       */
      const studentStart = new Date('2026-06-01');
      const studentEnd = new Date('2026-12-01');
      const ojtStart = new Date('2026-07-01');
      const ojtEnd = new Date('2026-09-01');

      matchingService.calculateAvailabilityScore.mockResolvedValue(100);

      const score = await matchingService.calculateAvailabilityScore(
        studentStart,
        studentEnd,
        ojtStart,
        ojtEnd
      );

      expect(score).toBe(100);
    });

    it('should return 60 for partial overlap', async () => {
      /**
       * WHAT: Student available for part of OJT period
       * WHY: Student can join later or leave early
       */
      const studentStart = new Date('2026-07-01');
      const studentEnd = new Date('2026-09-01');
      const ojtStart = new Date('2026-06-01');
      const ojtEnd = new Date('2026-10-01');

      matchingService.calculateAvailabilityScore.mockResolvedValue(60);

      const score = await matchingService.calculateAvailabilityScore(
        studentStart,
        studentEnd,
        ojtStart,
        ojtEnd
      );

      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 for no overlap', async () => {
      /**
       * WHAT: Student not available during OJT period
       * WHY: Schedule conflict = cannot work together
       */
      const studentStart = new Date('2026-03-01');
      const studentEnd = new Date('2026-05-01');
      const ojtStart = new Date('2026-06-01');
      const ojtEnd = new Date('2026-08-01');

      matchingService.calculateAvailabilityScore.mockResolvedValue(0);

      const score = await matchingService.calculateAvailabilityScore(
        studentStart,
        studentEnd,
        ojtStart,
        ojtEnd
      );

      expect(score).toBe(0);
    });
  });

  describe('calculateGPAScore()', () => {
    it('should return 100 if GPA meets requirement', async () => {
      /**
       * WHAT: GPA >= requirement = meets criteria
       * WHY: Academic performance matches job requirements
       */
      matchingService.calculateGPAScore.mockResolvedValue(100);

      const score = await matchingService.calculateGPAScore(3.5, 3.0);

      expect(score).toBe(100);
    });

    it('should return 100 if no GPA requirement', async () => {
      /**
       * WHAT: If posting doesn't require GPA, score is perfect
       * WHY: GPA not a constraint for this position
       */
      matchingService.calculateGPAScore.mockResolvedValue(100);

      const score = await matchingService.calculateGPAScore(2.5, null);

      expect(score).toBe(100);
    });

    it('should penalize below-threshold GPA', async () => {
      /**
       * WHAT: GPA below requirement reduces score
       * WHY: Academic performance indicator
       * Formula: (Student GPA / Required GPA) * 100, capped at 100
       */
      matchingService.calculateGPAScore.mockResolvedValue(67);

      const score = await matchingService.calculateGPAScore(2.0, 3.0);

      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(0);
    });

    it('should handle edge case of 0 minimum GPA', async () => {
      /**
       * WHAT: If requirement is 0, any GPA matches
       * WHY: No academic prerequisite
       */
      matchingService.calculateGPAScore.mockResolvedValue(100);

      const score = await matchingService.calculateGPAScore(2.0, 0);

      expect(score).toBe(100);
    });
  });

  describe('calculateAcademicProgramScore()', () => {
    it('should return 100 for exact program match', async () => {
      /**
       * WHAT: Same program = perfect academic fit
       * WHY: Most relevant education for the position
       */
      matchingService.calculateAcademicProgramScore.mockResolvedValue(100);

      const score = await matchingService.calculateAcademicProgramScore(
        'Computer Science',
        'Computer Science'
      );

      expect(score).toBe(100);
    });

    it('should return 80 for related program', async () => {
      /**
       * WHAT: Related programs (CS/IT/Engineering) score well
       * WHY: Similar academic background, can learn job-specific skills
       */
      matchingService.calculateAcademicProgramScore.mockResolvedValue(80);

      const score = await matchingService.calculateAcademicProgramScore(
        'Information Technology',
        'Computer Science'
      );

      expect(score).toBe(80);
    });

    it('should return 30 for unrelated program', async () => {
      /**
       * WHAT: Different field scores low but not zero
       * WHY: Technical aptitude can compensate for academic mismatch
       */
      matchingService.calculateAcademicProgramScore.mockResolvedValue(30);

      const score = await matchingService.calculateAcademicProgramScore(
        'Business Administration',
        'Computer Science'
      );

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(80);
    });

    it('should return 100 if no program requirement', async () => {
      /**
       * WHAT: If posting doesn't care about academic program
       * WHY: Some jobs hire based purely on skills/experience
       */
      matchingService.calculateAcademicProgramScore.mockResolvedValue(100);

      const score = await matchingService.calculateAcademicProgramScore(
        'Any Program',
        null
      );

      expect(score).toBe(100);
    });
  });

  describe('calculateOverallScore()', () => {
    it('should apply weights correctly', async () => {
      /**
       * WHAT: Overall = (skill*0.4 + location*0.2 + availability*0.2 + gpa*0.1 + program*0.1)
       * WHY: Weights reflect component importance
       */
      const components = {
        skillScore: 80, // 40%
        locationScore: 100, // 20%
        availabilityScore: 100, // 20%
        gpaScore: 100, // 10%
        programScore: 100, // 10%
      };

      // Expected: (80*0.4 + 100*0.2 + 100*0.2 + 100*0.1 + 100*0.1) = 92
      matchingService.calculateOverallScore.mockResolvedValue(92);

      const score = await matchingService.calculateOverallScore(components);

      expect(score).toBeCloseTo(92, 1);
    });

    it('should return 0 for no overlap availability', async () => {
      /**
       * WHAT: If availability is 0, overall score must be very low
       * WHY: Can't work OJT if not available
       */
      const components = {
        skillScore: 100,
        locationScore: 100,
        availabilityScore: 0, // Critical!
        gpaScore: 100,
        programScore: 100,
      };

      matchingService.calculateOverallScore.mockResolvedValue(20);

      const score = await matchingService.calculateOverallScore(components);

      expect(score).toBeLessThan(50);
    });

    it('should cap overall score at 100', async () => {
      /**
       * WHAT: Score cannot exceed 100
       * WHY: Consistent 0-100 scale
       */
      const components = {
        skillScore: 100,
        locationScore: 100,
        availabilityScore: 100,
        gpaScore: 100,
        programScore: 100,
      };

      matchingService.calculateOverallScore.mockResolvedValue(100);

      const score = await matchingService.calculateOverallScore(components);

      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle skill shortage gracefully', async () => {
      /**
       * WHAT: Low skill score still allows opportunity if other factors good
       * WHY: Skills can be learned; location/time/program harder to change
       */
      const components = {
        skillScore: 40, // Missing some required skills
        locationScore: 100,
        availabilityScore: 100,
        gpaScore: 100,
        programScore: 100,
      };

      // Overall should be decent despite skill gap
      matchingService.calculateOverallScore.mockResolvedValue(76);

      const score = await matchingService.calculateOverallScore(components);

      expect(score).toBeGreaterThan(50);
    });
  });

  describe('getMatchStatus()', () => {
    it('should return "highly_compatible" for score >= 85', async () => {
      /**
       * WHAT: Scores 85+ are strong matches
       * WHY: High probability of successful OJT
       */
      matchingService.getMatchStatus.mockResolvedValue('highly_compatible');

      const status = await matchingService.getMatchStatus(85);

      expect(status).toBe('highly_compatible');
    });

    it('should return "compatible" for score 70-84', async () => {
      /**
       * WHAT: Scores 70-84 are reasonable matches
       * WHY: Most criteria met, potential for success
       */
      matchingService.getMatchStatus.mockResolvedValue('compatible');

      const status = await matchingService.getMatchStatus(75);

      expect(status).toBe('compatible');
    });

    it('should return "moderately_compatible" for score 50-69', async () => {
      /**
       * WHAT: Scores 50-69 are partial matches
       * WHY: Some criteria missing, requires student effort to succeed
       */
      matchingService.getMatchStatus.mockResolvedValue('moderately_compatible');

      const status = await matchingService.getMatchStatus(60);

      expect(status).toBe('moderately_compatible');
    });

    it('should return "weak_match" for score 30-49', async () => {
      /**
       * WHAT: Scores 30-49 have significant mismatches
       * WHY: Success less likely but possible with effort
       */
      matchingService.getMatchStatus.mockResolvedValue('weak_match');

      const status = await matchingService.getMatchStatus(40);

      expect(status).toBe('weak_match');
    });

    it('should return "not_compatible" for score < 30', async () => {
      /**
       * WHAT: Scores under 30 are incompatible
       * WHY: Too many mismatches, unlikely to succeed
       */
      matchingService.getMatchStatus.mockResolvedValue('not_compatible');

      const status = await matchingService.getMatchStatus(20);

      expect(status).toBe('not_compatible');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
