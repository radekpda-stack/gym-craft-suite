# QA Test Scenarios - Coach/Health Application

**Version:** 1.0  
**Last Updated:** 2025-12-24  
**Target:** Manual Testing, Regression Testing, Future Automation

---

## Table of Contents

1. [Dashboard Module](#1-dashboard-module)
2. [Clients Module](#2-clients-module)
3. [Trainings Module](#3-trainings-module)
4. [Exercises Module](#4-exercises-module)
5. [Questionnaires Module](#5-questionnaires-module)
6. [Analytics / Statistics Module](#6-analytics--statistics-module)
7. [Settings Module](#7-settings-module)
8. [Cross-Module & Chaos Testing](#8-cross-module--chaos-testing)
9. [Security & Permissions](#9-security--permissions)
10. [Performance Testing](#10-performance-testing)

---

## 1. Dashboard Module

### 1.1 Happy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| D-HP-01 | View dashboard on login | User is authenticated | 1. Login to app 2. Observe dashboard | Dashboard loads with today's timeline, stats visible | HIGH - Entry point; broken = app unusable |
| D-HP-02 | View today's sessions | User has scheduled trainings today | 1. Navigate to dashboard 2. Check timeline card | All today's sessions displayed in chronological order | HIGH - Core daily planning |
| D-HP-03 | Navigate to client from dashboard | Training session exists | 1. Click on session in timeline | Navigates to training detail or client | MEDIUM - Navigation flow |
| D-HP-04 | Dashboard stats accuracy | Multiple trainings/clients exist | 1. Compare dashboard stats with actual data | Stats match real data (weekly/monthly counts) | HIGH - Data integrity |

### 1.2 Unhappy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| D-UP-01 | Dashboard with no data | New user, no clients/trainings | 1. Login as new user | Empty state displayed with call-to-action | MEDIUM - New user experience |
| D-UP-02 | Dashboard API timeout | Slow network | 1. Throttle network 2. Load dashboard | Loading skeleton shown, then error or retry | HIGH - Perceived reliability |
| D-UP-03 | Session user logged out | Session expired | 1. Wait for session expiry 2. Interact | Redirect to login, no crash | CRITICAL - Security |

### 1.3 Edge Cases

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| D-EC-01 | 50+ sessions on single day | Many trainings scheduled | 1. Schedule 50 trainings same day 2. View dashboard | All sessions visible, no overflow, scrollable | MEDIUM - Scalability |
| D-EC-02 | Midnight session | Training at 00:00 | 1. Schedule training at midnight 2. Check dashboard | Session shows in correct day | LOW - Date handling |
| D-EC-03 | Timezone handling | User in different timezone | 1. Change device timezone 2. Reload dashboard | Sessions display in correct local time | MEDIUM - Internationalization |

---

## 2. Clients Module

### 2.1 Happy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| C-HP-01 | Create new client | User authenticated | 1. Click "+" 2. Fill required fields 3. Submit | Client created, appears in list | CRITICAL - Core functionality |
| C-HP-02 | Edit client details | Client exists | 1. Open client 2. Click edit 3. Change name 4. Save | Changes persisted, shown in list | HIGH - Data management |
| C-HP-03 | Delete client | Client exists (no trainings) | 1. Open client menu 2. Click delete 3. Confirm | Client removed from system | HIGH - Data cleanup |
| C-HP-04 | Search clients | Multiple clients exist | 1. Type in search 2. Observe filtering | Only matching clients shown | MEDIUM - Usability |
| C-HP-05 | Filter by tag | Clients have tags | 1. Select tag filter | Only tagged clients shown | LOW - Feature |
| C-HP-06 | Filter by low credit | Clients with varied credit | 1. Enable low credit filter | Only clients <500 CZK shown | MEDIUM - Financial visibility |
| C-HP-07 | Add credit to client | Client exists | 1. Open credit dialog 2. Enter amount 3. Submit | Credit balance updated | CRITICAL - Financial |
| C-HP-08 | Archive client | Client exists | 1. Click archive action | Client moves to archived, hidden from default view | MEDIUM - Organization |
| C-HP-09 | View archived clients | Archived clients exist | 1. Toggle "show archived" | Archived clients visible with distinct styling | LOW - Feature |
| C-HP-10 | Toggle favorite | Client exists | 1. Click star icon | Client marked as favorite, sorted to top | LOW - UX |
| C-HP-11 | Create shared budget group | 2+ clients exist | 1. Open groups 2. Create group 3. Add clients | Group created, clients share budget | MEDIUM - Family/couple feature |

### 2.2 Unhappy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| C-UP-01 | Create client - empty name | Form open | 1. Leave name empty 2. Submit | Validation error shown, form not submitted | CRITICAL - Data integrity |
| C-UP-02 | Create client - invalid email | Form open | 1. Enter "not-an-email" 2. Submit | Validation error on email field | HIGH - Data quality |
| C-UP-03 | Delete client with trainings | Client has training history | 1. Try to delete | Warning shown, require confirmation or prevent | HIGH - Data relationships |
| C-UP-04 | Add negative credit | Credit dialog open | 1. Enter "-500" 2. Submit | Rejected or handled as deduction | MEDIUM - Financial logic |
| C-UP-05 | Add zero credit | Credit dialog open | 1. Enter "0" 2. Submit | Validation error or no-op | LOW - Edge case |
| C-UP-06 | Add credit with special chars | Credit dialog open | 1. Enter "500abc" | Validation error, numeric only | MEDIUM - Input sanitization |
| C-UP-07 | Double-click create | Form filled | 1. Double-click submit rapidly | Only one client created | HIGH - Duplicate prevention |
| C-UP-08 | Network error on save | Network disabled | 1. Fill form 2. Disable network 3. Submit | Error toast, form data preserved | HIGH - Resilience |
| C-UP-09 | Concurrent edit conflict | Two tabs open same client | 1. Edit in tab A 2. Save 3. Edit in tab B 4. Save | Last write wins, no data corruption | MEDIUM - Concurrency |

### 2.3 Edge Cases

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| C-EC-01 | Client with 500 char name | Form open | 1. Paste very long name | Truncated or validation error | LOW - Input limits |
| C-EC-02 | 1000+ clients list | Many clients | 1. Load clients page | Page remains responsive, possible virtualization | MEDIUM - Performance |
| C-EC-03 | Client with all fields empty except name | Form open | 1. Only fill name 2. Submit | Client created, nulls handled | LOW - Optional fields |
| C-EC-04 | Unicode in client name | Form open | 1. Enter "Müller 日本語 🏋️" | Name stored and displayed correctly | LOW - Encoding |
| C-EC-05 | Date of birth in future | Form open | 1. Enter DOB tomorrow | Validation error | MEDIUM - Logic |
| C-EC-06 | Date of birth 150 years ago | Form open | 1. Enter DOB 1875-01-01 | Validation error or warning | LOW - Reasonable limits |
| C-EC-07 | Bulk delete all clients | Many clients selected | 1. Select all 2. Bulk delete | Confirmation required, all deleted | MEDIUM - Destructive action |

---

## 3. Trainings Module

### 3.1 Happy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| T-HP-01 | Create training session | Client exists | 1. Click "+" 2. Select client 3. Set date/time 4. Submit | Training created, appears in list | CRITICAL - Core |
| T-HP-02 | Complete training | Scheduled training exists | 1. Swipe or click complete | Status changes, credit deducted | CRITICAL - Workflow |
| T-HP-03 | Cancel training (>24h) | Future training exists | 1. Cancel training | Training marked canceled, no credit deduction | HIGH - Policy |
| T-HP-04 | Cancel training (<24h) | Training within 24h | 1. Cancel training 2. Choose credit option | Option to deduct shown, credit handled per choice | HIGH - Late cancel policy |
| T-HP-05 | Duplicate training | Training exists | 1. Open menu 2. Click duplicate | Form opens with copied data, new date | MEDIUM - Productivity |
| T-HP-06 | Filter by status | Mixed trainings | 1. Click status filter | Only matching status shown | MEDIUM - Organization |
| T-HP-07 | Filter by time (Today/Week/All) | Various dates | 1. Toggle time filter | Correct trainings shown per filter | MEDIUM - Navigation |
| T-HP-08 | Navigate to training detail | Training exists | 1. Click on training card | Detail page opens with all info | HIGH - Core flow |
| T-HP-09 | Create recurring training | Client exists | 1. Enable recurring 2. Set weekly x4 3. Submit | 4 trainings created on correct dates | MEDIUM - Advanced feature |
| T-HP-10 | Process payment | Completed unpaid training | 1. Click pay 2. Confirm | Payment marked, credit adjusted | CRITICAL - Financial |

### 3.2 Unhappy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| T-UP-01 | Create training - no client | Form open | 1. Don't select client 2. Submit | Validation error | HIGH - Required field |
| T-UP-02 | Create training - past date | Form open | 1. Select yesterday 2. Submit | Warning or allowed with status options | MEDIUM - Historical entry |
| T-UP-03 | Complete already completed | Completed training | 1. Try to complete again | No-op or error, no double deduction | CRITICAL - Financial |
| T-UP-04 | Cancel already canceled | Canceled training | 1. Try to cancel again | No-op, UI reflects current state | LOW - Idempotency |
| T-UP-05 | Double-click complete | Training card | 1. Rapid double-click complete | Only one status change, one credit deduction | CRITICAL - Race condition |
| T-UP-06 | Delete training with exercises | Training has workout data | 1. Try to delete | Cascade or prevent based on policy | MEDIUM - Data relationships |
| T-UP-07 | Overlapping training times | Training at same time exists | 1. Create conflicting training | Warning or allowed (trainer decision) | LOW - Business rule |

### 3.3 Edge Cases

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| T-EC-01 | Training spanning midnight | N/A | 1. Create 23:30-00:30 session | Duration calculated correctly | LOW - Time math |
| T-EC-02 | Training duration 0 minutes | Form open | 1. Set duration 0 | Validation error | MEDIUM - Logic |
| T-EC-03 | Training duration 10 hours | Form open | 1. Set duration 600 min | Allowed with warning or validation error | LOW - Reasonable limits |
| T-EC-04 | 10 participants | Form open | 1. Set participant_count 10 | Correct pricing tier applied | MEDIUM - Pricing |
| T-EC-05 | 11 participants (over limit) | Form open | 1. Try to set 11 | Capped at 10 or validation error | LOW - Limits |
| T-EC-06 | Client with zero credit completing | Low credit client | 1. Complete training | Negative balance allowed or warning | MEDIUM - Policy decision |
| T-EC-07 | 1000 trainings in list | Heavy usage | 1. Load trainings page | Performant rendering, possible pagination | HIGH - Performance |

---

## 4. Exercises Module

### 4.1 Happy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| E-HP-01 | View exercise list | Exercises exist | 1. Navigate to Exercises | List loads with search/filter | MEDIUM - Library access |
| E-HP-02 | Search exercises | Multiple exercises | 1. Type search query | Matching exercises shown | MEDIUM - Usability |
| E-HP-03 | Filter by category | Categorized exercises | 1. Select category filter | Only matching exercises | LOW - Organization |
| E-HP-04 | Create custom exercise | User authenticated | 1. Click "+" 2. Fill form 3. Submit | Exercise added to library | MEDIUM - Customization |
| E-HP-05 | Edit exercise | User-created exercise | 1. Open exercise 2. Edit 3. Save | Changes saved | MEDIUM - Management |
| E-HP-06 | View exercise detail | Exercise exists | 1. Click on exercise | Detail page with instructions, videos | LOW - Information |
| E-HP-07 | View exercise analytics | Usage data exists | 1. Switch to analytics tab | Usage stats, popular exercises shown | LOW - Insights |

### 4.2 Unhappy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| E-UP-01 | Create exercise - empty name | Form open | 1. Leave name blank 2. Submit | Validation error | MEDIUM - Required |
| E-UP-02 | Delete exercise in use | Exercise used in trainings | 1. Try to delete | Warning shown, references handled | MEDIUM - Data integrity |
| E-UP-03 | Edit system exercise | System-provided exercise | 1. Try to edit | Prevented or creates user copy | LOW - Permissions |
| E-UP-04 | Invalid video URL | Form open | 1. Enter invalid URL | Validation error | LOW - Data quality |

### 4.3 Edge Cases

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| E-EC-01 | 2000+ exercises search | Large library | 1. Search with single char | Performant filtering | MEDIUM - Performance |
| E-EC-02 | Exercise with 100 muscle groups | Form open | 1. Select all muscles | Form handles, saves correctly | LOW - Limits |
| E-EC-03 | Duplicate exercise name | Same name exists | 1. Create with existing name | Allowed (possibly with warning) or unique constraint | LOW - Uniqueness |

---

## 5. Questionnaires Module

### 5.1 Pre-Diagnostic Questionnaire

#### Happy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| Q-HP-01 | Create invite for new client | User authenticated | 1. Open invite dialog 2. Enter email 3. Send | Invite created, link generated | HIGH - Onboarding |
| Q-HP-02 | Client fills questionnaire | Valid invite link | 1. Open link 2. Fill all sections 3. Submit | Responses saved, completion marked | CRITICAL - Data collection |
| Q-HP-03 | Trainer views responses | Completed questionnaire | 1. Open client 2. View pre-diagnostic | All answers visible, organized | HIGH - Consultation prep |
| Q-HP-04 | Assign questionnaire to existing client | Client exists | 1. Create invite for client | New questionnaire linked to client | MEDIUM - Repeat assessments |
| Q-HP-05 | Export questionnaire to PDF | Completed questionnaire | 1. Click export 2. Download | PDF generated with all data | MEDIUM - Documentation |

#### Unhappy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| Q-UP-01 | Submit incomplete questionnaire | Required fields empty | 1. Skip required questions 2. Submit | Validation errors shown | HIGH - Data completeness |
| Q-UP-02 | Expired invite link | Link older than expiry | 1. Open old link | Expired message, prompt to contact trainer | MEDIUM - Security/UX |
| Q-UP-03 | Invalid/fake token | Tampered URL | 1. Modify token in URL | Error page, no data access | CRITICAL - Security |
| Q-UP-04 | Double submit questionnaire | Form filled | 1. Click submit twice rapidly | Only one submission recorded | HIGH - Duplicate prevention |
| Q-UP-05 | Network error during submit | Long form filled | 1. Disable network 2. Submit | Error shown, data preserved for retry | CRITICAL - Data loss prevention |
| Q-UP-06 | Already completed token reused | Completed questionnaire | 1. Reopen same link | Shows completion message, no re-entry | MEDIUM - One-time use |

#### Edge Cases

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| Q-EC-01 | Very long text responses | Text fields | 1. Paste 5000 char response | Truncated or saved with limit message | LOW - Limits |
| Q-EC-02 | Special characters in responses | Text fields | 1. Enter <script>, SQL injection | Sanitized, stored safely | CRITICAL - Security |
| Q-EC-03 | All pain areas selected | Body map | 1. Select every pain area | All saved, UI handles gracefully | LOW - Edge |
| Q-EC-04 | Questionnaire on mobile | Mobile device | 1. Fill entire form on phone | Responsive, all inputs accessible | MEDIUM - Mobile UX |
| Q-EC-05 | Session timeout mid-form | Long form session | 1. Take 2+ hours to fill | Warn before timeout, save progress | MEDIUM - UX |

### 5.2 Feedback Questionnaire (Post-Training)

#### Happy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| F-HP-01 | Client submits feedback | Valid feedback link | 1. Open link 2. Rate items 3. Submit | Feedback saved, linked to training | HIGH - Insights |
| F-HP-02 | Trainer views feedback | Feedback submitted | 1. Open training detail | Feedback visible with ratings | MEDIUM - Review |
| F-HP-03 | Report pain in feedback | Form open | 1. Enable pain section 2. Mark areas 3. Submit | Pain data captured, flagged | HIGH - Health tracking |

#### Unhappy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| F-UP-01 | Submit empty feedback | Form open | 1. Submit without filling | Validation or minimum required | MEDIUM - Data quality |
| F-UP-02 | Expired feedback link | Old link | 1. Open expired link | Expired message | LOW - Time sensitivity |
| F-UP-03 | Rate all sliders at extremes | Form open | 1. Set all to 1 or 10 | Saved normally, perhaps flag for review | LOW - Valid data |

### 5.3 Nutrition Log / Questionnaire

#### Happy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| N-HP-01 | Client logs daily nutrition | Valid link | 1. Open link 2. Fill meals 3. Submit | Data saved, visible to trainer | MEDIUM - Tracking |
| N-HP-02 | Trainer views nutrition history | Client has entries | 1. Open client nutrition | Timeline of entries visible | LOW - Review |

---

## 6. Analytics / Statistics Module

### 6.1 Happy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| A-HP-01 | View finance statistics | Training history exists | 1. Open Statistics 2. Finance tab | Revenue, session counts accurate | HIGH - Business metrics |
| A-HP-02 | View exercise statistics | Exercise usage data | 1. Open Statistics 2. Exercises tab | Popular exercises, trends shown | MEDIUM - Insights |
| A-HP-03 | View client statistics | Multiple clients | 1. Open Statistics 2. Clients tab | Client distribution, activity | MEDIUM - Portfolio view |
| A-HP-04 | Filter by date range | Data exists | 1. Select custom date range | Charts update to range | MEDIUM - Flexibility |
| A-HP-05 | Export annual stats | Year of data | 1. Settings 2. Export annual | PDF/CSV with yearly summary | LOW - Reporting |

### 6.2 Unhappy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| A-UP-01 | Statistics with no data | New user | 1. Open Statistics | Empty state, no crash | MEDIUM - New user |
| A-UP-02 | Invalid date range | Date picker | 1. Set end before start | Validation error or swap dates | LOW - Input handling |
| A-UP-03 | Stats load timeout | Slow calculation | 1. Request heavy date range | Loading state, then data or timeout message | MEDIUM - Performance |

### 6.3 Edge Cases

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| A-EC-01 | 5 years of data | Long-term user | 1. View all-time stats | Charts handle large datasets | MEDIUM - Scale |
| A-EC-02 | Single day range | One day selected | 1. Set same start/end | Shows that day's data | LOW - Boundary |
| A-EC-03 | Future date range | Date picker | 1. Select next month | Empty or no data message | LOW - Logic |

---

## 7. Settings Module

### 7.1 Happy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| S-HP-01 | Change language | Any language | 1. Settings 2. Select other language | UI updates immediately | LOW - Preference |
| S-HP-02 | Update training prices | Settings open | 1. Go to prices 2. Update 3. Save | New prices apply to future trainings | HIGH - Financial |
| S-HP-03 | Create training package | Settings open | 1. Packages 2. Create 3. Save | Package available for purchase | MEDIUM - Product |
| S-HP-04 | Add custom tag | Settings open | 1. Tags 2. Create tag | Tag available for clients/trainings | LOW - Organization |
| S-HP-05 | Update company profile | Settings open | 1. Company 2. Update info 3. Save | Info appears on PDFs | LOW - Branding |
| S-HP-06 | Change password | Authenticated | 1. Change password section 2. Enter new 3. Submit | Password changed, can login with new | HIGH - Security |
| S-HP-07 | Configure feedback questions | Settings open | 1. Feedback settings 2. Customize questions | New questions appear in client forms | MEDIUM - Customization |
| S-HP-08 | Share calendar with colleague | Settings open | 1. Calendar sharing 2. Invite trainer | Colleague can view calendar | LOW - Collaboration |
| S-HP-09 | Export all data | Settings open | 1. Data export 2. Download | Complete data backup received | MEDIUM - Compliance |
| S-HP-10 | Force app refresh | Settings open | 1. App refresh 2. Clear cache | App reloads with fresh data | LOW - Troubleshooting |

### 7.2 Unhappy Paths

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| S-UP-01 | Invalid price (negative) | Price settings | 1. Enter -100 | Validation error | HIGH - Financial |
| S-UP-02 | Invalid price (text) | Price settings | 1. Enter "free" | Validation error | MEDIUM - Input |
| S-UP-03 | Weak password | Password change | 1. Enter "123" | Validation error, strength requirement | HIGH - Security |
| S-UP-04 | Password mismatch | Password change | 1. Enter different confirm | Validation error | MEDIUM - UX |
| S-UP-05 | Delete active package | Package in use | 1. Try to delete | Warning or prevent | MEDIUM - Data integrity |
| S-UP-06 | Share calendar - invalid email | Sharing settings | 1. Enter invalid email | Validation error | LOW - Input |

### 7.3 Edge Cases

| ID | Scenario | Preconditions | Steps | Expected Result | Failure Risk |
|----|----------|---------------|-------|-----------------|--------------|
| S-EC-01 | 100 custom tags | Many tags | 1. View tags list | All visible, possibly paginated | LOW - Scale |
| S-EC-02 | Very long company name | Company settings | 1. Enter 500 char name | Truncated or validation | LOW - Limits |
| S-EC-03 | Concurrent settings update | Two tabs | 1. Change price in tab A 2. Change in tab B | Last write wins, consistent | LOW - Concurrency |

---

## 8. Cross-Module & Chaos Testing

### 8.1 Navigation Chaos

| ID | Scenario | Steps | Expected Result | Failure Risk |
|----|----------|-------|-----------------|--------------|
| X-NC-01 | Rapid navigation | 1. Click Dashboard 2. Immediately click Clients 3. Immediately click Trainings | Final page loads, no zombie requests | MEDIUM - Race conditions |
| X-NC-02 | Back/forward spam | 1. Navigate through 5 pages 2. Spam back button 3. Spam forward | Navigation works, state correct | MEDIUM - History |
| X-NC-03 | Deep link cold start | 1. Open /clients/[id] directly | Page loads, auth checked | HIGH - Bookmarking |
| X-NC-04 | Invalid route | 1. Navigate to /nonexistent | 404 page shown | LOW - Error handling |

### 8.2 Action Interruption

| ID | Scenario | Steps | Expected Result | Failure Risk |
|----|----------|-------|-----------------|--------------|
| X-AI-01 | Close form mid-entry | 1. Fill half of form 2. Close dialog | Data discarded or save warning | LOW - UX |
| X-AI-02 | Navigate away during save | 1. Click save 2. Immediately navigate | Save completes, navigation proceeds | MEDIUM - Async |
| X-AI-03 | Refresh during mutation | 1. Click save 2. Refresh page | Either succeeds or fails cleanly | HIGH - Data integrity |
| X-AI-04 | Tab switch during load | 1. Start load 2. Switch tab 3. Return | Data loads correctly | LOW - Visibility API |

### 8.3 Concurrent Actions

| ID | Scenario | Steps | Expected Result | Failure Risk |
|----|----------|-------|-----------------|--------------|
| X-CA-01 | Two tabs same client | 1. Open client in 2 tabs 2. Edit in both | Both saves succeed, last wins | MEDIUM - Concurrency |
| X-CA-02 | Complete + cancel same training | 1. Two tabs 2. Complete in A 3. Cancel in B | Second action shows error or no-op | HIGH - State conflict |
| X-CA-03 | Bulk operation during single edit | 1. Bulk select 2. Edit single 3. Bulk delete | Clean error or block during edit | MEDIUM - Locking |

### 8.4 Network Chaos

| ID | Scenario | Steps | Expected Result | Failure Risk |
|----|----------|-------|-----------------|--------------|
| X-NET-01 | Offline during use | 1. Use app 2. Go offline 3. Try action | Offline banner, action queued or error | HIGH - Resilience |
| X-NET-02 | Slow 3G network | 1. Throttle to slow 3G 2. Use app | Loading states shown, no timeouts in normal use | MEDIUM - Performance |
| X-NET-03 | Intermittent connection | 1. Toggle online/offline rapidly | App recovers, no zombie states | MEDIUM - Stability |
| X-NET-04 | API 500 error | 1. Force backend error | Error toast, retry option | HIGH - Error handling |
| X-NET-05 | API 401 expired token | 1. Let token expire 2. Make request | Redirect to login, no data leak | CRITICAL - Security |

### 8.5 Input Chaos

| ID | Scenario | Steps | Expected Result | Failure Risk |
|----|----------|-------|-----------------|--------------|
| X-IN-01 | Paste huge text | 1. Paste 1MB text into notes | Truncated or rejected | LOW - DoS prevention |
| X-IN-02 | Emoji everywhere | 1. Use emojis in all text fields | Stored and displayed correctly | LOW - Unicode |
| X-IN-03 | RTL text input | 1. Enter Arabic/Hebrew text | Displayed correctly (or LTR acceptable) | LOW - i18n |
| X-IN-04 | SQL injection attempt | 1. Enter "'; DROP TABLE clients; --" | Safely stored as text | CRITICAL - Security |
| X-IN-05 | XSS attempt | 1. Enter "<script>alert('xss')</script>" | Safely escaped, no execution | CRITICAL - Security |

---

## 9. Security & Permissions

### 9.1 Authentication

| ID | Scenario | Steps | Expected Result | Failure Risk |
|----|----------|-------|-----------------|--------------|
| SEC-01 | Access protected route logged out | 1. Clear session 2. Navigate to /clients | Redirect to login | CRITICAL |
| SEC-02 | Valid login | 1. Enter correct credentials 2. Submit | Logged in, redirect to dashboard | CRITICAL |
| SEC-03 | Invalid login | 1. Enter wrong password 2. Submit | Error message, no access | CRITICAL |
| SEC-04 | Brute force protection | 1. Attempt 10 wrong passwords | Rate limit or lockout | HIGH |
| SEC-05 | Password reset flow | 1. Request reset 2. Click email link 3. Set new password | Password changed | HIGH |
| SEC-06 | Session timeout | 1. Wait for session expiry 2. Interact | Redirect to login | HIGH |
| SEC-07 | Logout clears session | 1. Logout 2. Back button | Login page, no data visible | HIGH |

### 9.2 Authorization (Data Isolation)

| ID | Scenario | Steps | Expected Result | Failure Risk |
|----|----------|-------|-----------------|--------------|
| SEC-08 | User A cannot see User B clients | 1. Login as A 2. Try to access B's client ID | Not found or forbidden | CRITICAL |
| SEC-09 | Public questionnaire isolation | 1. Access questionnaire 2. Try other tokens | Only own token's data accessible | CRITICAL |
| SEC-10 | Admin-only features | 1. Login as non-admin 2. Navigate to admin routes | Access denied | HIGH |
| SEC-11 | Owner-only features | 1. Login as admin (not owner) 2. Try owner features | Access denied | MEDIUM |

### 9.3 Public Pages Security

| ID | Scenario | Steps | Expected Result | Failure Risk |
|----|----------|-------|-----------------|--------------|
| SEC-12 | Public form - no token | 1. Access /feedback without token | Error page | HIGH |
| SEC-13 | Public form - expired token | 1. Access with old token | Expired message | MEDIUM |
| SEC-14 | Public form - completed token | 1. Access already-used token | Completion message, no re-entry | MEDIUM |
| SEC-15 | Token enumeration | 1. Try sequential tokens | No information leakage | HIGH |

---

## 10. Performance Testing

### 10.1 Load Scenarios

| ID | Scenario | Metric Target | Failure Risk |
|----|----------|---------------|--------------|
| PERF-01 | Dashboard initial load | < 2s | HIGH |
| PERF-02 | Client list with 500 clients | < 1s render | MEDIUM |
| PERF-03 | Training list with 1000 trainings | < 1s render | MEDIUM |
| PERF-04 | Exercise search typing | < 100ms per keystroke | MEDIUM |
| PERF-05 | Statistics calculation (1 year) | < 5s | MEDIUM |
| PERF-06 | PDF export generation | < 10s | LOW |
| PERF-07 | Form submit response | < 500ms | HIGH |
| PERF-08 | Image/media upload | Progress shown, < 30s for 10MB | MEDIUM |

### 10.2 Memory & Stability

| ID | Scenario | Steps | Expected Result | Failure Risk |
|----|----------|-------|-----------------|--------------|
| PERF-09 | Extended session (2+ hours) | 1. Use app continuously | No memory leaks, responsive | MEDIUM |
| PERF-10 | Repeated navigation | 1. Navigate 100 times | No degradation | LOW |
| PERF-11 | Large chart rendering | 1. View analytics with 10k data points | Charts render, possibly sampled | MEDIUM |

---

## Appendix: Testing Checklist Template

### Pre-Release Checklist

- [ ] All P0 (CRITICAL) scenarios passing
- [ ] All P1 (HIGH) scenarios passing  
- [ ] No console errors in happy paths
- [ ] Mobile responsiveness verified
- [ ] Offline handling verified
- [ ] Authentication flows verified
- [ ] Credit/financial flows verified
- [ ] Public questionnaire flows verified
- [ ] Data export functional
- [ ] Cross-browser testing (Chrome, Safari, Firefox)

### Regression Testing Focus

1. **After any client changes:** C-HP-01 through C-HP-03, C-UP-07
2. **After any training changes:** T-HP-01 through T-HP-05, T-UP-05
3. **After any financial changes:** T-HP-02, T-HP-10, C-HP-07
4. **After any questionnaire changes:** Q-HP-01 through Q-HP-03, Q-UP-04
5. **After any auth changes:** SEC-01 through SEC-07

---

**Document maintained by:** QA Team  
**Review frequency:** Before each release
