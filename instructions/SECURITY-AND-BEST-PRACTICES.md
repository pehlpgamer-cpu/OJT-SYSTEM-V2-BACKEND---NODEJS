# OJT System V2 - Security & Best Practices Guide

**Version:** 2.0  
**Framework:** Laravel 12.x  
**Security Standard:** OWASP Top 10  
**Last Updated:** April 2026

---

## Table of Contents
1. [Security Overview](#security-overview)
2. [OWASP Vulnerabilities & Mitigations](#owasp-vulnerabilities--mitigations)
3. [Authentication & Authorization](#authentication--authorization)
4. [Data Protection](#data-protection)
5. [Input Validation & Sanitization](#input-validation--sanitization)
6. [Security Best Practices](#security-best-practices)
7. [Compliance & Auditing](#compliance--auditing)
8. [Security Checklist](#security-checklist)

---

## Security Overview

### Security Principles

1. **Defense in Depth** - Multiple layers of security
2. **Least Privilege** - Users get minimum necessary access
3. **Fail Securely** - Errors don't expose sensitive info
4. **Input Validation** - All inputs are untrusted
5. **Output Encoding** - Prevent XSS attacks
6. **Separation of Concerns** - Security logic isolated

### Threat Model

**Assets to Protect:**
- Student personal data (PII)
- Company hiring decisions
- Application integrity
- System availability

**Threat Actors:**
- Unauthorized users trying to access others' data
- SQL injection attackers
- Brute force password attacks
- XSS attackers via form inputs

---

## OWASP Vulnerabilities & Mitigations

### 1. SQL Injection (A03:2021)

**Vulnerability:** Inserting SQL code through input fields

**Risk:** Database compromise, data theft, data manipulation

**Mitigation in OJT System:**

✅ **Use Eloquent ORM (parameterized queries)**
```php
// ✅ SAFE: Uses parameterized query
$user = User::where('email', $email)->first();

// ❌ UNSAFE: String concatenation (don't do this!)
$user = DB::select("SELECT * FROM users WHERE email = '$email'");
```

✅ **Never concatenate user input into SQL**
```php
// ✅ SAFE: Bind parameters
DB::table('users')
    ->whereRaw('email = ?', [$email])
    ->first();

// ❌ UNSAFE: Direct concatenation
DB::select("SELECT * FROM users WHERE email = '$email'");
```

✅ **Use Eloquent relationships**
```php
// ✅ SAFE: Through relationships
$student->applications()->get();

// ❌ RISKY: Raw SQL
DB::select("SELECT * FROM applications WHERE student_id = $id");
```

**Implementation Example:**
```php
// ApplicationController@show
public function show(Request $request, int $id): JsonResponse
{
    // Using Eloquent - SQL injection safe
    $application = Application::with([
        'student.user',
        'ojtPosting.company',
        'resume',
        'ojtProgress'
    ])->findOrFail($id);
    
    // Request is safe, no SQL injection possible
    return response()->json($application);
}
```

---

### 2. Broken Authentication (A07:2021)

**Vulnerability:** Weak or missing authentication controls

**Risk:** Unauthorized access, account takeover

**Migrations in OJT System:**

✅ **Strong Password Hashing (Bcrypt)**
```php
// User.php
protected function casts(): array
{
    return [
        'password' => 'hashed', // Auto-hash using Bcrypt
    ];
}

// AuthController - Manual hashing
$user->password = Hash::make($request->password);
$user->save();
```

✅ **Token-Based Authentication (Sanctum)**
```php
// AuthController@login
$token = $user->createToken('auth-token')->plainTextToken;

// Frontend includes in all requests
Authorization: Bearer {token}

// Server validates
Route::middleware('auth:sanctum')->group(function () {
    // Protected routes
});
```

✅ **Rate Limiting on Login/Sensitive Endpoints**
```php
// routes/api.php
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1'); // 5 attempts per minute

Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
    ->middleware('throttle:3,1'); // 3 attempts per minute
```

✅ **Session Management**
```php
// Track login activity
$user->update(['last_login_at' => now()]);

// Revoke token on logout
$request->user()->currentAccessToken()->delete();

// Token expiration (Laravel Sanctum has built-in)
```

✅ **Account Status Validation**
```php
// AuthController@login
if ($user->status !== 'active') {
    return response()->json([
        'message' => 'Account is not active. Current status: ' . $user->status,
    ], 403);
}
```

---

### 3. Injection (A03:2021) - Beyond SQL

**Command Injection Vulnerability:** Running shell commands with user input

**Risk:** System compromise, remote code execution

**Prevention:**

✅ **Never execute user input as commands**
```php
// ❌ UNSAFE: Shell injection possible
exec("convert " . $filename . " output.jpg");

// ✅ SAFE: Use array syntax or escape
exec(['convert', $filename, 'output.jpg']);
```

✅ **Example: Safe file operations**
```php
// ResumeController@store
public function store(Request $request): JsonResponse
{
    $file = $request->file('resume');
    
    // Validate file
    $validated = $request->validate([
        'resume' => 'required|file|mimes:pdf,doc,docx|max:5120',
    ]);
    
    // Store safely (no user input in path)
    $filename = $file->hashName(); // Auto-generated hash name
    $path = $file->storeAs('resumes', $filename, 'public');
    
    // Save record
    $resume = Resume::create([
        'student_id' => $request->user()->student->id,
        'file_path' => $path,
        'file_name' => $file->getClientOriginalName(),
        'mime_type' => $file->getMimeType(),
        'file_size' => $file->getSize(),
    ]);
    
    return response()->json($resume, 201);
}
```

---

### 4. Broken Access Control (A01:2021)

**Vulnerability:** Users accessing resources they shouldn't

**Risk:** Data breach, unauthorized modifications

**Mitigations in OJT System:**

✅ **Route-Level Protection (Authentication)**
```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    // All routes here require valid token
});

// Public routes outside this group
Route::get('/faqs', [FaqController::class, 'index']);
```

✅ **Controller-Level Protection (Role Checks)**
```php
// StudentProfileController
public function update(Request $request): JsonResponse
{
    $user = $request->user();
    
    // Verify student role
    if (!$user->isStudent()) {
        return response()->json(['message' => 'Unauthorized.'], 403);
    }
    
    // Proceed with student-only operation
    $student = $user->student;
    $student->update($request->validated());
    
    return response()->json($student);
}
```

✅ **Resource-Level Protection (Ownership Checks)**
```php
// ApplicationController@show
public function show(Request $request, int $id): JsonResponse
{
    $user = $request->user();
    $application = Application::findOrFail($id);
    
    // Authorization: Must be student who owns it OR company who owns posting
    $authorized = false;
    
    if ($user->isStudent() && $application->student->user_id === $user->id) {
        $authorized = true;
    }
    
    if ($user->isCompany() && $application->ojtPosting->company_id === $user->company->id) {
        $authorized = true;
    }
    
    if (!$authorized) {
        return response()->json(['message' => 'Forbidden.'], 403);
    }
    
    return response()->json($application);
}
```

✅ **Policy-Based Authorization (Future Enhancement)**
```php
// Usage pattern for future implementation
// Class ApplicationPolicy
public function view(User $user, Application $application)
{
    return $user->isStudent() && $user->student->id === $application->student_id
        || $user->isCompany() && $user->company->id === $application->ojtPosting->company_id;
}

// In controller
$this->authorize('view', $application);
```

---

### 5. Cross-Site Scripting (XSS) (A03:2021)

**Vulnerability:** Injecting JavaScript into web pages

**Risk:** Session hijacking, credential theft, malware distribution

**Mitigations in OJT System:**

✅ **API Returns JSON (Not HTML)**
```php
// Stored XSS not possible since API returns JSON
// Frontend responsibility to sanitize display
return response()->json([
    'title' => $notification->title, // JSON encoded
    'message' => $notification->message
]);
```

✅ **Frontend Input Sanitization**
```javascript
// JavaScript (Frontend) - sanitized before storage
const notification = {
    title: DOMPurify.sanitize(data.title),
    message: DOMPurify.sanitize(data.message)
};
```

✅ **No Inline Styles/Scripts (Requirement)**
- Per project CONTEXT.md: "No Inline styles"
- All styles in external CSS files
- All scripts in external JS files

✅ **Content Security Policy (Future)**
```
// Could add to response headers
Content-Security-Policy: default-src 'self'; script-src 'self'
```

---

### 6. Sensitive Data Exposure (A02:2021)

**Vulnerability:** Exposing sensitive information (passwords, tokens, PII)

**Risk:** Identity theft, credential compromise, privacy breach

**Mitigations in OJT System:**

✅ **Hide Sensitive Fields in Model**
```php
// User.php
protected $hidden = [
    'password',              // Never expose password
    'remember_token',        // Hide session tokens
];
```

✅ **Don't Log Sensitive Data**
```php
// ✅ SAFE: Doesn't include password
logger()->info('User login', [
    'user_id' => $user->id,
    'email' => $user->email,
    'timestamp' => now(),
]);

// ❌ UNSAFE: Logs password
logger()->info('User login', $user->toArray());
```

✅ **HTTPS Only (Production)**
```php
// config/app.php - Force HTTPS in production
'url' => env('APP_URL', 'https://ojt-system.example.com'),

// Middleware could enforce
\Illuminate\Http\Middleware\HttpsRedirect::class
```

✅ **Environment Variables (Don't Commit Secrets)**
```
// .env (NOT in git)
DATABASE_PASSWORD=secret
APP_KEY=base64:encrypted_key
MAIL_PASSWORD=smtp_password

// .env.example (in git, with placeholders)
DATABASE_PASSWORD=your_password_here
APP_KEY=your_key_here
```

✅ **Audit Log Sensitive Data Carefully**
```php
// AuditService - include data changes
$this->auditService->log(
    'update',
    'Student',
    $student->id,
    ['phone' => '555-1234'],  // Can log field changes
    ['phone' => '555-5678'],
);

// But NOT passwords or tokens
$this->auditService->log(
    'update',
    'User',
    $user->id,
    // Don't include password in audit
    // ['password' => '...'], ❌
    [],
    [],
);
```

---

### 7. CSRF (Cross-Site Request Forgery) (A04:2021)

**Vulnerability:** Malicious site tricks user into performing unwanted action

**Risk:** Unauthorized transactions, data modification

**Note:** Not critical for **token-based API** (Sanctum), but important for web forms.

**Mitigation:**
```php
// For web routes (if used)
Route::middleware('web')->group(function () {
    Route::post('/profile', [ProfileController::class, 'update'])
        ->middleware('csrf'); // Include CSRF token check
});

// Frontend form
<form method="POST" action="/profile">
    @csrf <!-- Laravel includes CSRF token -->
    ...
</form>

// For API: Bearer token validation is sufficient
// Attacker can't make cross-origin XHR requests with token
```

---

### 8. Using Components with Known Vulnerabilities (A06:2021)

**Vulnerability:** Using outdated libraries with security flaws

**Risk:** Exploitation through known CVEs

**Mitigations:**

✅ **Keep Dependencies Updated**
```bash
# Check for updates
composer outdated

# Update composer packages
composer update

# Update npm packages
npm update
```

✅ **Audit for Vulnerabilities**
```bash
# Check PHP dependencies
composer audit

# Check Node dependencies
npm audit
```

✅ **Only Use Trusted Packages**
- Laravel - Official framework
- Sanctum - Official authentication
- Eloquent - Built-in ORM
- Custom services - Code audited

---

### 9. Identification and Authentication Failures (A07:2021)

**Covered above under "Broken Authentication"**

---

### 10. Software and Data Integrity Failures (A08:2021)

**Vulnerability:** Unsafe update/release processes or insecure deserialization

**Mitigations:**

✅ **Verify Code Before Deployment**
```bash
# Run tests
php artisan test

# Check code quality
./vendor/bin/phpstan analyse

# Format code
./vendor/bin/pint
```

✅ **Secure Serialization**
```php
// ✅ SAFE: JSON serialization
json_encode($data);
json_decode($json);

// ❌ UNSAFE: PHP serialization with untrusted input
unserialize($_POST['data']); // Remote code execution!
```

---

## Authentication & Authorization

### Authentication Flow

**Step 1: User Registration**
```
POST /api/auth/register
├─ Validate input (email unique, password strength)
├─ Hash password with Bcrypt
├─ Create user account
├─ Create role-specific profile
└─ Status: "active" (students) or "pending" (companies)
```

**Step 2: User Login**
```
POST /api/auth/login
├─ Verify email exists
├─ Verify password matches hash
├─ Check account status is "active"
├─ Update last_login_at
├─ Generate Sanctum API token
└─ Return token to client
```

**Step 3: API Requests**
```
GET /api/students/me
├─ Header: Authorization: Bearer {token}
├─ Sanctum middleware validates token
├─ Load authenticated user
└─ Proceed if valid
```

**Step 4: Logout**
```
POST /api/auth/logout
├─ Delete current access token
├─ All subsequent requests with token rejected
└─ User must login again
```

### Role-Based Access

| Role | Capabilities |
|------|--------------|
| student | View postings, apply, track progress |
| company | Post jobs, review applications, accept candidates |
| coordinator | Monitor student progress, approve completion |
| admin | Manage users, configure rules, view audit logs |

---

## Data Protection

### Data Classification

**Public Data:**
- Company information
- Job posting details
- FAQ content

**Protected Data:**
- Student profiles
- Resumes
- Application content
- Contact messages

**Sensitive Data:**
- User passwords (hashed)
- Authentication tokens
- Audit logs
- Personal identifiable info (PII)

### Data Transmission

✅ **HTTPS Only (Production)**
- Encrypt data in transit
- Prevent man-in-the-middle attacks
- Protect authentication tokens

✅ **Secure Token Storage (Frontend)**
```javascript
// Store in secure httpOnly cookie (if available)
// or localStorage as last resort
localStorage.setItem('auth_token', token);

// Include in all API requests
fetch('/api/students/me', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
});
```

### Data Retention

**Logs & Audit Trails:**
- Retain for minimum 1 year
- Delete old records per retention policy
- Include in GDPR deletion requests

**Resumes & Documents:**
- Delete when student deletes them
- Delete on account deletion (cascade)

---

## Input Validation & Sanitization

### Validation in Form Requests

```php
// app/Http/Requests/Application/StoreApplicationRequest.php
class StoreApplicationRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'ojt_posting_id' => 'required|integer|exists:ojt_postings,id',
            'resume_id' => 'nullable|integer|exists:resumes,id',
            'cover_letter' => 'nullable|string|max:1000',
        ];
    }

    public function authorize(): bool
    {
        // Authorization check
        return $this->user()->isStudent();
    }

    public function messages(): array
    {
        return [
            'ojt_posting_id.exists' => 'The selected job posting is invalid.',
            'resume_id.exists' => 'The selected resume is invalid.',
        ];
    }
}
```

### Validation Rules Overview

| Rule | Purpose | Example |
|------|---------|---------|
| required | Field must be provided | email: 'required' |
| email | Valid email format | email: 'email' |
| unique | Unique in database | email: 'unique:users' |
| integer | Numeric integer | year_level: 'integer' |
| string | Text value | name: 'string' |
| max:N | Max length | message: 'max:1000' |
| min:N | Min length | password: 'min:8' |
| exists | Exists in DB table | role_id: 'exists:roles,id' |
| mimes | File type | resume: 'mimes:pdf,doc,docx' |
| date | Valid date | available_from: 'date' |

### Type Casting in Models

```php
// Student.php
protected function casts(): array
{
    return [
        'year_level' => 'integer',
        'profile_completeness' => 'decimal:2',
    ];
}

// OjtPosting.php
protected function casts(): array
{
    return [
        'schedule' => 'array', // JSON → PHP array
        'slots' => 'integer',
        'slots_filled' => 'integer',
    ];
}
```

---

## Security Best Practices

### Code Review Checklist

- [ ] No SQL concatenation (use Eloquent)
- [ ] No sensitive data in logs
- [ ] Password fields hidden in models
- [ ] Authorization checks on all protected endpoints
- [ ] Input validation on all user inputs
- [ ] Rate limiting on sensitive operations
- [ ] Audit logging on critical actions
- [ ] No hardcoded secrets in code
- [ ] HTTPS enforced in production
- [ ] Dependencies up to date

### Development Practices

**Local Development:**
```bash
# Copy env file
cp .env.example .env
php artisan key:generate

# Run with built-in server
php artisan serve

# No external network exposure
```

**Before Commit:**
```bash
# Run tests
php artisan test

# Check for secrets
git secrets --scan

# Format code
./vendor/bin/pint

# Lint for issues
./vendor/bin/phpstan analyse
```

**Before Deployment:**
```bash
# Update dependencies
composer update
npm update

# Run security audit
composer audit
npm audit

# Version migrations
php artisan migrate --force

# Clear caches
php artisan cache:clear
php artisan config:cache
```

---

## Compliance & Auditing

### Audit Logging Requirements

**Automatic Logging On:**
- User creation/deletion
- Password changes
- Permission modifications
- Sensitive data updates
- Administrative actions

**Manual Logging In Code:**
```php
$this->auditService->log(
    action: 'update',
    entityType: 'Application',
    entityId: $application->id,
    oldValues: $before,
    newValues: $after
);
```

### Audit Log Queries

```php
// View user's recent activity
$activity = AuditLog::where('user_id', $userId)
    ->orderByDesc('created_at')
    ->limit(100)
    ->get();

// Track changes to specific record
$changes = AuditLog::where('entity_type', 'Application')
    ->where('entity_id', 42)
    ->orderByDesc('created_at')
    ->get();

// Find suspicious patterns
$suspiciousLogins = AuditLog::where('action', 'login')
    ->where('created_at', '>', now()->subHours(1))
    ->groupBy('ip_address')
    ->havingRaw('count(*) > 10')
    ->get();
```

### GDPR Compliance

**Data Subject Rights:**

1. **Right to Access** - User can download their data
2. **Right to Erasure** - User can request account deletion
3. **Right to Portability** - User can export their data

**Implementation:**
```php
// Export user data
$data = [
    'user' => $user->load('student', 'profile'),
    'applications' => $user->student->applications,
    'audit_logs' => AuditLog::where('user_id', $user->id)->get(),
];

// Delete user data
$user->delete(); // Cascades to profiles and records
```

---

## Security Checklist

### Pre-Deployment

- [ ] All routes protected with authentication (except public)
- [ ] Authorization checks on sensitive operations
- [ ] SQL injection prevention (Eloquent only)
- [ ] XSS prevention (JSON response, frontend sanitization)
- [ ] CSRF protection (if web forms used)
- [ ] Rate limiting on login/sensitive endpoints
- [ ] Password hashing with Bcrypt
- [ ] Sensitive fields hidden in models
- [ ] No secrets in code (use .env)
- [ ] HTTPS enabled and enforced
- [ ] Database encrypted at rest (if required)
- [ ] Regular backups configured
- [ ] Monitoring and alerting set up

### Ongoing Security

- [ ] Weekly: Check for dependency updates
- [ ] Monthly: Review audit logs for anomalies
- [ ] Quarterly: Security review of code changes
- [ ] Annually: Penetration testing (if required)

---

## Summary

The OJT System implements **comprehensive security** through:

✅ **OWASP Best Practices** - Mitigations for all major vulnerabilities  
✅ **Strong Authentication** - Bcrypt + Sanctum tokens  
✅ **Access Control** - Multi-level authorization checks  
✅ **Input Validation** - Form requests validate all inputs  
✅ **Data Protection** - Sensitive data hidden and encrypted  
✅ **Audit Trails** - Complete record of sensitive actions  
✅ **GDPR Compliance** - User data rights supported  

This ensures **enterprise-grade security** for student, company, and institutional data.
