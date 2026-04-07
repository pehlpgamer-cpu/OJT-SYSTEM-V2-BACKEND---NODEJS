/**
 * Matching Service - Intelligent Job Matching Algorithm
 * 
 * WHY: Core business logic for matching students to job postings.
 * Encapsulates the matching algorithm for reusability and testing.
 * 
 * ALGORITHM: Weighted scoring system considering:
 * 1. Skill Match (40% - most important)
 * 2. Location Match (20%)
 * 3. Availability Match (20%)
 * 4. GPA Match (10%)
 * 5. Academic Program Match (10%)
 * 
 * WHAT: Calculates compatibility scores and generates recommendations.
 */

import { Logger } from '../utils/errorHandler.js';

export class MatchingService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Calculate all match scores for a student
   * 
   * WHY: Called when student profile updates or new postings added.
   * Caches results for fast retrieval.
   * 
   * @param {number} studentId - Student ID
   * @returns {Array} Array of match scores
   */
  async calculateForStudent(studentId) {
    const student = await this.models.Student.findByPk(studentId, {
      include: ['skills'],
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Get all active job postings
    const postings = await this.models.OjtPosting.findAll({
      where: { posting_status: 'active' },
      include: ['requiredSkills'],
    });

    Logger.info('Calculating matches for student', {
      studentId,
      postingCount: postings.length,
    });

    // Calculate match for each posting
    const matchScores = [];
    for (const posting of postings) {
      try {
        const score = await this.calculateScore(student, posting);
        matchScores.push(score);
      } catch (error) {
        Logger.warn('Error calculating match', error, {
          studentId,
          postingId: posting.id,
        });
      }
    }

    return matchScores.sort((a, b) => b.overall_score - a.overall_score);
  }

  /**
   * Calculate single match score between student and posting
   * 
   * WHY: Core matching algorithm - calculates compatibility.
   * 
   * @param {object} student - Student with skills
   * @param {object} posting - Job posting with required skills
   * @returns {object} Match score record
   */
  async calculateScore(student, posting) {
    // Get matching rules (weights)
    const rules = await this.models.MatchingRule.getCurrentRules();
    const weights = rules || this.getDefaultRules();

    // Calculate component scores
    const skillScore = await this.calculateSkillScore(student, posting, weights);
    const locationScore = await this.calculateLocationScore(student, posting);
    const availabilityScore = await this.calculateAvailabilityScore(student, posting);
    const gpaScore = await this.calculateGpaScore(student, posting);
    const academicProgramScore = await this.calculateAcademicProgramScore(student, posting);

    // Calculate weighted overall score
    // WHY weights: Different institutions value different factors
    const overallScore = this.calculateWeightedScore({
      skillScore,
      locationScore,
      availabilityScore,
      gpaScore,
      academicProgramScore,
    }, weights);

    // Determine match status
    const matchStatus = this.getMatchStatus(overallScore, weights);

    // Create or update match score record
    const [matchScore, created] = await this.models.MatchScore.findOrCreate({
      where: {
        student_id: student.id,
        posting_id: posting.id,
      },
      defaults: {
        overall_score: overallScore,
        skill_score: skillScore,
        location_score: locationScore,
        availability_score: availabilityScore,
        gpa_score: gpaScore,
        academic_program_score: academicProgramScore,
        match_status: matchStatus,
        calculated_at: new Date(),
      },
    });

    // Update if already exists
    if (!created) {
      await matchScore.update({
        overall_score: overallScore,
        skill_score: skillScore,
        location_score: locationScore,
        availability_score: availabilityScore,
        gpa_score: gpaScore,
        academic_program_score: academicProgramScore,
        match_status: matchStatus,
        calculated_at: new Date(),
      });
    }

    return matchScore;
  }

  /**
   * Calculate skill compatibility score (0-100)
   * 
   * WHY: Skills are the primary matching criterion.
   * Algorithm:
   * - Required skills are weighted more heavily
   * - Each student skill matched increases score
   * - Proficiency levels considered
   * 
   * @param {object} student - Student with skills array
   * @param {object} posting - Posting with requiredSkills array
   * @param {object} weights - Matching weights config
   * @returns {number} Score 0-100
   */
  async calculateSkillScore(student, posting, weights) {
    // Get student's skills (names only)
    const studentSkillNames = student.skills
      .map(s => s.skill_name.toLowerCase().trim());

    // Get posting's required and preferred skills
    const requiredSkills = posting.requiredSkills
      .filter(s => s.is_required)
      .map(s => ({
        name: s.skill_name.toLowerCase().trim(),
        weight: s.weight || 1.0,
      }));

    const preferredSkills = posting.requiredSkills
      .filter(s => !s.is_required)
      .map(s => ({
        name: s.skill_name.toLowerCase().trim(),
        weight: s.weight || 1.0,
      }));

    // If no requirements, full match
    if (requiredSkills.length === 0) {
      return 100;
    }

    // Calculate required skills match
    // WHY: If required skills not met, return lower score
    let requiredMatched = 0;
    requiredSkills.forEach(skill => {
      if (studentSkillNames.includes(skill.name)) {
        requiredMatched += skill.weight;
      }
    });

    const requiredScore = (requiredMatched / requiredSkills.reduce((sum, s) => sum + s.weight, 0)) * 100;

    // If admin requires all required skills and not all present
    if (weights.prioritize_required_skills && requiredScore < 100) {
      return Math.max(0, requiredScore - 30); // Penalize missing required skills
    }

    // Calculate preferred skills bonus
    let preferredMatched = 0;
    preferredSkills.forEach(skill => {
      if (studentSkillNames.includes(skill.name)) {
        preferredMatched += skill.weight;
      }
    });

    const preferredScore = preferredSkills.length > 0
      ? (preferredMatched / preferredSkills.reduce((sum, s) => sum + s.weight, 0)) * 100
      : 0;

    // Combine: 80% required + 20% preferred
    const skillScore = (requiredScore * 0.8) + (preferredScore * 0.2);

    return Math.round(skillScore);
  }

  /**
   * Calculate location compatibility score (0-100)
   * 
   * WHY: Students prefer jobs in their location.
   * 
   * Score logic:
   * - 100: Student's preferred location matches posting location
   * - 80: Student hasn't specified preference but posting is in current location
   * - 100: Posting allows remote work (student can work from anywhere)
   * - 50: Different locations but student willing to relocate
   * - 0: No information available
   * 
   * @param {object} student - Student with location preferences
   * @param {object} posting - Posting with location requirement
   * @returns {number} Score 0-100
   */
  async calculateLocationScore(student, posting) {
    // If posting allows remote, full score
    if (posting.allow_remote) {
      return 100;
    }

    // Normalize locations for comparison
    const studentPref = student.preferred_location?.toLowerCase().trim();
    const postingLoc = posting.location.toLowerCase().trim();

    if (!studentPref) {
      // Student hasn't specified location preference
      const currentLoc = student.current_location?.toLowerCase().trim();
      if (currentLoc === postingLoc) {
        return 80; // Match with current location
      }
      return 50; // No preference, but could work there
    }

    if (studentPref === postingLoc) {
      return 100; // Perfect location match
    }

    // Partial match (e.g., same city but different area)
    // WHY flexible matching: Prevents 0 scores for nearby locations
    if (this.isNearbyLocation(studentPref, postingLoc)) {
      return 75; // Nearby but not exact
    }

    return 40; // Different location but student might relocate
  }

  /**
   * Check if two locations are nearby
   * 
   * WHY: Simple heuristic for location matching.
   * In production, use geolocation API.
   * 
   * @param {string} loc1 - First location
   * @param {string} loc2 - Second location
   * @returns {boolean} True if locations are close
   */
  isNearbyLocation(loc1, loc2) {
    // Simple implementation: check if they share keywords
    // Example: "Manila, Philippines" and "QC, Philippines" → nearby
    const parts1 = loc1.split(',').map(p => p.trim().toLowerCase());
    const parts2 = loc2.split(',').map(p => p.trim().toLowerCase());

    // If last part (country/region) matches
    return parts1[parts1.length - 1] === parts2[parts2.length - 1];
  }

  /**
   * Calculate availability match (0-100)
   * 
   * WHY: Student must be available during OJT period.
   * 
   * @param {object} student - Student with availability window
   * @param {object} posting - Posting with duration
   * @returns {number} Score 0-100
   */
  async calculateAvailabilityScore(student, posting) {
    if (!student.availability_start || !student.availability_end) {
      return 50; // Student hasn't specified availability yet
    }

    if (!posting.start_date) {
      return 100; // Posting doesn't have specific start date
    }

    // Calculate OJT end date based on start + duration
    const ojStart = new Date(posting.start_date);
    const ojEnd = new Date(ojStart);
    ojEnd.setDate(ojEnd.getDate() + posting.duration_weeks * 7);

    // Check if student available during the period
    const studentAvailStart = new Date(student.availability_start);
    const studentAvailEnd = new Date(student.availability_end);

    // Full overlap
    if (studentAvailStart <= ojStart && ojEnd <= studentAvailEnd) {
      return 100;
    }

    // Partial overlap
    if (
      (ojStart <= studentAvailEnd && ojStart >= studentAvailStart) ||
      (ojEnd <= studentAvailEnd && ojEnd >= studentAvailStart)
    ) {
      return 60; // Partial fit
    }

    // No overlap
    return 0;
  }

  /**
   * Calculate GPA match (0-100)
   * 
   * WHY: Some companies have minimum GPA requirements.
   * 
   * @param {object} student - Student with GPA
   * @param {object} posting - Posting with min GPA requirement
   * @returns {number} Score 0-100
   */
  async calculateGpaScore(student, posting) {
    if (!posting.min_gpa || !student.gpa) {
      return 100; // No requirement or no GPA specified
    }

    if (student.gpa >= posting.min_gpa) {
      return 100; // Meets requirement
    }

    // Calculate how much below requirement
    // Scale 0-100 where 0 = no GPA, 100 = meets requirement
    const shortfall = posting.min_gpa - student.gpa;
    const gpaRange = posting.min_gpa; // Assuming max GPA is ~4.0

    return Math.max(0, 100 - (shortfall / gpaRange * 100));
  }

  /**
   * Calculate academic program match (0-100)
   * 
   * WHY: Some positions require specific academic background.
   * 
   * @param {object} student - Student with academic program
   * @param {object} posting - Posting with program requirement
   * @returns {number} Score 0-100
   */
  async calculateAcademicProgramScore(student, posting) {
    if (!posting.academic_program || !student.academic_program) {
      return 100; // No specific requirement
    }

    const studentProg = student.academic_program.toLowerCase();
    const requiredProg = posting.academic_program.toLowerCase();

    if (studentProg === requiredProg) {
      return 100; // Exact match
    }

    // Check for related programs (e.g., CS and IT)
    if (this.isRelatedProgram(studentProg, requiredProg)) {
      return 80; // Related but not exact
    }

    return 30; // Different program
  }

  /**
   * Check if academic programs are related
   * 
   * WHY: Some programs are related and students can still do the work.
   */
  isRelatedProgram(prog1, prog2) {
    // Related program groups
    const techPrograms = ['computer science', 'information technology', 'software engineering', 'cs', 'it'];
    const engineeringPrograms = ['engineering', 'electrical engineering', 'mechanical engineering'];

    const isTech1 = techPrograms.some(p => prog1.includes(p));
    const isTech2 = techPrograms.some(p => prog2.includes(p));

    if (isTech1 && isTech2) return true;

    const isEng1 = engineeringPrograms.some(p => prog1.includes(p));
    const isEng2 = engineeringPrograms.some(p => prog2.includes(p));

    if (isEng1 && isEng2) return true;

    return false;
  }

  /**
   * Calculate weighted overall score
   * 
   * WHY: Combine all scores using configured weights.
   * 
   * @param {object} scores - Individual component scores
   * @param {object} weights - Weights configuration
   * @returns {number} Score 0-100
   */
  calculateWeightedScore(scores, weights) {
    const totalWeight = 
      weights.skill_weight +
      weights.location_weight +
      weights.availability_weight +
      weights.gpa_weight +
      weights.academic_program_weight;

    const weighted =
      (scores.skillScore * weights.skill_weight) +
      (scores.locationScore * weights.location_weight) +
      (scores.availabilityScore * weights.availability_weight) +
      (scores.gpaScore * weights.gpa_weight) +
      (scores.academicProgramScore * weights.academic_program_weight);

    return Math.round(weighted / totalWeight);
  }

  /**
   * Determine qualitative match status based on score
   * 
   * WHY: Provide human-readable match classification.
   * 
   * @param {number} score - Overall score 0-100
   * @param {object} weights - Weights (for minimum threshold)
   * @returns {string} Match status
   */
  getMatchStatus(score, weights) {
    if (score >= 85) return 'highly_compatible';
    if (score >= 70) return 'compatible';
    if (score >= weights.minimum_match_score) return 'moderately_compatible';
    if (score >= 40) return 'weak_match';
    return 'not_compatible';
  }

  /**
   * Get default matching rules/weights
   * 
   * WHY: Fallback if no rules configured.
   * 
   * @returns {object} Default weights
   */
  getDefaultRules() {
    return {
      skill_weight: 40,
      location_weight: 20,
      availability_weight: 20,
      gpa_weight: 10,
      academic_program_weight: 10,
      minimum_match_score: 60,
      prioritize_required_skills: true,
      allow_remote_flexibility: true,
    };
  }

  /**
   * Get matches for a student, sorted by score
   * 
   * WHY: Convenience method to get ranked recommendations.
   * 
   * @param {number} studentId - Student ID
   * @param {number} limit - Max results
   * @returns {Array} Sorted match scores
   */
  async getMatchesForStudent(studentId, limit = 10) {
    const matches = await this.models.MatchScore.findAll({
      where: { student_id: studentId },
      include: ['posting'],
      order: [['overall_score', 'DESC']],
      limit,
    });

    return matches;
  }
}

export default MatchingService;
