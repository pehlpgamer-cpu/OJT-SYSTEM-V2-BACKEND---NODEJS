# OJT System V2 - Testing Strategy & Quality Assurance Guide

**Version:** 2.0  
**Framework:** Laravel 12.x / PHPUnit  
**Last Updated:** April 2026

---

## Table of Contents
1. [Testing Overview](#testing-overview)
2. [Unit Tests](#unit-tests)
3. [Feature Tests](#feature-tests)
4. [Integration Tests](#integration-tests)
5. [Testing Best Practices](#testing-best-practices)
6. [Test Execution](#test-execution)
7. [Code Coverage](#code-coverage)

---

## Testing Overview

### Testing Pyramid

```
          ▲
         /|\
        / | \
       /  |  \ E2E Tests (Rare)
      /   |   \ Integration Tests (Some)
     /    |    \ Unit Tests (Many)
    /_____|_____\
```

**Test Distribution:**
- **Unit Tests** (70%): Individual methods/functions
- **Feature Tests** (25%): API endpoints and user workflows
- **Integration Tests** (5%): Database, external services

### Test Framework Stack

| Tool | Purpose |
|------|---------|
| PHPUnit | Test runner and assertions |
| Laravel Testing Utilities | Database, API, auth helpers |
| Mockery | Mocking and spying |
| Faker | Generate test data |

---

## Unit Tests

### Purpose

Test individual functions/methods in isolation.

### Example: MatchingService Unit Test

**File:** `tests/Unit/MatchingServiceTest.php`

```php
<?php

namespace Tests\Unit;

use App\Models\MatchingRule;
use App\Models\OjtPosting;
use App\Models\Student;
use App\Services\MatchingService;
use Tests\TestCase;

class MatchingServiceTest extends TestCase
{
    private MatchingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MatchingService();
    }

    /** @test */
    public function it_calculates_skill_score_correctly()
    {
        // Arrange
        $studentSkills = ['java', 'python', 'sql'];
        $posting = $this->createMockPosting([
            ['skill_name' => 'java', 'is_required' => true],
            ['skill_name' => 'python', 'is_required' => true],
            ['skill_name' => 'docker', 'is_required' => true],
        ]);

        // Act
        $score = $this->service->computeSkillScore($studentSkills, $posting);

        // Assert
        $this->assertEquals(67, $score); // 2 out of 3 matched: 67%
    }

    /** @test */
    public function it_returns_100_for_posting_with_no_required_skills()
    {
        // Arrange
        $studentSkills = ['java'];
        $posting = $this->createMockPosting([]); // No required skills

        // Act
        $score = $this->service->computeSkillScore($studentSkills, $posting);

        // Assert
        $this->assertEquals(100, $score);
    }

    /** @test */
    public function it_returns_0_for_no_matching_skills()
    {
        // Arrange
        $studentSkills = ['javascript'];
        $posting = $this->createMockPosting([
            ['skill_name' => 'java', 'is_required' => true],
            ['skill_name' => 'python', 'is_required' => true],
        ]);

        // Act
        $score = $this->service->computeSkillScore($studentSkills, $posting);

        // Assert
        $this->assertEquals(0, $score);
    }

    // Helper method
    private function createMockPosting(array $skills)
    {
        $posting = \Mockery::mock(OjtPosting::class);
        $posting->shouldReceive('skills')
            ->andReturn(collect($skills));
        
        return $posting;
    }
}
```

### Example: Model Unit Test

**File:** `tests/Unit/StudentTest.php`

```php
<?php

namespace Tests\Unit;

use App\Models\Student;
use Tests\TestCase;

class StudentTest extends TestCase
{
    /** @test */
    public function student_has_belongsTo_user_relationship()
    {
        $student = Student::factory()->create();
        
        $this->assertNotNull($student->user);
        $this->assertTrue($student->user()->exists());
    }

    /** @test */
    public function student_has_many_skills()
    {
        $student = Student::factory()
            ->hasSkills(3)
            ->create();
        
        $this->assertCount(3, $student->skills);
    }

    /** @test */
    public function student_can_have_active_resume()
    {
        $student = Student::factory()
            ->hasResumes(3, ['is_active' => false])
            ->create();
        
        // Activate one resume
        $student->resumes->first()->update(['is_active' => true]);
        
        $this->assertEquals(
            $student->resumes->first()->id,
            $student->activeResume->id
        );
    }
}
```

---

## Feature Tests

### Purpose

Test complete user workflows through API endpoints.

### Example: Authentication Feature Test

**File:** `tests/Feature/Auth/LoginTest.php`

```php
<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Tests\TestCase;

class LoginTest extends TestCase
{
    /** @test */
    public function user_can_login_with_valid_credentials()
    {
        // Arrange
        $user = User::factory()->create([
            'email' => 'john@example.com',
            'password' => 'SecurePassword123!',
            'status' => 'active',
        ]);

        // Act
        $response = $this->post('/api/auth/login', [
            'email' => 'john@example.com',
            'password' => 'SecurePassword123!',
        ]);

        // Assert
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'message',
            'token',
            'user' => ['id', 'name', 'email', 'role', 'status'],
        ]);
        $this->assertNotNull($response->json('token'));
    }

    /** @test */
    public function user_cannot_login_with_invalid_password()
    {
        // Arrange
        User::factory()->create([
            'email' => 'john@example.com',
            'password' => 'SecurePassword123!',
        ]);

        // Act & Assert
        $response = $this->post('/api/auth/login', [
            'email' => 'john@example.com',
            'password' => 'WrongPassword',
        ]);

        $response->assertStatus(401);
        $response->assertJson([
            'message' => 'Invalid credentials.',
        ]);
    }

    /** @test */
    public function suspended_user_cannot_login()
    {
        // Arrange
        User::factory()->create([
            'email' => 'john@example.com',
            'password' => 'SecurePassword123!',
            'status' => 'suspended',
        ]);

        // Act & Assert
        $response = $this->post('/api/auth/login', [
            'email' => 'john@example.com',
            'password' => 'SecurePassword123!',
        ]);

        $response->assertStatus(403);
        $response->assertJsonFragment([
            'message' => 'Account is not active. Current status: suspended',
        ]);
    }
}
```

### Example: Application Endpoints Test

**File:** `tests/Feature/ApplicationTest.php`

```php
<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\OjtPosting;
use App\Models\Student;
use App\Models\User;
use Tests\TestCase;

class ApplicationTest extends TestCase
{
    /** @test */
    public function student_can_apply_to_posting()
    {
        // Arrange
        $student = Student::factory()->create();
        $user = $student->user;
        $posting = OjtPosting::factory()->create(['status' => 'active']);

        // Act
        $response = $this->actingAs($user, 'sanctum')
            ->post('/api/applications', [
                'ojt_posting_id' => $posting->id,
                'cover_letter' => 'I am interested in this position.',
            ]);

        // Assert
        $response->assertStatus(201);
        $this->assertDatabaseHas('applications', [
            'student_id' => $student->id,
            'ojt_posting_id' => $posting->id,
            'status' => 'pending',
        ]);
    }

    /** @test */
    public function student_cannot_apply_twice_to_same_posting()
    {
        // Arrange
        $student = Student::factory()->create();
        $user = $student->user;
        $posting = OjtPosting::factory()->create(['status' => 'active']);

        // First application succeeds
        $this->actingAs($user, 'sanctum')
            ->post('/api/applications', [
                'ojt_posting_id' => $posting->id,
            ]);

        // Act: Second application
        $response = $this->actingAs($user, 'sanctum')
            ->post('/api/applications', [
                'ojt_posting_id' => $posting->id,
            ]);

        // Assert
        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'You have already applied to this posting.',
        ]);
    }

    /** @test */
    public function student_cannot_apply_to_closed_posting()
    {
        // Arrange
        $student = Student::factory()->create();
        $user = $student->user;
        $posting = OjtPosting::factory()->create(['status' => 'closed']);

        // Act
        $response = $this->actingAs($user, 'sanctum')
            ->post('/api/applications', [
                'ojt_posting_id' => $posting->id,
            ]);

        // Assert
        $response->assertStatus(422);
    }

    /** @test */
    public function student_can_view_own_applications()
    {
        // Arrange
        $student = Student::factory()->create();
        $user = $student->user;
        Application::factory()
            ->for($student)
            ->count(3)
            ->create();

        // Act
        $response = $this->actingAs($user, 'sanctum')
            ->get('/api/students/me/applications');

        // Assert
        $response->assertStatus(200);
        $this->assertCount(3, $response->json('data'));
    }

    /** @test */
    public function company_can_view_applications_to_their_posting()
    {
        // Arrange
        $company = Company::factory()->create();
        $user = $company->user;
        $posting = OjtPosting::factory()
            ->for($company)
            ->create();
        Application::factory()
            ->for($posting)
            ->count(5)
            ->create();

        // Act
        $response = $this->actingAs($user, 'sanctum')
            ->get("/api/company/postings/{$posting->id}/applications");

        // Assert
        $response->assertStatus(200);
        $this->assertCount(5, $response->json('data'));
    }
}
```

---

## Integration Tests

### Purpose

Test multiple components working together, including database interactions.

### Example: Complete Application Workflow

**File:** `tests/Integration/ApplicationWorkflowTest.php`

```php
<?php

namespace Tests\Integration;

use App\Models\Application;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\OjtPosting;
use App\Models\Student;
use Tests\TestCase;

class ApplicationWorkflowTest extends TestCase
{
    /** @test */
    public function complete_application_and_acceptance_workflow()
    {
        // Step 1: Student applies
        $student = Student::factory()->create();
        $company = Company::factory()->create();
        $posting = OjtPosting::factory()
            ->for($company)
            ->create(['status' => 'active', 'slots' => 3, 'slots_filled' => 0]);

        // Application submitted
        $response = $this->actingAs($student->user, 'sanctum')
            ->post('/api/applications', [
                'ojt_posting_id' => $posting->id,
                'cover_letter' => 'I want this job.',
            ]);

        $response->assertStatus(201);
        $applicationId = $response->json('data.id');

        // Verify application created
        $application = Application::find($applicationId);
        $this->assertEquals('pending', $application->status);

        // Verify notification sent to company
        $this->assertDatabaseHas('notifications', [
            'user_id' => $company->user_id,
            'type' => 'info',
        ]);

        // Verify audit log created
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'create',
            'entity_type' => 'Application',
            'entity_id' => $applicationId,
        ]);

        // Step 2: Company accepts application
        $response = $this->actingAs($company->user, 'sanctum')
            ->put("/api/applications/{$applicationId}/update-status", [
                'status' => 'accepted',
            ]);

        $response->assertStatus(200);

        // Verify application status changed
        $application->refresh();
        $this->assertEquals('accepted', $application->status);

        // Verify OJT progress created
        $this->assertDatabaseHas('ojt_progress', [
            'application_id' => $applicationId,
            'status' => 'in_progress',
        ]);

        // Verify student notified
        $this->assertDatabaseHas('notifications', [
            'user_id' => $student->user_id,
            'type' => 'success',
            'title' => 'Application Accepted!',
        ]);

        // Step 3: Student logs hours
        $response = $this->actingAs($student->user, 'sanctum')
            ->put('/api/students/me/ojt-progress', [
                'hours_completed' => 80,
                'documents_submitted' => 3,
            ]);

        $response->assertStatus(200);

        // Verify hours updated
        $progress = $application->ojtProgress()->first();
        $this->assertEquals(80, $progress->hours_completed);

        // This is a realistic, end-to-end workflow test covering:
        // ✓ API requests
        // ✓ Business logic
        // ✓ Database changes
        // ✓ Notifications
        // ✓ Audit logging
    }
}
```

---

## Testing Best Practices

### Test Naming Convention

```php
// ✅ GOOD: Describes what is being tested
/** @test */
public function it_validates_email_format_on_registration()

/** @test */
public function student_can_apply_to_active_posting_with_available_slots()

// ❌ BAD: Vague or too technical
/** @test */
public function test_1()

/** @test */
public function validate_input()
```

### Test Structure (AAA Pattern)

```php
public function test_user_can_login()
{
    // Arrange: Set up test data
    $user = User::factory()->create();

    // Act: Perform the action
    $response = $this->post('/api/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    // Assert: Verify the result
    $response->assertStatus(200);
    $this->assertNotNull($response->json('token'));
}
```

### Use Factories for Test Data

```php
// ✅ GOOD: Use factories
$user = User::factory()->create();
$students = Student::factory()->count(5)->create();
$posting = OjtPosting::factory()->for($company)->create();

// ❌ BAD: Hard-coded test data
$user = new User([
    'name' => 'John Doe',
    'email' => 'john@example.com',
    // ... many more fields ...
]);
$user->save();
```

### Test Isolation

```php
// ✅ GOOD: Each test is independent
class UserTest extends TestCase
{
    /** @test */
    public function user_can_register() { }

    /** @test */
    public function user_cannot_register_with_duplicate_email() { }
}

// ❌ BAD: Tests depend on each other
class UserTest extends TestCase
{
    public function test_first_create_user() {
        // Creates user that second test depends on
    }

    public function test_second_uses_first_user() {
        // Fails if run independently
    }
}
```

### Mock External Dependencies

```php
// ✅ GOOD: Mock email service
$this->mock(MailService::class)
    ->shouldReceive('send')
    ->andReturn(true);

// ❌ BAD: Make real API calls in tests
$response = Http::get('https://external-api.com/data');
```

### Test Database Changes

```php
/** @test */
public function student_profile_is_updated_in_database()
{
    $student = Student::factory()->create();
    $user = $student->user;

    $this->actingAs($user, 'sanctum')
        ->put('/api/students/me', [
            'first_name' => 'Jane',
            'phone' => '555-1234',
        ]);

    // Refresh from database
    $student->refresh();
    
    $this->assertEquals('Jane', $student->first_name);
    $this->assertEquals('555-1234', $student->phone);
}
```

---

## Test Execution

### Running Tests

**All tests:**
```bash
php artisan test
```

**Specific test file:**
```bash
php artisan test tests/Feature/Auth/LoginTest.php
```

**Specific test method:**
```bash
php artisan test tests/Feature/Auth/LoginTest.php --filter=user_can_login_with_valid_credentials
```

**With output:**
```bash
php artisan test --verbose
```

**Stop on failure:**
```bash
php artisan test --stop-on-failure
```

**Watch mode (re-run on changes):**
```bash
php artisan test --watch
```

---

## Code Coverage

### Generate Coverage Report

```bash
php artisan test --coverage
```

**Output:**
```
 Classes: 85.50% (19/20)
 Methods: 78.40% (43/55)
 Lines: 82.65% (156/189)
```

### Detailed Coverage

```bash
php artisan test --coverage-html storage/coverage
# Opens HTML report in browser
```

### Coverage Targets

| Area | Target |
|------|--------|
| Models | 90%+ |
| Services | 95%+ |
| Controllers | 85%+ |
| Eloquent Relations | 100% |
| Business Logic | 95%+ |
| Utilities | 80%+ |

---

## Summary

A comprehensive test suite provides:

✅ **Confidence** - Changes don't break existing functionality  
✅ **Documentation** - Tests show how to use code  
✅ **Refactoring Safety** - Catch regressions immediately  
✅ **Design Feedback** - Hard-to-test code signals design issues  
✅ **Maintainability** - Catch bugs before production  

**Goal:** Aim for 85%+ code coverage with focus on critical business logic.
