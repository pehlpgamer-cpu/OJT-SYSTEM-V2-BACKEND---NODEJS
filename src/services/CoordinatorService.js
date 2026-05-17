import { Op } from 'sequelize';
import { AppError } from '../utils/errorHandler.js';
import { AuditService, NotificationService } from './NotificationService.js';

const PROGRAM_STATUSES = ['draft', 'active', 'completed', 'archived'];
const STUDENT_STATUSES = ['active', 'suspended', 'completed', 'removed'];
const ELIGIBILITY_STATUSES = ['eligible', 'ineligible', 'override'];
const COMPANY_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

function toPlain(record) {
  return record?.toJSON ? record.toJSON() : record;
}

function parseIdList(body, singularKey, pluralKey) {
  const value = body?.[pluralKey] ?? body?.[singularKey];
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function normalizeAcademicPrograms(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export class CoordinatorService {
  constructor(models) {
    this.models = models;
    this.auditService = new AuditService(models);
    this.notificationService = new NotificationService(models);
  }

  async getCoordinatorForUser(user) {
    if (user.role === 'admin') {
      return null;
    }

    const coordinator = await this.models.Coordinator.findOne({
      where: { user_id: user.id },
    });

    if (!coordinator) {
      throw new AppError('Coordinator profile not found', 404);
    }

    return coordinator;
  }

  async resolveCoordinatorId(user, requestedCoordinatorId = null) {
    if (user.role === 'admin') {
      if (requestedCoordinatorId) {
        return Number.parseInt(requestedCoordinatorId, 10);
      }

      const firstCoordinator = await this.models.Coordinator.findOne({
        order: [['id', 'ASC']],
      });

      if (!firstCoordinator) {
        throw new AppError('No coordinator profile exists for program ownership', 422);
      }

      return firstCoordinator.id;
    }

    const coordinator = await this.getCoordinatorForUser(user);
    return coordinator.id;
  }

  async assertProgramAccess(programId, user) {
    const program = await this.models.OjtProgram.findByPk(programId);

    if (!program) {
      throw new AppError('OJT program not found', 404);
    }

    if (user.role !== 'admin') {
      const coordinator = await this.getCoordinatorForUser(user);
      if (program.coordinator_id !== coordinator.id) {
        throw new AppError('You do not have access to this OJT program', 403);
      }
    }

    return program;
  }

  normalizeProgramPayload(body = {}, user) {
    const payload = {
      name: body.name?.trim(),
      description: body.description ?? null,
      start_date: body.start_date,
      end_date: body.end_date,
      minimum_gpa: body.minimum_gpa === '' || body.minimum_gpa === undefined ? null : Number(body.minimum_gpa),
      academic_programs: normalizeAcademicPrograms(body.academic_programs),
      enrollment_enabled: body.enrollment_enabled === undefined ? true : Boolean(body.enrollment_enabled),
      status: body.status || 'draft',
    };

    if (!payload.name) {
      throw new AppError('Program name is required', 422);
    }

    if (!payload.start_date || !payload.end_date) {
      throw new AppError('Program start_date and end_date are required', 422);
    }

    if (!PROGRAM_STATUSES.includes(payload.status)) {
      throw new AppError('Invalid program status', 422);
    }

    if (payload.minimum_gpa !== null && (Number.isNaN(payload.minimum_gpa) || payload.minimum_gpa < 0 || payload.minimum_gpa > 4)) {
      throw new AppError('minimum_gpa must be between 0 and 4', 422);
    }

    if (user.role === 'admin' && body.coordinator_id) {
      payload.coordinator_id = Number.parseInt(body.coordinator_id, 10);
    }

    return payload;
  }

  async listPrograms(user) {
    const where = {};

    if (user.role !== 'admin') {
      const coordinator = await this.getCoordinatorForUser(user);
      where.coordinator_id = coordinator.id;
    }

    return await this.models.OjtProgram.findAll({
      where,
      include: [
        {
          model: this.models.Coordinator,
          as: 'coordinator',
          include: [{ model: this.models.User, attributes: ['id', 'name', 'email'] }],
        },
      ],
      order: [['start_date', 'DESC'], ['createdAt', 'DESC']],
    });
  }

  async createProgram(user, body) {
    const data = this.normalizeProgramPayload(body, user);
    data.coordinator_id = await this.resolveCoordinatorId(user, data.coordinator_id);

    const program = await this.models.OjtProgram.create(data);

    await this.auditService.log({
      userId: user.id,
      userRole: user.role,
      action: 'create',
      entityType: 'OjtProgram',
      entityId: program.id,
      newValues: toPlain(program),
      severity: 'medium',
      reason: 'OJT program created',
    });

    return program;
  }

  async getProgram(programId, user) {
    await this.assertProgramAccess(programId, user);
    return await this.models.OjtProgram.findByPk(programId, {
      include: [
        { model: this.models.ProgramStudent, as: 'programStudents' },
        { model: this.models.ProgramCompany, as: 'programCompanies' },
        { model: this.models.ProgramPosting, as: 'programPostings' },
      ],
    });
  }

  async updateProgram(programId, user, body) {
    const program = await this.assertProgramAccess(programId, user);
    const before = toPlain(program);
    const data = this.normalizeProgramPayload({ ...program.toJSON(), ...body }, user);
    delete data.coordinator_id;

    await program.update(data);

    await this.auditService.logDataChange(
      user.id,
      'OjtProgram',
      program.id,
      before,
      toPlain(program),
      'OJT program updated'
    );

    return program;
  }

  calculateEligibility(program, student, overrideReason = null) {
    const allowedPrograms = normalizeAcademicPrograms(program.academic_programs);
    const gpa = student.gpa === null || student.gpa === undefined ? null : Number(student.gpa);
    const minGpa = program.minimum_gpa === null || program.minimum_gpa === undefined ? null : Number(program.minimum_gpa);
    const gpaOk = minGpa === null || (gpa !== null && gpa >= minGpa);
    const programOk = allowedPrograms.length === 0 || allowedPrograms.includes(student.academic_program);

    if (overrideReason) {
      return 'override';
    }

    return gpaOk && programOk ? 'eligible' : 'ineligible';
  }

  async listProgramStudents(programId, user) {
    await this.assertProgramAccess(programId, user);

    return await this.models.ProgramStudent.findAll({
      where: { program_id: programId },
      include: [
        {
          model: this.models.Student,
          as: 'student',
          include: [
            { model: this.models.User, attributes: ['id', 'name', 'email', 'status'] },
            { model: this.models.StudentSkill, as: 'skills' },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async addProgramStudents(programId, user, body = {}) {
    const program = await this.assertProgramAccess(programId, user);
    const studentIds = parseIdList(body, 'student_id', 'student_ids');

    if (studentIds.length === 0) {
      throw new AppError('At least one student_id is required', 422);
    }

    const rows = [];

    for (const studentId of studentIds) {
      const student = await this.models.Student.findByPk(studentId);
      if (!student) continue;

      const overrideReason = body.override_reason || null;
      const [row, created] = await this.models.ProgramStudent.findOrCreate({
        where: { program_id: program.id, student_id: student.id },
        defaults: {
          status: body.status || 'active',
          eligibility_status: this.calculateEligibility(program, student, overrideReason),
          notes: body.notes || null,
          override_reason: overrideReason,
          status_updated_at: new Date(),
          status_updated_by: user.id,
        },
      });

      if (!created) {
        await row.update({
          status: body.status || 'active',
          eligibility_status: this.calculateEligibility(program, student, overrideReason),
          notes: body.notes ?? row.notes,
          override_reason: overrideReason ?? row.override_reason,
          status_updated_at: new Date(),
          status_updated_by: user.id,
        });
      }

      rows.push(row);
    }

    await this.auditService.log({
      userId: user.id,
      userRole: user.role,
      action: 'update',
      entityType: 'OjtProgram',
      entityId: program.id,
      newValues: { studentIds },
      severity: 'medium',
      reason: 'Students added to OJT program',
    });

    return rows;
  }

  async updateProgramStudentStatus(programId, studentId, user, body = {}) {
    await this.assertProgramAccess(programId, user);

    const row = await this.models.ProgramStudent.findOne({
      where: { program_id: programId, student_id: studentId },
    });

    if (!row) {
      throw new AppError('Program student enrollment not found', 404);
    }

    const nextStatus = body.status || row.status;
    const nextEligibility = body.eligibility_status || row.eligibility_status;

    if (!STUDENT_STATUSES.includes(nextStatus)) {
      throw new AppError('Invalid student program status', 422);
    }

    if (!ELIGIBILITY_STATUSES.includes(nextEligibility)) {
      throw new AppError('Invalid student eligibility status', 422);
    }

    const before = toPlain(row);
    await row.update({
      status: nextStatus,
      eligibility_status: nextEligibility,
      notes: body.notes ?? row.notes,
      suspension_reason: body.suspension_reason ?? row.suspension_reason,
      override_reason: body.override_reason ?? row.override_reason,
      status_updated_at: new Date(),
      status_updated_by: user.id,
    });

    await this.auditService.logDataChange(
      user.id,
      'ProgramStudent',
      row.id,
      before,
      toPlain(row),
      'Program student status updated'
    );

    return row;
  }

  async listStudents() {
    return await this.models.Student.findAll({
      include: [
        { model: this.models.User, attributes: ['id', 'name', 'email', 'status'] },
        { model: this.models.StudentSkill, as: 'skills' },
        { model: this.models.ProgramStudent, as: 'programEnrollments' },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async listProgramCompanies(programId, user) {
    await this.assertProgramAccess(programId, user);

    return await this.models.ProgramCompany.findAll({
      where: { program_id: programId },
      include: [
        {
          model: this.models.Company,
          as: 'company',
          include: [{ model: this.models.User, attributes: ['id', 'name', 'email', 'status'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async addProgramCompanies(programId, user, body = {}) {
    const program = await this.assertProgramAccess(programId, user);
    const companyIds = parseIdList(body, 'company_id', 'company_ids');

    if (companyIds.length === 0) {
      throw new AppError('At least one company_id is required', 422);
    }

    const rows = [];

    for (const companyId of companyIds) {
      const company = await this.models.Company.findByPk(companyId);
      if (!company) continue;

      const [row] = await this.models.ProgramCompany.findOrCreate({
        where: { program_id: program.id, company_id: company.id },
        defaults: {
          status: company.accreditation_status || 'pending',
        },
      });
      rows.push(row);
    }

    await this.auditService.log({
      userId: user.id,
      userRole: user.role,
      action: 'update',
      entityType: 'OjtProgram',
      entityId: program.id,
      newValues: { companyIds },
      severity: 'medium',
      reason: 'Companies added to OJT program',
    });

    return rows;
  }

  async listProgramPostings(programId, user) {
    await this.assertProgramAccess(programId, user);

    return await this.models.ProgramPosting.findAll({
      where: { program_id: programId },
      include: [
        {
          model: this.models.OjtPosting,
          as: 'posting',
          include: [{ model: this.models.Company }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async addProgramPostings(programId, user, body = {}) {
    const program = await this.assertProgramAccess(programId, user);
    const postingIds = parseIdList(body, 'posting_id', 'posting_ids');

    if (postingIds.length === 0) {
      throw new AppError('At least one posting_id is required', 422);
    }

    const rows = [];

    for (const postingId of postingIds) {
      const posting = await this.models.OjtPosting.findByPk(postingId);
      if (!posting) continue;

      const [row] = await this.models.ProgramPosting.findOrCreate({
        where: { program_id: program.id, posting_id: posting.id },
      });
      rows.push(row);
    }

    await this.auditService.log({
      userId: user.id,
      userRole: user.role,
      action: 'update',
      entityType: 'OjtProgram',
      entityId: program.id,
      newValues: { postingIds },
      severity: 'medium',
      reason: 'Postings added to OJT program',
    });

    return rows;
  }

  async listCompanies(filters = {}) {
    const where = {};
    if (filters.status) {
      where.accreditation_status = filters.status;
    }

    return await this.models.Company.findAll({
      where,
      include: [{ model: this.models.User, attributes: ['id', 'name', 'email', 'status'] }],
      order: [['createdAt', 'DESC']],
    });
  }

  async updateCompanyAccreditation(companyId, user, body = {}) {
    const status = body.status;

    if (!COMPANY_STATUSES.includes(status)) {
      throw new AppError('Invalid company accreditation status', 422);
    }

    if (status === 'rejected' && !body.reason) {
      throw new AppError('Rejection reason is required', 422);
    }

    const company = await this.models.Company.findByPk(companyId);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const before = toPlain(company);
    const updateData = {
      accreditation_status: status,
      accreditation_decision_note: body.note || null,
      accreditation_rejection_reason: status === 'rejected' ? body.reason : null,
      accreditation_verified_by: user.id,
      accreditation_verified_at: ['approved', 'rejected', 'suspended'].includes(status) ? new Date() : null,
      is_approved_for_posting: status === 'approved',
    };

    await company.update(updateData);

    await this.models.ProgramCompany.update(
      {
        status,
        decision_note: body.note || null,
        rejection_reason: status === 'rejected' ? body.reason : null,
        decided_by: user.id,
        decided_at: new Date(),
      },
      { where: { company_id: company.id } }
    );

    const notificationTitle = status === 'approved'
      ? 'Company Approved'
      : status === 'rejected'
        ? 'Company Accreditation Rejected'
        : 'Company Accreditation Updated';
    const notificationMessage = status === 'approved'
      ? 'Your company is approved. You can now publish OJT postings.'
      : status === 'rejected'
        ? `Your company accreditation was rejected: ${body.reason}`
        : `Your company accreditation status is now ${status}.`;

    await this.notificationService.notify(company.user_id, {
      title: notificationTitle,
      message: notificationMessage,
      type: 'account_update',
      entityType: 'Company',
      entityId: company.id,
      priority: status === 'approved' ? 'high' : 'normal',
      actionUrl: '/company/dashboard',
    });

    await this.auditService.logDataChange(
      user.id,
      'Company',
      company.id,
      before,
      toPlain(company),
      `Company accreditation ${status}`
    );

    return company;
  }

  async getProgramPostingIds(programId) {
    const links = await this.models.ProgramPosting.findAll({
      where: { program_id: programId },
      attributes: ['posting_id'],
    });
    return links.map((link) => link.posting_id);
  }

  async getProgramMetrics(programId, user) {
    await this.assertProgramAccess(programId, user);
    const postingIds = await this.getProgramPostingIds(programId);
    const studentCount = await this.models.ProgramStudent.count({
      where: { program_id: programId, status: { [Op.ne]: 'removed' } },
    });
    const approvedCompanyCount = await this.models.ProgramCompany.count({
      where: { program_id: programId, status: 'approved' },
    });
    const jobsPosted = postingIds.length;
    const applicationWhere = postingIds.length > 0 ? { posting_id: { [Op.in]: postingIds } } : { id: -1 };
    const applicationsTotal = await this.models.Application.count({ where: applicationWhere });
    const hiredCount = await this.models.Application.count({
      where: { ...applicationWhere, application_status: 'hired' },
    });
    const placementRate = studentCount === 0 ? 0 : Math.round((hiredCount / studentCount) * 10000) / 100;
    const matchRows = postingIds.length > 0
      ? await this.models.MatchScore.findAll({
          where: { posting_id: { [Op.in]: postingIds } },
          attributes: ['overall_score'],
        })
      : [];
    const averageMatchScore = matchRows.length === 0
      ? 0
      : Math.round((matchRows.reduce((sum, row) => sum + Number(row.overall_score || 0), 0) / matchRows.length) * 100) / 100;

    return {
      total_students: studentCount,
      approved_companies: approvedCompanyCount,
      jobs_posted: jobsPosted,
      total_applications: applicationsTotal,
      hired_students: hiredCount,
      placement_rate: placementRate,
      average_match_score: averageMatchScore,
    };
  }

  async getDashboard(user) {
    const programs = await this.listPrograms(user);
    const activePrograms = programs.filter((program) => program.status === 'active');
    const pendingCompanies = await this.listCompanies({ status: 'pending' });
    const recentAuditLogs = await this.getAuditLogs(user, { limit: 8 });
    const metrics = programs[0]
      ? await this.getProgramMetrics(programs[0].id, user)
      : {
          total_students: 0,
          approved_companies: 0,
          jobs_posted: 0,
          total_applications: 0,
          hired_students: 0,
          placement_rate: 0,
          average_match_score: 0,
        };

    return {
      metrics,
      programs: activePrograms,
      pending_companies: pendingCompanies.slice(0, 8),
      recent_audit_logs: recentAuditLogs,
    };
  }

  async getAuditLogs(user, filters = {}) {
    const where = {};
    if (filters.action) where.action = filters.action;
    if (filters.entity_type) where.entity_type = filters.entity_type;

    return await this.models.AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Number.parseInt(filters.limit, 10) || 50,
    });
  }

  async generatePlacementReport(user, filters = {}) {
    const programId = filters.programId || filters.program_id;
    let postingIds = [];
    let program = null;

    if (programId) {
      program = await this.assertProgramAccess(programId, user);
      postingIds = await this.getProgramPostingIds(program.id);
    } else if (user.role !== 'admin') {
      const programs = await this.listPrograms(user);
      const programIds = programs.map((item) => item.id);
      const links = programIds.length > 0
        ? await this.models.ProgramPosting.findAll({ where: { program_id: { [Op.in]: programIds } } })
        : [];
      postingIds = links.map((link) => link.posting_id);
    }

    const where = {};
    if (postingIds.length > 0) {
      where.posting_id = { [Op.in]: postingIds };
    } else if (programId || user.role !== 'admin') {
      where.id = -1;
    }

    if (filters.startDate || filters.start_date) {
      where.applied_at = { ...(where.applied_at || {}), [Op.gte]: new Date(filters.startDate || filters.start_date) };
    }
    if (filters.endDate || filters.end_date) {
      where.applied_at = { ...(where.applied_at || {}), [Op.lte]: new Date(filters.endDate || filters.end_date) };
    }

    const applications = await this.models.Application.findAll({
      where,
      include: [
        {
          model: this.models.Student,
          include: [{ model: this.models.User, attributes: ['id', 'name', 'email'] }],
        },
        {
          model: this.models.OjtPosting,
          include: [{ model: this.models.Company }],
        },
      ],
      order: [['applied_at', 'DESC']],
    });

    const rows = applications.map((application) => {
      const data = toPlain(application);
      const student = data.Student || data.student || {};
      const posting = data.OjtPosting || data.ojtPosting || {};
      const company = posting.Company || posting.company || {};
      return {
        application_id: data.id,
        student_name: student.User?.name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        student_email: student.User?.email || '',
        academic_program: student.academic_program || '',
        company_name: company.company_name || '',
        posting_title: posting.title || '',
        status: data.application_status,
        match_score: data.match_score || '',
        applied_at: data.applied_at,
        hired_at: data.hired_at,
      };
    });

    const totalApplications = rows.length;
    const hired = rows.filter((row) => row.status === 'hired').length;
    const rejected = rows.filter((row) => row.status === 'rejected').length;
    const averageMatchScore = rows.length === 0
      ? 0
      : Math.round((rows.reduce((sum, row) => sum + Number(row.match_score || 0), 0) / rows.length) * 100) / 100;

    return {
      summary: {
        program_id: program?.id || null,
        program_name: program?.name || 'All accessible programs',
        total_applications: totalApplications,
        hired,
        rejected,
        placement_rate: totalApplications === 0 ? 0 : Math.round((hired / totalApplications) * 10000) / 100,
        average_match_score: averageMatchScore,
      },
      rows,
    };
  }

  placementReportToCsv(report) {
    const headers = [
      'application_id',
      'student_name',
      'student_email',
      'academic_program',
      'company_name',
      'posting_title',
      'status',
      'match_score',
      'applied_at',
      'hired_at',
    ];
    const lines = [
      headers.join(','),
      ...report.rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
    ];
    return lines.join('\n');
  }
}

export default CoordinatorService;
