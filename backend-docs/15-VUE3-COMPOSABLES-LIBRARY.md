# Vue 3 Composables Library for OJT System V2 Backend

**For**: Vue 3 (Composition API) + Pinia + Fetch API  
**Backend**: OJT System V2 Node.js with Neon PostgreSQL  
**Version**: 1.0.0  
**Last Updated**: April 15, 2026

---

## Table of Contents

1. [useAuth](#useauth) - Authentication & token management
2. [useStudentProfile](#usestudentprofile) - Student profile management
3. [useJobMatching](#usejobmatching) - Job matching calculations
4. [useApplications](#useapplications) - Application workflow
5. [useNotifications](#usenotifications) - Real-time notifications
6. [useErrorBoundary](#useerrorboundary) - Error handling
7. [useFetch](#usefetch) - Generic data loading hook
8. [useAuth](#useauth---advanced) - Advanced token features

---

## useAuth

Handles authentication state, login, logout, and token management.

### Installation

```javascript
// composables/useAuth.js
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { tokenStorage } from '@/utils/tokenStorage'

export function useAuth() {
  const user = ref(null)
  const token = ref(tokenStorage.get())
  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const isLoading = ref(false)
  const error = ref(null)

  // Fetch current user from token
  async function fetchCurrentUser() {
    if (!token.value) return

    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/auth/me')
      user.value = response.user
    } catch (err) {
      error.value = err.message
      if (err.status === 401) {
        logout()
      }
    } finally {
      isLoading.value = false
    }
  }

  // Login with email/password
  async function login(email, password) {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.post('/auth/login', {
        email: email.toLowerCase().trim(),
        password
      })

      user.value = response.user
      token.value = response.token
      tokenStorage.set(response.token)

      return response.user
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Register new user
  async function register(data) {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.post('/auth/register', {
        name: data.name,
        email: data.email.toLowerCase().trim(),
        password: data.password,
        role: data.role
      })

      user.value = response.user
      token.value = response.token
      tokenStorage.set(response.token)

      return response.user
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Logout
  function logout() {
    user.value = null
    token.value = null
    tokenStorage.remove()
  }

  // Request password reset email
  async function requestPasswordReset(email) {
    try {
      await apiClient.post('/auth/forgot-password', {
        email: email.toLowerCase().trim()
      })
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Reset password with token
  async function resetPassword(token, newPassword) {
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password: newPassword
      })
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Check if token will expire within minutes
  function willTokenExpireIn(minutes) {
    const expiration = tokenStorage.getExpiration()
    if (!expiration) return true

    const expiresInMs = expiration.getTime() - Date.now()
    return expiresInMs < minutes * 60 * 1000
  }

  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,
    error,

    // Methods
    fetchCurrentUser,
    login,
    register,
    logout,
    requestPasswordReset,
    resetPassword,
    willTokenExpireIn
  }
}
```

### Usage Example

```vue
<script setup>
import { useAuth } from '@/composables/useAuth'

const auth = useAuth()

// On component mount, fetch current user if logged in
onMounted(() => {
  if (auth.isAuthenticated.value) {
    auth.fetchCurrentUser()
  }
})

async function handleLogin(email, password) {
  try {
    await auth.login(email, password)
    router.push('/dashboard')
  } catch (err) {
    showNotification(err.message, 'error')
  }
}
</script>

<template>
  <div>
    <p v-if="auth.isLoading">Loading...</p>
    <div v-if="auth.user">
      Logged in as: {{ auth.user.name }}
      <button @click="auth.logout">Logout</button>
    </div>
    <div v-else>
      <input type="email" placeholder="Email" />
      <button @click="handleLogin">Login</button>
    </div>
  </div>
</template>
```

---

## useStudentProfile

Manages student profile data, skills, and profile completeness.

### Installation

```javascript
// composables/useStudentProfile.js
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/apiClient'

export function useStudentProfile() {
  const profile = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const isSaving = ref(false)

  // Computed properties
  const skills = computed(() => profile.value?.skills || [])
  const profileCompleteness = computed(
    () => profile.value?.profile_completeness_percentage || 0
  )
  const isProfileComplete = computed(() => profileCompleteness.value >= 100)

  // Fetch student profile
  async function fetchProfile() {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/student/profile')
      profile.value = response.profile
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  // Update profile information
  async function updateProfile(updates) {
    isSaving.value = true
    error.value = null

    try {
      const response = await apiClient.put('/student/profile', updates)
      profile.value = response.profile
      return response.profile
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isSaving.value = false
    }
  }

  // Add skill to profile
  async function addSkill(skillData) {
    try {
      const response = await apiClient.post('/student/skills', {
        skill_name: skillData.name,
        proficiency_level: skillData.proficiency, // beginner, intermediate, advanced, expert
        verification_status: 'pending'
      })

      if (profile.value) {
        profile.value.skills = response.skills
      }

      return response.skill
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Update skill
  async function updateSkill(skillId, updates) {
    try {
      const response = await apiClient.put(
        `/student/skills/${skillId}`,
        updates
      )

      if (profile.value) {
        const index = profile.value.skills.findIndex(s => s.id === skillId)
        if (index >= 0) {
          profile.value.skills[index] = response.skill
        }
      }

      return response.skill
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Delete skill
  async function deleteSkill(skillId) {
    try {
      await apiClient.delete(`/student/skills/${skillId}`)

      if (profile.value) {
        profile.value.skills = profile.value.skills.filter(
          s => s.id !== skillId
        )
      }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Upload resume (if applicable)
  async function uploadResume(file) {
    isSaving.value = true
    error.value = null

    try {
      const formData = new FormData()
      formData.append('resume', file)

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/student/resume`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenStorage.get()}`
          },
          body: formData
        }
      )

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      if (profile.value) {
        profile.value.resume_url = data.resume_url
      }

      return data.resume_url
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isSaving.value = false
    }
  }

  return {
    // State
    profile,
    isLoading,
    error,
    isSaving,

    // Computed
    skills,
    profileCompleteness,
    isProfileComplete,

    // Methods
    fetchProfile,
    updateProfile,
    addSkill,
    updateSkill,
    deleteSkill,
    uploadResume
  }
}
```

### Usage Example

```vue
<script setup>
import { useStudentProfile } from '@/composables/useStudentProfile'

const studentProfile = useStudentProfile()

onMounted(() => {
  studentProfile.fetchProfile()
})

async function updateName(newName) {
  try {
    await studentProfile.updateProfile({ name: newName })
    showNotification('Profile updated!')
  } catch (err) {
    showNotification(err.message, 'error')
  }
}

async function addNewSkill() {
  try {
    await studentProfile.addSkill({
      name: 'Vue 3',
      proficiency: 'intermediate'
    })
  } catch (err) {
    showNotification(err.message, 'error')
  }
}
</script>

<template>
  <div v-if="studentProfile.isLoading">Loading profile...</div>
  <div v-else-if="studentProfile.profile">
    <h2>{{ studentProfile.profile.name }}</h2>
    <p>Profile {{ studentProfile.profileCompleteness }}% complete</p>

    <h3>Skills ({{ studentProfile.skills.length }})</h3>
    <ul>
      <li v-for="skill in studentProfile.skills" :key="skill.id">
        {{ skill.skill_name }} - {{ skill.proficiency_level }}
      </li>
    </ul>

    <button @click="addNewSkill">Add Skill</button>
  </div>
</template>
```

---

## useJobMatching

Fetch and manage job matching results.

### Installation

```javascript
// composables/useJobMatching.js
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/apiClient'

export function useJobMatching() {
  const matches = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // Filter state
  const filters = ref({
    minScore: 0,
    location: null,
    skillIds: [],
    sortBy: 'score' // score, salary, company
  })

  // Computed
  const topMatches = computed(() => matches.value.slice(0, 10))
  
  const filteredMatches = computed(() => {
    return matches.value.filter(match => {
      if (match.overall_score < filters.value.minScore) return false
      if (filters.value.location && match.posting.location !== filters.value.location) {
        return false
      }
      return true
    }).sort((a, b) => {
      if (filters.value.sortBy === 'score') {
        return b.overall_score - a.overall_score
      } else if (filters.value.sortBy === 'salary') {
        return (b.posting.salary_max || 0) - (a.posting.salary_max || 0)
      }
      return 0
    })
  })

  // Fetch matches
  async function fetchMatches() {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/student/matches')
      // Sort by overall_score descending
      matches.value = response.matches.sort(
        (a, b) => b.overall_score - a.overall_score
      )
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  // Get single matching details
  async function getMatchDetails(postingId) {
    try {
      const response = await apiClient.get(
        `/student/matches/${postingId}`
      )
      return response.match
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Update filters
  function updateFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  // Get score breakdown for a match
  function getScoreBreakdown(match) {
    return {
      skills: {
        score: match.skill_score,
        weight: 40,
        weighted: (match.skill_score * 40) / 100
      },
      location: {
        score: match.location_score,
        weight: 20,
        weighted: (match.location_score * 20) / 100
      },
      availability: {
        score: match.availability_score,
        weight: 20,
        weighted: (match.availability_score * 20) / 100
      },
      gpa: {
        score: match.gpa_score,
        weight: 10,
        weighted: (match.gpa_score * 10) / 100
      },
      program: {
        score: match.program_score,
        weight: 10,
        weighted: (match.program_score * 10) / 100
      },
      overall: match.overall_score,
      status: match.match_status // perfect, great, good, fair, poor
    }
  }

  // Map match status to UI class
  function getStatusClass(status) {
    const classMap = {
      perfect: 'text-green-700 bg-green-50',
      great: 'text-green-600 bg-green-50',
      good: 'text-blue-600 bg-blue-50',
      fair: 'text-yellow-600 bg-yellow-50',
      poor: 'text-red-600 bg-red-50'
    }
    return classMap[status] || 'text-gray-600'
  }

  return {
    // State
    matches,
    isLoading,
    error,
    filters,

    // Computed
    topMatches,
    filteredMatches,

    // Methods
    fetchMatches,
    getMatchDetails,
    updateFilters,
    getScoreBreakdown,
    getStatusClass
  }
}
```

### Usage Example

```vue
<script setup>
import { useJobMatching } from '@/composables/useJobMatching'

const matching = useJobMatching()

onMounted(() => {
  matching.fetchMatches()
})

function viewMatchDetails(match) {
  const breakdown = matching.getScoreBreakdown(match)
  console.log('Match breakdown:', breakdown)
}
</script>

<template>
  <div>
    <h2>Recommended Jobs ({{ matching.filteredMatches.length }})</h2>

    <div v-if="matching.isLoading">Loading matches...</div>

    <div v-if="matching.error" class="error">{{ matching.error }}</div>

    <ul v-else>
      <li v-for="match in matching.filteredMatches" :key="match.posting_id">
        <div :class="matching.getStatusClass(match.match_status)">
          <h3>{{ match.posting.company.name }}</h3>
          <p>{{ match.posting.job_title }}</p>
          <p>Match: {{ match.overall_score.toFixed(1) }}%</p>
          <button @click="viewMatchDetails(match)">View Details</button>
        </div>
      </li>
    </ul>
  </div>
</template>
```

---

## useApplications

Manage job applications workflow.

### Installation

```javascript
// composables/useApplications.js
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/apiClient'

export function useApplications() {
  const applications = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const isSubmitting = ref(false)

  // Computed
  const pendingApplications = computed(
    () => applications.value.filter(a => a.status === 'pending')
  )

  const acceptedApplications = computed(
    () => applications.value.filter(a => a.status === 'accepted')
  )

  const rejectedApplications = computed(
    () => applications.value.filter(a => a.status === 'rejected')
  )

  const withdrawnApplications = computed(
    () => applications.value.filter(a => a.status === 'withdrawn')
  )

  // Fetch all applications
  async function fetchApplications() {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/student/applications')
      applications.value = response.applications
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  // Apply to a job posting
  async function applyToPosting(postingId) {
    isSubmitting.value = true
    error.value = null

    try {
      const response = await apiClient.post(
        `/student/postings/${postingId}/apply`,
        {}
      )

      applications.value.push(response.application)
      return response.application
    } catch (err) {
      // Handle specific errors
      if (err.message.includes('No positions available')) {
        error.value = 'Sorry, all positions have been filled'
      } else if (err.message.includes('Already applied')) {
        error.value = 'You have already applied to this posting'
      } else {
        error.value = err.message
      }
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  // Get single application details
  async function getApplicationDetails(applicationId) {
    try {
      const response = await apiClient.get(
        `/student/applications/${applicationId}`
      )
      return response.application
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Withdraw application
  async function withdrawApplication(applicationId) {
    isSubmitting.value = true
    error.value = null

    try {
      const response = await apiClient.put(
        `/student/applications/${applicationId}`,
        { status: 'withdrawn' }
      )

      const index = applications.value.findIndex(
        a => a.id === applicationId
      )
      if (index >= 0) {
        applications.value[index] = response.application
      }

      return response.application
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  // Get status badge color
  function getStatusColor(status) {
    const colors = {
      pending: '#f59e0b', // amber
      accepted: '#10b981', // green
      rejected: '#ef4444', // red
      withdrawn: '#6b7280' // gray
    }
    return colors[status] || '#6b7280'
  }

  // Get status label
  function getStatusLabel(status) {
    const labels = {
      pending: 'Pending Review',
      accepted: 'Accepted',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn'
    }
    return labels[status] || status
  }

  return {
    // State
    applications,
    isLoading,
    error,
    isSubmitting,

    // Computed
    pendingApplications,
    acceptedApplications,
    rejectedApplications,
    withdrawnApplications,

    // Methods
    fetchApplications,
    applyToPosting,
    getApplicationDetails,
    withdrawApplication,
    getStatusColor,
    getStatusLabel
  }
}
```

### Usage Example

```vue
<script setup>
import { useApplications } from '@/composables/useApplications'

const applications = useApplications()

onMounted(() => {
  applications.fetchApplications()
})

async function submitApplication(postingId) {
  try {
    await applications.applyToPosting(postingId)
    showNotification('Application submitted!')
  } catch (err) {
    showNotification(err.message, 'error')
  }
}

async function withdrawApp(appId) {
  if (confirm('Are you sure you want to withdraw?')) {
    try {
      await applications.withdrawApplication(appId)
      showNotification('Application withdrawn')
    } catch (err) {
      showNotification(err.message, 'error')
    }
  }
}
</script>

<template>
  <div>
    <h2>My Applications</h2>

    <div class="tabs">
      <button>
        Pending ({{ applications.pendingApplications.length }})
      </button>
      <button>
        Accepted ({{ applications.acceptedApplications.length }})
      </button>
      <button>
        Rejected ({{ applications.rejectedApplications.length }})
      </button>
    </div>

    <ul>
      <li v-for="app in applications.applications" :key="app.id">
        <div :style="{ borderLeft: `4px solid ${applications.getStatusColor(app.status)}` }">
          <h3>{{ app.posting.company.name }}</h3>
          <p>{{ app.posting.job_title }}</p>
          <p>{{ applications.getStatusLabel(app.status) }}</p>
          <button @click="withdrawApp(app.id)" v-if="app.status === 'pending'">
            Withdraw
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
```

---

## useNotifications

Manage real-time notifications.

### Installation

```javascript
// composables/useNotifications.js
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/apiClient'

export function useNotifications() {
  const notifications = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const unreadCount = computed(
    () => notifications.value.filter(n => !n.is_read).length
  )

  // Fetch all notifications
  async function fetchNotifications() {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/student/notifications')
      notifications.value = response.notifications
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  // Mark as read
  async function markAsRead(notificationId) {
    try {
      await apiClient.put(
        `/notifications/${notificationId}`,
        { is_read: true }
      )

      const notification = notifications.value.find(n => n.id === notificationId)
      if (notification) {
        notification.is_read = true
      }
    } catch (err) {
      error.value = err.message
    }
  }

  // Mark all as read
  async function markAllAsRead() {
    try {
      await apiClient.post('/notifications/mark-all-read', {})
      notifications.value.forEach(n => (n.is_read = true))
    } catch (err) {
      error.value = err.message
    }
  }

  // Delete notification
  async function deleteNotification(notificationId) {
    try {
      await apiClient.delete(`/notifications/${notificationId}`)
      notifications.value = notifications.value.filter(
        n => n.id !== notificationId
      )
    } catch (err) {
      error.value = err.message
    }
  }

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  }
}
```

---

## useErrorBoundary

Handle and display errors gracefully.

### Installation

```javascript
// composables/useErrorBoundary.js
import { ref } from 'vue'

export function useErrorBoundary() {
  const error = ref(null)
  const errorDetails = ref(null)

  function setError(err, context = '') {
    error.value = err?.message || 'An error occurred'
    errorDetails.value = {
      status: err?.status,
      code: err?.code,
      context,
      timestamp: new Date().toISOString()
    }
    console.error('[Error Boundary]', error.value, errorDetails.value)
  }

  function clearError() {
    error.value = null
    errorDetails.value = null
  }

  function getErrorMessage() {
    if (!error.value) return null

    // Map common errors to user-friendly messages
    if (error.value.includes('401') || error.value.includes('Unauthorized')) {
      return 'Your session expired. Please login again.'
    }
    if (error.value.includes('403') || error.value.includes('Forbidden')) {
      return "You don't have permission to access this resource."
    }
    if (error.value.includes('404') || error.value.includes('Not found')) {
      return 'The resource you requested was not found.'
    }
    if (error.value.includes('429') || error.value.includes('rate')) {
      return 'Too many requests. Please wait a moment and try again.'
    }
    if (error.value.includes('500') || error.value.includes('Server')) {
      return 'Server error. Please try again later.'
    }
    if (error.value.includes('Network') || error.value.includes('fetch')) {
      return 'Network error. Check your internet connection.'
    }

    return error.value
  }

  return {
    error,
    errorDetails,
    setError,
    clearError,
    getErrorMessage
  }
}
```

---

## useFetch

Generic composable for fetching data with loading/error states.

### Installation

```javascript
// composables/useFetch.js
import { ref, onMounted } from 'vue'

export function useFetch(fetchFn, immediate = true) {
  const data = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  async function execute() {
    isLoading.value = true
    error.value = null

    try {
      data.value = await fetchFn()
    } catch (err) {
      error.value = err
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    if (immediate) {
      execute()
    }
  })

  return {
    data,
    isLoading,
    error,
    execute
  }
}
```

### Usage

```javascript
const { data: jobs, isLoading } = useFetch(
  () => apiClient.get('/postings'),
  true
)
```

---

## Advanced: useAuth with Token Refresh

If backend adds a refresh token endpoint:

```javascript
// composables/useAuthAdvanced.js
export function useAuthAdvanced() {
  const refreshTokenInterval = ref(null)

  // Schedule token refresh before expiry
  function scheduleTokenRefresh() {
    // Get token expiry
    const expiry = tokenStorage.getExpiration()
    if (!expiry) return

    // Refresh 1 minute before expiry
    const now = Date.now()
    const expiryMs = expiry.getTime()
    const refreshInMs = expiryMs - now - 60000

    if (refreshInMs > 0) {
      refreshTokenInterval.value = setTimeout(async () => {
        try {
          const response = await apiClient.post('/auth/refresh', {})
          tokenStorage.set(response.token)
          scheduleTokenRefresh() // Schedule next refresh
        } catch (err) {
          console.error('Token refresh failed:', err)
          logout()
        }
      }, refreshInMs)
    }
  }

  function clearRefreshSchedule() {
    if (refreshTokenInterval.value) {
      clearTimeout(refreshTokenInterval.value)
    }
  }

  return {
    scheduleTokenRefresh,
    clearRefreshSchedule
  }
}
```

---

## Testing Composables

```javascript
// __tests__/useStudentProfile.test.js
import { describe, it, expect, vi } from 'vitest'
import { useStudentProfile } from '@/composables/useStudentProfile'

describe('useStudentProfile', () => {
  it('calculates profile completeness', () => {
    const profile = useStudentProfile()
    profile.profile.value = {
      profile_completeness_percentage: 75
    }

    expect(profile.profileCompleteness.value).toBe(75)
  })

  it('filters skills correctly', () => {
    const profile = useStudentProfile()
    profile.profile.value = {
      skills: [
        { id: 1, skill_name: 'Vue', proficiency_level: 'advanced' },
        { id: 2, skill_name: 'React', proficiency_level: 'beginner' }
      ]
    }

    expect(profile.skills.value).toHaveLength(2)
    expect(profile.skills.value[0].skill_name).toBe('Vue')
  })
})
```

---

## Best Practices

1. **Always handle loading & error states**
2. **Use computed properties for derived state**
3. **Clear sensitive data on logout**
4. **Implement token refresh logic**
5. **Test composables independently**
6. **Provide sensible defaults**

---

**Need more?** Check the [Vue 3 Integration Guide](14-VUE3-INTEGRATION-GUIDE.md) for full context.

