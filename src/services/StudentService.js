/**
 * Student Service
 * 
 * WHY: Handle all student-specific business logic:
 * - Profile management
 * - Skill management
 * - Applications
 * - Preference management
 * 
 * WHAT: Operations specific to student users.
 */

import { AppError, Logger } from '../utils/errorHandler.js';

export class StudentService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Get student profile
   * 
   * @param {number} userId - User ID
   * @returns {Object} Student profile
   */
  async getProfile(userId) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    return student;
  }

  /**
   * Update student profile
   * 
   * WHY: Allow students to update their information.
   * Also recalculates profile completeness.
   * 
   * @param {number} userId - User ID
   * @param {Object} data - Profile data to update
   * @returns {Object} Updated student
   */
  async updateProfile(userId, data) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    // Only allow updating specific fields
    const allowedFields = [
      'first_name', 'last_name', 'phone', 'bio',
      'current_location', 'preferred_location',
      'profile_picture_url', 'availability_start',
      'availability_end', 'academic_program', 'year_of_study',
      'gpa'
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        student[field] = data[field];
      }
    });

    // Recalculate profile completeness
    student.calculateProfileCompleteness();

    await student.save();

    Logger.info('Student profile updated', {
      userId,
      completeness: student.profile_completeness_percentage,
    });

    return student;
  }

  /**
   * Add skill to student
   * 
   * @param {number} userId - User ID
   * @param {Object} skillData - Skill information
   * @returns {Object} Created skill
   */
  async addSkill(userId, skillData) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const skill = await this.models.StudentSkill.create({
      student_id: student.id,
      skill_name: skillData.skill_name,
      proficiency_level: skillData.proficiency_level,
      years_of_experience: skillData.years_of_experience,
    });

    Logger.info('Skill added to student', {
      userId,
      skillName: skillData.skill_name,
    });

    return skill;
  }

  /**
   * Get student skills
   * 
   * @param {number} userId - User ID
   * @returns {Array} Student skills
   */
  async getSkills(userId) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    return await this.models.StudentSkill.findAll({
      where: { student_id: student.id },
      order: [['proficiency_level', 'DESC']],
    });
  }

  /**
   * Update skill
   */
  async updateSkill(userId, skillId, data) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const skill = await this.models.StudentSkill.findOne({
      where: {
        id: skillId,
        student_id: student.id,
      },
    });

    if (!skill) {
      throw new AppError('Skill not found', 404);
    }

    if (data.proficiency_level) {
      await skill.updateProficiency(data.proficiency_level);
    }

    if (data.years_of_experience) {
      skill.years_of_experience = data.years_of_experience;
    }

    await skill.save();
    return skill;
  }

  /**
   * Delete skill
   */
  async deleteSkill(userId, skillId) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const deleted = await this.models.StudentSkill.destroy({
      where: {
        id: skillId,
        student_id: student.id,
      },
    });

    if (deleted === 0) {
      throw new AppError('Skill not found', 404);
    }

    return true;
  }

  /**
   * Apply to a job posting
   * 
   * WHY: Submit application to job posting.
   * Triggers matching score calculation.
   * 
   * @param {number} userId - Student user ID
   * @param {number} postingId - Job posting ID
   * @param {Object} data - Application data (cover letter, resume)
   * @returns {Object} Created application
   */
  async applyToPosting(userId, postingId, data) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    // Check if posting exists and is active
    const posting = await this.models.OjtPosting.findByPk(postingId);
    if (!posting || posting.posting_status !== 'active') {
      throw new AppError('Job posting not found or not active', 404);
    }

    // Check if student already applied
    const existingApp = await this.models.Application.findOne({
      where: {
        student_id: student.id,
        posting_id: postingId,
      },
    });

    if (existingApp) {
      throw new AppError('You have already applied to this posting', 409);
    }

    // Check if positions available
    if (!posting.hasPositionsAvailable()) {
      throw new AppError('All positions for this posting have been filled', 409);
    }

    // Create application
    const application = await this.models.Application.create({
      student_id: student.id,
      posting_id: postingId,
      cover_letter: data.cover_letter,
      resume_id: data.resume_id,
      application_status: 'submitted',
      applied_at: new Date(),
    });

    // Increment posting application count
    await posting.incrementApplicationCount();

    Logger.info('Application submitted', {
      userId,
      postingId,
      applicationId: application.id,
    });

    return application;
  }

  /**
   * Get student applications
   * 
   * @param {number} userId - Student user ID
   * @param {Object} filters - Filter options (status, search)
   * @returns {Array} Applications
   */
  async getApplications(userId, filters = {}) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const where = { student_id: student.id };

    if (filters.status) {
      where.application_status = filters.status;
    }

    return await this.models.Application.findAll({
      where,
      include: ['ojtPosting', 'resume'],
      order: [['applied_at', 'DESC']],
    });
  }

  /**
   * Get single application details
   */
  async getApplication(userId, applicationId) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const application = await this.models.Application.findOne({
      where: {
        id: applicationId,
        student_id: student.id,
      },
      include: [
        { model: this.models.OjtPosting, include: ['requiredSkills'] },
        'resume',
      ],
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    return application;
  }

  /**
   * Withdraw application
   */
  async withdrawApplication(userId, applicationId) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const application = await this.models.Application.findOne({
      where: {
        id: applicationId,
        student_id: student.id,
      },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (application.application_status !== 'submitted') {
      throw new AppError('Can only withdraw submitted applications', 400);
    }

    await application.withdraw();

    return application;
  }

  /**
   * Upload resume
   * 
   * WHY: Store resume file for applications.
   * 
   * @param {number} userId - User ID
   * @param {Object} file - Uploaded file
   * @param {string} title - Resume title
   * @returns {Object} Created resume record
   */
  async uploadResume(userId, file, title = null) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const resume = await this.models.Resume.create({
      student_id: student.id,
      file_name: file.originalname,
      file_path: file.path,
      file_size_bytes: file.size,
      title: title || file.originalname,
      is_active: false,
    });

    Logger.info('Resume uploaded', {
      userId,
      resumeId: resume.id,
      size: file.size,
    });

    return resume;
  }

  /**
   * Get student resumes
   */
  async getResumes(userId) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    return await this.models.Resume.findAll({
      where: { student_id: student.id },
      order: [['uploaded_at', 'DESC']],
    });
  }

  /**
   * Set active resume
   */
  async setActiveResume(userId, resumeId) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const resume = await this.models.Resume.findOne({
      where: {
        id: resumeId,
        student_id: student.id,
      },
    });

    if (!resume) {
      throw new AppError('Resume not found', 404);
    }

    await resume.setAsActive();
    return resume;
  }

  /**
   * Get matched postings for student
   * 
   * @param {number} userId - Student user ID
   * @param {number} minScore - Minimum match score
   * @returns {Array} Matched postings
   */
  async getMatchedPostings(userId, minScore = 60) {
    const student = await this.models.Student.findOne({
      where: { user_id: userId },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const matches = await this.models.MatchScore.findAll({
      where: {
        student_id: student.id,
        overall_score: {
          [this.models.sequelize.Op.gte]: minScore,
        },
      },
      include: ['posting'],
      order: [['overall_score', 'DESC']],
    });

    return matches;
  }
}

export default StudentService;
