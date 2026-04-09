# 04 - Data Models Complete Reference

**Version:** 2.0.0  
**Framework:** Sequelize ORM

---

## 🏗️ Model Class Hierarchy

All models inherit from `Sequelize.Model`. Each model is defined by a factory function and exported as a named export.

---

## 👤 User Model

**File:** `src/models/User.js`  
**Role:** Base authentication model for all user types

### Model Definition

```javascript
User.define(
  'User',
  {
    // Fields...
  },
  {
    // Options...
  }
)
```

### Instance Methods

#### comparePassword(plaintextPassword)
Compares a plaintext password with the bcrypt hash stored in database.

```javascript
const user = await User.findOne({ where: { email: 'john@example.com' } });
const isMatch = await user.comparePassword('SecurePass123!');
// Returns: true or false
```

**Returns:** Boolean  
**Security:** Uses bcrypt.compare() for constant-time comparison

#### compareToken(token)
Validates "remember me" token.

```javascript
const isValid = await user.compareToken(storedToken);
```

#### generateToken()
Generates JWT token for authentication.

```javascript
const token = user.generateToken();
// Returns JWT string that expires in 7 days
```

**Implementation:**
```javascript
generateToken() {
  return jwt.sign(
    {
      id: this.id,
      email: this.email,
      role: this.role,
    },
    config.auth.secret,
    { expiresIn: config.auth.expiresIn }
  );
}
```

### Class Methods

#### findByEmail(email)
Find user by email address (case-insensitive).

```javascript
const user = await User.findByEmail('JOHN@EXAMPLE.COM');
// Returns normalized lowercase email lookup
```

**Returns:** User model instance or null

#### findActiveUser(email)
Find only active users (not suspended, not locked).

```javascript
const user = await User.findActiveUser('john@example.com');
```

**Returns:** User or null (if not active)

### Hooks (Auto-execution)

#### beforeCreate
Automatically hash password before inserting.

```javascript
// User saving: User.create({ password: 'plain' })
// Hook runs and hashes password
// Database stores: bcrypt_hash_of_plain
```

#### beforeUpdate
Auto-hash password only if password field changed.

```javascript
await user.update({ name: 'New Name' }); // Password NOT re-hashed
await user.update({ password: 'NewPass' }); // Password IS hashed
```

---

## 👨‍🎓 Student Model

**File:** `src/models/Student.js`  
**Purpose:** Extends User with student-specific profile data

### Instance Methods

#### calculateProfileCompleteness()
Auto-updates profile_completeness_percentage based on filled fields.

```javascript
const student = await Student.findOne({ where: { user_id: 1 } });
student.calculateProfileCompleteness();
// 0% empty
// 12.5% per field filled (8 fields)
// 100% all fields filled
```

**Fields Counted:**
1. first_name
2. last_name
3. phone
4. bio
5. preferred_location
6. gpa
7. academic_program
8. year_of_study

#### getFullName()
Returns concatenated first + last name.

```javascript
const fullName = student.getFullName();
// Returns: "John Doe" or "John" if no last name
```

#### getAvailabilityStatus()
Returns current availability ("Available", "Not Available", "Upcoming").

```javascript
const status = student.getAvailabilityStatus();
// Returns status based on availability_start/end vs today
```

---

## 🏢 Company Model

**File:** `src/models/Company.js`  
**Purpose:** Company profile and job posting management

### Instance Methods

#### updateRating(newRating)
Update average rating (called when student leaves review).

```javascript
await company.updateRating(4.5);
// Updates average_rating and increments total_ratings
```

#### canPostJobs()
Check if company is approved to post job openings.

```javascript
const canPost = company.canPostJobs();
// Returns: true if accreditation_status === 'approved' AND is_approved_for_posting === true
```

#### suspend(reason)
Suspend company from posting (called by admin).

```javascript
await company.suspend('Low ratings');
// Sets accreditation_status = 'suspended'
// Sets is_approved_for_posting = false
```

---

## 📋 Application Model

**File:** `src/models/Application.js`  
**Purpose:** Track student job applications

### Instance Methods

#### updateStatus(newStatus, options = {})
Update application status with validation.

```javascript
await application.updateStatus('shortlisted', {
  company_feedback: 'Great portfolio!',
  reviewed_at: new Date()
});
// Validates state transition
// Updates timestamp based on new status
```

**Valid Transitions:**
```
submitted → under_review → shortlisted → hired
                        ↘ rejected
submitted → withdrawn
```

#### reject(reason)
Shorthand to reject application.

```javascript
await application.reject('Overqualified');
// Sets application_status = 'rejected'
// Sets rejection_reason = 'Overqualified'
```

#### hire(feedback)
Shorthand to hire applicant.

```javascript
await application.hire('Excellent candidate!');
// Sets application_status = 'hired'
// Sets hired_at = now
// Increments posting.positions_filled
```

---

## 📚 Skill Models

**File:** `src/models/Skill.js`

### StudentSkill Model

#### updateProficiency(newLevel)
Update skill proficiency with validation.

```javascript
await skill.updateProficiency('expert');
// Valid levels: 'beginner', 'intermediate', 'advanced', 'expert'
```

#### addEndorsement()
Increment endorsement count (peer validation).

```javascript
await skill.addEndorsement();
// endorsed_count += 1
```

### PostingSkill Model

**Represents required/preferred skills for job posting**

---

## 🎯 Matching Models

**File:** `src/models/Matching.js`

### MatchScore Model

Stores calculated compatibility between student and posting.

**Key Properties:**
- `overall_score` (0-100)
- `skill_score` (40% weight)
- `location_score` (20% weight)
- `availability_score` (20% weight)
- `gpa_score` (10% weight)
- `academic_program_score` (10% weight)
- `match_status` (highly_compatible, compatible, etc)

**Usage:**
```javascript
// Get a student's top matches
const matches = await MatchScore.findAll({
  where: { student_id: 1 },
  order: [['overall_score', 'DESC']],
  limit: 20
});
```

### MatchingRule Model

Configurable weights for matching algorithm.

**Purpose:**
Different institutions may value factors differently:
- School A: Weight skills heaviest
- School B: Prefer location match
- School C: Focus on availability

---

## 📝 Audit Models

**File:** `src/models/Audit.js`

### AuditLog Model

**Tracked Actions:**
- `create` - New record created
- `update` - Record modified
- `delete` - Record deleted
- `login` - User logged in
- `logout` - User logged out
- `view` - Sensitive resource accessed

**Severity Levels:**
- `low` - Non-critical operations
- `medium` - Normal operations
- `high` - Data changes
- `critical` - Security events (login, deletions)

**Usage:**
```javascript
// Query supervisor changes
const supervisorChanges = await AuditLog.findAll({
  where: {
    entity_type: 'Application',
    action: 'update'
  }
});

// Track security events
const securityEvents = await AuditLog.findAll({
  where: {
    severity: { [Op.in]: ['high', 'critical'] }
  }
});
```

### Notification Model

**Notification Types:**
- `application_received` - Company got application
- `application_accepted` - Student got accepted
- `application_rejected` - Student got rejected
- `posting_match_found` - New matching posting
- `profile_viewed` - Company viewed profile

**Usage:**
```javascript
// Get unread notifications for user
const unread = await Notification.findAll({
  where: {
    user_id: userId,
    is_read: false
  }
});

// Mark as read
await notification.update({ is_read: true, read_at: new Date() });
```

---

## 🔑 PasswordResetToken Model

**File:** `src/models/PasswordResetToken.js`  
**Purpose:** Secure password reset process

**Usage:**
```javascript
// Create reset token
const resetToken = await PasswordResetToken.create({
  userId: user.id,
  token: generateSecureToken(),
  expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
});

// Verify token
const token = await PasswordResetToken.findOne({
  where: {
    token: submittedToken,
    userId: user.id,
    expiresAt: { [Op.gt]: new Date() } // Not expired
  }
});

if (token) {
  // Token valid, allow password reset
  await user.update({ password: newPassword });
  await token.destroy(); // Delete used token
}
```

---

## 👨‍💼 Coordinator Model

**File:** `src/models/Coordinator.js`  
**Purpose:** Faculty/staff profile managing OJT program

**Fields:**
- `department` - Academic department
- `max_students` - Maximum students they can manage
- `students_managed` - Current count

---

## 📊 OjtProgress Model

**File:** `src/models/Matching.js`  
**Purpose:** Track student progress during OJT

**Fields:**
- `week_number` - Which week of OJT
- `progress_percentage` - 0-100
- `status` - on_track, needs_support, falling_behind
- `supervisor_notes` - Feedback from company
- `student_feedback` - Student's feedback

---

## 📄 Resume Model

**Purpose:** Store student resume documents

**Fields:**
- `resume_url` - S3/storage URL
- `file_name` - Original filename
- `file_size` - Bytes
- `is_default` - Use for auto-application

---

## 🔗 Relationships Reference

### One-to-Many Relationships

```javascript
// Parent.hasMany(Child)
User.hasMany(PasswordResetToken);
Student.hasMany(StudentSkill);
Student.hasMany(Application);
Company.hasMany(OjtPosting);
OjtPosting.hasMany(PostingSkill);
OjtPosting.hasMany(Application);
```

### One-to-One Relationships

```javascript
// User.hasOne(Profile)
User.hasOne(Student);
User.hasOne(Company);
User.hasOne(Coordinator);
```

### Many-to-Many (Through Join Table)

```javascript
// Student ←StudentSkill→ (implicit Skill)
// OjtPosting ←PostingSkill→ (implicit Skill)
// Student ←MatchScore→ OjtPosting
```

### Instance Relationships

After associations defined, access like:

```javascript
// Get student's skills
const student = await Student.findOne({
  include: ['skills'] // Includes studentSkills
});

student.skills.forEach(skill => console.log(skill.skill_name));

// Get posting's applications
const posting = await OjtPosting.findOne({
  include: ['applications']
});
```

---

## 🛡️ Data Protection

### Password Hashing

**NEVER store plaintext passwords:**

```javascript
// ❌ WRONG
user.password = 'SecurePass123!';

// ✅ RIGHT - Automatically hashed by beforeCreate hook
user = await User.create({ password: 'SecurePass123!' });
```

### Email Normalization

```javascript
// All emails normalized to lowercase
const user1 = await User.create({ email: 'JOHN@EXAMPLE.COM' });
const user2 = await User.findByEmail('john@example.com');
// user1.id === user2.id ✓
```

### Soft Deletes

```javascript
// Delete (soft)
await user.destroy();
// Sets deletedAt timestamp, user still in DB

// Query excludes soft deleted by default
const users = await User.findAll();
// Returns only users where deletedAt IS NULL

// Include soft deleted
const users = await User.findAll({ paranoid: false });

// Hard delete (permanent)
await user.destroy({ force: true });
```

---

## 📚 Model Validation

### Email Validation
```javascript
// Auto-validated by Sequelize
email: {
  isEmail: true,  // RFC 5322 validation
  unique: true    // Cannot duplicate
}
```

### Enum Validation
```javascript
// Only accepts these values
role: {
  type: ENUM('student', 'company', 'coordinator', 'admin'),
  validate: {
    isIn: [['student', 'company', 'coordinator', 'admin']]
  }
}
```

### Numeric Validation
```javascript
gpa: {
  min: 0,
  max: 4.0
}
```

---

## 💾 Model Lifecycle

### Create (INSERT)

```javascript
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'SecurePass123!',
  role: 'student'
});
// Triggers beforeCreate hook (password hashing)
// Sets createdAt, updatedAt to current timestamp
// Returns created model instance
```

### Read (SELECT)

```javascript
// Find by primary key
const user = await User.findByPk(1);

// Find by custom attribute
const user = await User.findOne({ where: { email: 'john@example.com' } });

// Find multiple
const users = await User.findAll({ where: { role: 'student' } });

// With relationships
const student = await Student.findOne({
  where: { user_id: 1 },
  include: ['skills', 'applications']
});
```

### Update (UPDATE)

```javascript
const user = await User.findByPk(1);
user.name = 'Jane Doe';
await user.save();
// Triggers beforeUpdate hook if password changed
// Updates updatedAt timestamp
```

### Delete (DELETE - Soft)

```javascript
await user.destroy();
// Sets deletedAt timestamp
// User still in database, just marked deleted
```

---

**Next:** See [**05-SERVICES.md**](./05-SERVICES.md) for service layer documentation.
