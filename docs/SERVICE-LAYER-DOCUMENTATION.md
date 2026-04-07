# OJT System V2 - Service Layer & Business Logic Documentation

**Version:** 2.0  
**Framework:** Laravel 12.x Services  
**Pattern:** Service Layer Pattern with Dependency Injection

---

## Table of Contents
1. [Service Layer Overview](#service-layer-overview)
2. [MatchingService](#matchingservice)
3. [NotificationService](#notificationservice)
4. [AuditService](#auditservice)
5. [ReportService](#reportservice)
6. [Service Integration Examples](#service-integration-examples)

---

## Service Layer Overview

### Purpose

The Service Layer encapsulates **complex business logic** and **domain operations**, keeping controllers lightweight and promoting code reusability.

### Architecture

```
Controller
    ↓ (depends on)
Service (encapsulates business logic)
    ↓ (uses)
Models (data access via Eloquent)
    ↓ (persists to)
Database
```

### Service Pattern Benefits

✅ **Separation of Concerns** - Business logic separate from HTTP handling  
✅ **Reusability** - Services used by multiple controllers/jobs  
✅ **Testability** - Can mock services in unit tests  
✅ **Maintainability** - Centralized business logic  
✅ **Single Responsibility** - Each service handles one domain  

---

## MatchingService

### Purpose

Implements the intelligent job matching algorithm that calculates compatibility scores between students and job postings based on skills, location, and availability.

### Location

`app/Services/MatchingService.php`

### Class Definition

```php
namespace App\Services;

class MatchingService
{
    /**
     * Calculate match scores for student against all active postings
     * 
     * @param Student $student
     * @return void
     */
    public function calculateForStudent(Student $student): void;

    /**
     * Calculate single match score between student and posting
     * 
     * @param Student $student
     * @param OjtPosting $posting
     * @return MatchScore
     */
    public function calculateScore(Student $student, OjtPosting $posting): MatchScore;
}
```

### Algorithm Explanation

#### 1. Skill Score (0-100%)

**Logic:**
```
Required Skills = Posting.skills where is_required = true
Student Skills = Student.skills.skill_name

Matched Count = count(student skills ∩ required skills)
Total Required = count(required skills)

Skill Score = (Matched Count / Total Required) × 100
```

**Examples:**

```
Scenario A:
Posting requires: [Java, Python, SQL]
Student has: [Java, Python, Go]
Matched: 2/3 = 67%

Scenario B:
Posting requires: [Java]
Student has: [Java, Python, SQL, C++]
Matched: 1/1 = 100%

Scenario C:
Posting requires: [Docker, Kubernetes, AWS]
Student has: [Java, Python]
Matched: 0/3 = 0%

Scenario D:
Posting has NO required skills
Default: 100% (no restrictions)
```

**Implementation:**

```php
private function computeSkillScore(array $studentSkills, OjtPosting $posting): int
{
    $requiredSkills = $posting->skills
        ->where('is_required', true)
        ->pluck('skill_name')
        ->map(fn ($s) => strtolower(trim($s)))
        ->toArray();

    // No requirements = full match
    if (empty($requiredSkills)) {
        return 100;
    }

    // Case-insensitive comparison
    $matched = count(array_intersect($studentSkills, $requiredSkills));
    
    return (int) round(($matched / count($requiredSkills)) * 100);
}
```

---

#### 2. Location Score (0-100%)

**Logic:**
```
If student preference AND posting location exist:
  ├─ Exact match (case-insensitive): 100 points
  ├─ Partial match (e.g., same city): 50 points
  └─ No match: 0 points

If EITHER preference OR posting location missing:
  └─ Neutral score: 50 (no data penalty)
```

**Examples:**

```
Scenario A: Exact Match
Student prefers: "Metro Manila"
Posting location: "Metro Manila"
Score: 100%

Scenario B: Partial Match (future enhancement)
Student prefers: "Metro Manila"
Posting location: "Laguna" (same region)
Score: 50%

Scenario C: Mismatch
Student prefers: "Cebu"
Posting location: "Metro Manila"
Score: 0%

Scenario D: No Preference Set
Student preference: NULL or empty
Score: 50% (neutral, neither helps nor hurts)
```

**Implementation:**

```php
private function computeLocationScore($preferences, OjtPosting $posting): int
{
    // Missing data = neutral score
    if (!$preferences || !$preferences->preferred_location || !$posting->location) {
        return 50;
    }

    $preferred = strtolower(trim($preferences->preferred_location));
    $postingLocation = strtolower(trim($posting->location));

    if ($preferred === $postingLocation) {
        return 100; // Exact match
    }

    // Could add proximity matching here in future
    // return $this->calculateProximity($preferred, $postingLocation);

    return 0; // No match
}
```

---

#### 3. Availability Score (0-100%)

**Logic:**
```
Student availability: available_from to available_until
Posting duration: start_date to (start_date + duration)

if overlap exists AND schedule aligns:
  └─ Score based on overlap percentage
else
  └─ Score based on compatibility
```

**Examples:**

```
Scenario A: Full Overlap
Student available: 2026-05-01 to 2026-08-31 (4 months)
Posting period: 2026-06-01 to 2026-08-31 (3 months)
Overlap: 3 months / 3 months = 100%

Scenario B: Partial Overlap
Student available: 2026-05-01 to 2026-07-31 (3 months)
Posting period: 2026-06-01 to 2026-08-31 (3 months)
Overlap: 2 months / 3 months = 67%

Scenario C: No Overlap
Student available: 2026-05-01 to 2026-05-31
Posting period: 2026-06-01 to 2026-08-31
Score: 0%

Scenario D: No Availability Set
Student availability: NULL
Score: 50% (neutral)
```

**Implementation:**

```php
private function computeAvailabilityScore($availability, OjtPosting $posting): int
{
    // Missing data = neutral
    if (!$availability || !$posting->duration) {
        return 50;
    }

    $availFrom = Carbon::parse($availability->available_from);
    $availUntil = Carbon::parse($availability->available_until);
    
    // For now: if available window covers posting duration
    // Advanced: could check weekly schedule alignment
    
    $durationMonths = (int) preg_match_all('/\d+/', $posting->duration);
    $availableMonths = $availFrom->diffInMonths($availUntil);
    
    if ($availableMonths >= $durationMonths) {
        return 100; // Fully available
    }
    
    $overlapPercentage = ($availableMonths / $durationMonths) * 100;
    return (int) round(min($overlapPercentage, 100));
}
```

---

#### 4. Composite Score (0-100%)

**Formula:**
```
Total Score = (
    Skill Score × Skill Weight +
    Location Score × Location Weight +
    Availability Score × Availability Weight
) / 100

Constraint: All weights must sum to 100%
```

**Examples:**

```
Example 1: Balanced Weights
Weights: Skills 50%, Location 30%, Availability 20%
Scores: Skill 80, Location 100, Availability 50

Total = (80×0.50 + 100×0.30 + 50×0.20) / 100
      = (40 + 30 + 10) / 100
      = 80 / 100
      = 80%

Example 2: Skills-Focused
Weights: Skills 70%, Location 20%, Availability 10%
Scores: Skill 60, Location 100, Availability 80

Total = (60×0.70 + 100×0.20 + 80×0.10) / 100
      = (42 + 20 + 8) / 100
      = 70 / 100
      = 70%

Example 3: Low Skill Match
Weights: Skills 50%, Location 30%, Availability 20%
Scores: Skill 20, Location 100, Availability 100

Total = (20×0.50 + 100×0.30 + 100×0.20) / 100
      = (10 + 30 + 20) / 100
      = 60 / 100
      = 60%
```

**Implementation:**

```php
public function calculateForStudent(Student $student): void
{
    $rules = $this->getActiveRules();
    $postings = OjtPosting::where('status', 'active')
        ->with('skills')
        ->get();

    $studentSkills = $student->skills->pluck('skill_name')
        ->map(fn ($s) => strtolower(trim($s)))
        ->toArray();

    $preferences = $student->preferences;
    $availability = $student->availability;

    foreach ($postings as $posting) {
        // Calculate component scores
        $skillScore = $this->computeSkillScore($studentSkills, $posting);
        $locationScore = $this->computeLocationScore($preferences, $posting);
        $availabilityScore = $this->computeAvailabilityScore($availability, $posting);

        // Apply weights
        $total = (int) round(
            ($skillScore * $rules['skill_weight']
            + $locationScore * $rules['location_weight']
            + $availabilityScore * $rules['availability_weight']) / 100
        );

        // Persist result
        MatchScore::updateOrCreate(
            [
                'student_id' => $student->id,
                'ojt_posting_id' => $posting->id,
            ],
            [
                'skill_score' => $skillScore,
                'location_score' => $locationScore,
                'availability_score' => $availabilityScore,
                'total_score' => $total,
            ]
        );
    }
}
```

### Usage in Controllers

```php
// In StudentController when profile is updated
public function updateSkills(Request $request)
{
    $student = $request->user()->student;
    
    // Update skills...
    $student->skills()->sync($validated['skills']);
    
    // Recalculate matches
    app(MatchingService::class)->calculateForStudent($student);
    
    return response()->json(['message' => 'Skills updated.']);
}
```

---

## NotificationService

### Purpose

Creates and manages in-app notifications for users about important actions and events.

### Location

`app/Services/NotificationService.php`

### Class Definition

```php
namespace App\Services;

class NotificationService
{
    /**
     * Send notification to single user
     * 
     * @param int $userId
     * @param string $title
     * @param string $message
     * @param string $type (info|success|warning|error)
     * @param string|null $link
     * @return Notification
     */
    public function send(
        int $userId,
        string $title,
        string $message,
        string $type = 'info',
        ?string $link = null
    ): Notification;

    /**
     * Send notification to multiple users efficiently
     * 
     * @param array $userIds
     * @param string $title
     * @param string $message
     * @param string $type
     * @param string|null $link
     * @return void
     */
    public function sendToMany(
        array $userIds,
        string $title,
        string $message,
        string $type = 'info',
        ?string $link = null
    ): void;
}
```

### Notification Types

**Type: info** - Informational updates
```
Example: "You have been matched with 3 new jobs"
Action: Notify student of recommendations
```

**Type: success** - Positive outcomes
```
Example: "Your application has been accepted!"
Action: Acceptance notification to student
```

**Type: warning** - Important warnings
```
Example: "Your OJT ends in 7 days"
Action: Reminder to submit completion
```

**Type: error** - Problem alerts
```
Example: "Your resume upload failed"
Action: Error notification with guidance
```

### Implementation Details

**Single Send:**
```php
public function send(
    int $userId,
    string $title,
    string $message,
    string $type = 'info',
    ?string $link = null
): Notification {
    return Notification::create([
        'user_id' => $userId,
        'title' => $title,
        'message' => $message,
        'type' => $type,
        'link' => $link,
    ]);
}
```

**Bulk Send (Optimized):**
```php
public function sendToMany(
    array $userIds,
    string $title,
    string $message,
    string $type = 'info',
    ?string $link = null
): void {
    // Prepare records
    $records = array_map(fn ($userId) => [
        'user_id' => $userId,
        'title' => $title,
        'message' => $message,
        'type' => $type,
        'link' => $link,
        'created_at' => now(),
        'updated_at' => now(),
    ], $userIds);

    // Single bulk insert (faster than individual inserts)
    Notification::insert($records);
}
```

### Usage in Controllers

```php
// When student applies for job
public function store(StoreApplicationRequest $request)
{
    $application = Application::create($validated);
    
    // Notify company
    $this->notificationService->send(
        $application->ojtPosting->company->user_id,
        'New Application',
        "Student {$student->first_name} applied to {$posting->title}",
        'info',
        "/applications/{$application->id}"
    );
    
    return response()->json($application, 201);
}

// Bulk notification: recommend jobs to all matched students
public function recommendJobs()
{
    $posting = OjtPosting::find(5);
    $topMatches = MatchScore::where('ojt_posting_id', 5)
        ->orderByDesc('total_score')
        ->limit(10)
        ->pluck('user_id')
        ->toArray();
    
    $this->notificationService->sendToMany(
        $topMatches,
        'Job Recommendation',
        "We found a great job match for you!",
        'success'
    );
}
```

---

## AuditService

### Purpose

Records audit trail entries for compliance, security monitoring, and forensic investigations.

### Location

`app/Services/AuditService.php`

### Class Definition

```php
namespace App\Services;

class AuditService
{
    /**
     * Log an action for audit trail
     * 
     * @param string $action (create, update, delete, login, etc.)
     * @param string|null $entityType (model name)
     * @param int|null $entityId (record ID)
     * @param array|null $oldValues (before state)
     * @param array|null $newValues (after state)
     * @return AuditLog
     */
    public function log(
        string $action,
        ?string $entityType = null,
        ?int $entityId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
    ): AuditLog;
}
```

### What Gets Audited

**Critical Actions:**
- User login/logout
- User creation/deletion
- Password changes
- Account suspensions
- Application submissions
- Application status changes
- Resume uploads
- Profile updates
- Admin configuration changes

**Audit Data Captured:**
```
- user_id: WHO performed the action
- action: WHAT action (create, update, delete, etc.)
- entity_type: ON WHAT entity (Application, User, etc.)
- entity_id: WHICH specific record
- old_values: WHAT changed FROM
- new_values: WHAT changed TO
- ip_address: WHERE from (security)
- created_at: WHEN it happened
```

### Implementation

```php
public function log(
    string $action,
    ?string $entityType = null,
    ?int $entityId = null,
    ?array $oldValues = null,
    ?array $newValues = null,
): AuditLog {
    return AuditLog::create([
        'user_id' => Auth::id(), // Current authenticated user
        'action' => $action,
        'entity_type' => $entityType,
        'entity_id' => $entityId,
        'old_values' => $oldValues,
        'new_values' => $newValues,
        'ip_address' => Request::ip(),
    ]);
}
```

### Usage Patterns

**Create Action:**
```php
public function store(RegisterRequest $request)
{
    $user = User::create($validated);
    
    // Log creation
    $this->auditService->log(
        action: 'create',
        entityType: 'User',
        entityId: $user->id,
        oldValues: null,
        newValues: $user->toArray()
    );
    
    return response()->json($user, 201);
}
```

**Update Action:**
```php
public function update(Request $request)
{
    $student = $request->user()->student;
    $before = $student->toArray();
    
    $student->update($validated);
    $after = $student->toArray();
    
    // Log only changed fields
    $changes = array_diff_assoc($after, $before);
    
    $this->auditService->log(
        action: 'update',
        entityType: 'Student',
        entityId: $student->id,
        oldValues: array_intersect_key($before, $changes),
        newValues: array_intersect_key($after, $changes)
    );
}
```

### Audit Query Examples

```php
// Find all actions by user
$userActions = AuditLog::where('user_id', 5)->get();

// Track changes to application
$appChanges = AuditLog::where('entity_type', 'Application')
    ->where('entity_id', 42)
    ->orderByDesc('created_at')
    ->get();

// Find suspicious activity
$failedLogins = AuditLog::where('action', 'failed_login')
    ->where('ip_address', '192.168.1.100')
    ->whereBetween('created_at', [now()->subHours(24), now()])
    ->get();
```

---

## ReportService

### Purpose

Generates analytics and reports for stakeholders (companies, coordinators, admins).

### Location

`app/Services/ReportService.php`

### Planned Capabilities

**For Companies:**
- Applications received (count, trends)
- Acceptance rates
- Candidate demographics
- Skill distribution among applicants

**For Coordinators:**
- Student OJT completion status
- Hours logged vs. required
- Problem cases needing attention

**For Admins:**
- System-wide statistics
- User growth trends
- Matching algorithm effectiveness
- Platform usage metrics

### Example Usage

```php
// In CompanyReportController
public function getApplicationStats(Request $request)
{
    $company = $request->user()->company;
    $stats = $this->reportService->getCompanyApplicationStats($company);
    
    return response()->json($stats);
}
```

---

## Service Integration Examples

### Example 1: Complete Application Submission Flow

```php
// ApplicationController@store
public function store(StoreApplicationRequest $request)
{
    $student = $request->user()->student;
    $data = $request->validated();
    
    $posting = OjtPosting::findOrFail($data['ojt_posting_id']);
    
    // Validate posting
    if ($posting->status !== 'active' || !$posting->hasAvailableSlots()) {
        return response()->json(['message' => 'Posting closed.'], 422);
    }
    
    // Check for duplicates
    $exists = Application::where('student_id', $student->id)
        ->where('ojt_posting_id', $posting->id)
        ->exists();
    
    if ($exists) {
        return response()->json(['message' => 'Already applied.'], 422);
    }
    
    // Create application
    $application = Application::create([
        'student_id' => $student->id,
        'ojt_posting_id' => $posting->id,
        'resume_id' => $data['resume_id'] ?? $student->activeResume?->id,
        'status' => 'pending',
        'cover_letter' => $data['cover_letter'] ?? null,
    ]);
    
    // Service: Send notification to company
    $this->notificationService->send(
        $posting->company->user_id,
        'New Application',
        "A student applied to {$posting->title}",
        'info',
        "/applications/{$application->id}"
    );
    
    // Service: Log audit trail
    $this->auditService->log(
        'create',
        'Application',
        $application->id,
        null,
        $application->toArray()
    );
    
    // Service: Recalculate matching scores
    $this->matchingService->calculateForStudent($student);
    
    return response()->json(['message' => 'Applied!', 'data' => $application], 201);
}
```

### Example 2: Application Acceptance with Progress Creation

```php
// CompanyPostingController@acceptApplication
public function acceptApplication(Request $request, $applicationId)
{
    $application = Application::findOrFail($applicationId);
    $company = $request->user()->company;
    
    // Authorization
    if ($application->ojtPosting->company_id !== $company->id) {
        return response()->json(['message' => 'Unauthorized.'], 403);
    }
    
    // Update application status
    $before = $application->toArray();
    $application->update(['status' => 'accepted']);
    
    // Create OJT progress
    OjtProgress::create([
        'application_id' => $application->id,
        'student_id' => $application->student_id,
        'hours_required' => 160, // Default requirement
        'status' => 'in_progress',
    ]);
    
    // Service: Notify student
    $this->notificationService->send(
        $application->student->user_id,
        'Application Accepted!',
        'Congratulations! You have been accepted for the OJT position.',
        'success',
        "/applications/{$application->id}"
    );
    
    // Service: Audit log
    $this->auditService->log(
        'update',
        'Application',
        $application->id,
        ['status' => $before['status']],
        ['status' => 'accepted']
    );
    
    return response()->json(['message' => 'Application accepted.']);
}
```

---

## Summary

The Service Layer provides:

✅ **Encapsulated Business Logic** - Centralized, reusable code  
✅ **Dependency Injection** - Loose coupling between components  
✅ **Audit Trail** - Complete compliance and forensics  
✅ **Intelligent Matching** - Configurable algorithm with transparency  
✅ **User Communication** - Reliable notification system  
✅ **Analytics** - Data-driven insights for stakeholders  

This architecture enables **professional-grade operations** with **clear business logic**, **maintainability**, and **compliance**.
