# 📋 Automated Testing Report

## **Total: 34 automated tests**

## 📚 "Documentation" Section

### 📁 Category Creation (`createCategory.spec.ts`)

**Covered scenarios:**
• Creating a new category as System Administrator
• Creating a new category as Manager
• Creating a new category as Standard User

**Verifications:**
• Opening the "Add Category" modal window
• Filling in category name and description
• Selecting subcategory
• Choosing random icon
• Confirming category creation
• Checking success message
• Searching for created category
• Validating category data (name, subcategory, article count, icon)

### 📄 Article Creation (`createArticle.spec.ts`)

**Covered scenarios:**
• Creating a new article as System Administrator
• Creating a new article as Manager
• Creating a new article as Standard User

**Verifications:**
• Creating category for article
• Opening category articles page
• Checking breadcrumbs (Documentation → Category Name)
• Checking messages about missing articles
• Opening article creation form
• Filling in article data (name, category, subcategory, video link, text)
• Checking article preview
• Saving as draft
• Checking article data in table (name, edit date, status, performance)
• Editing article
• Publishing article
• Checking status change to "Published"

---

## 👥 "User Management" Section

### 👤 Adding Single User (`addSingleUser.spec.ts`)

**Covered scenarios:**
• Adding a single user as System Administrator

**Verifications:**
• Opening "Add User" modal window
• Filling in user data (first name, last name, email)
• Selecting role and client
• Saving user
• Checking success message
• Validating added user in table
• Checking "Inactive" status
• Verifying email invitation sending
• Activating user through email link
• Checking status change to "Active"
• Checking activated user login

### 👥 Bulk User Addition (`addMultipleUsers.spec.ts`)

**Covered scenarios:**
• Bulk adding new users as System Administrator

**Verifications:**
• Opening "Invite User" modal window
• Selecting role and client
• Adding multiple email addresses
• Sending invitations
• Checking success message
• Validating added users in table
• Checking "Inactive" status
• Verifying email invitation sending
• Activating user through email link
• Checking status change to "Active"

### 🎭 User Impersonation (`impersonateUser.spec.ts`)

**Covered scenarios:**
• Checking absence of impersonation button for inactive users as System Administrator
• Checking "Standard User" role permissions through impersonation as System Administrator
• Checking "Manager" role permissions through impersonation as System Administrator

**Verifications:**
• Creating roles via API under administrator
• Assigning roles to existing user
• Checking absence of impersonation button for inactive users
• Impersonating user with assigned role
• Checking access rights to "User Management" page
• Checking rights for editing/deleting/creating users
• Checking access rights to "Documentation" page
• Checking rights for editing/deleting/creating categories
• Checking rights for editing/deleting/creating articles
• Creating documentation via API if missing
• Checking documentation details and article permissions

---

## 🔐 "Role Settings" Section

### 🎭 Creating New Roles (`createNewRole.spec.ts`)

**Covered scenarios:**
• Creating "Viewer" role as system administrator
• Creating "Creator" role as system administrator
• Creating "Editor" role as system administrator
• Creating "Manager" role as system administrator
• Creating role with invalid data (negative test)

**Verifications:**
• Opening "Role Settings" page
• Creating new role with name and description
• Including "User Management" and "Documents" permissions
• Selecting specific permissions for each role
• Checking selected permissions
• Creating role
• Validating role creation in list
• Assigning role to user
• Checking role assignment
• Testing user permissions with new role:

- Access to "User Management" page
- Restrictions on editing/deleting users
- Access to "Documentation" page
- Restrictions on editing/deleting categories and articles
  • Checking required field validation
  • Checking field length restrictions
  • Checking permission requirements

---

## 🔑 "Authorization" Section

### 📝 Registration (`registration.spec.ts`)

**Covered scenarios:**
• Self-registration of new user as Standard User
• Self-registration of user with the same work-email domain as Customer Admin
• Registration with invalid data (negative test)

**Verifications:**
• Generating temporary email address
• Filling registration form (first name, last name, email, password)
• Confirming email through modal window
• Checking user creation in system
• Validating "Inactive" status
• Checking client creation
• Confirming registration through email
• Checking status change to "Active"
• Checking user data after activation

---

## 🔔 "Notification Management" Section

### 📨 Send Single In-App Notifications (`sendNotificationInApp.spec.ts`)

**Covered scenarios:**
• Send "Warning" notification in app as System Administrator
• Send "Alert" notification in app as System Administrator
• Send "Info" notification in app as System Administrator
• Send "Article" notification in app as System Administrator

### 📬 Send Multi In-App Notifications (`sendMultiNotificationInApp.spec.ts`)

**Covered scenarios:**
• Send multi "Warning" notification in app as System Administrator
• Send multi "Alert" notification in app as System Administrator
• Send multi "Info" notification in app as System Administrator
• Send multi "Article" notification in app as System Administrator

### ✏️ Edit Notifications (`editNotification.spec.ts`)

**Covered scenarios:**
• Edit notification from EMAIL to IN_APP as System Administrator
• Edit notification from IN_APP to EMAIL as System Administrator

### 📋 Notification Details (`notificationDetails.spec.ts`)

**Covered scenarios:**
• Check notification details as System Administrator

### 📜 Notification History (`notificationHistory.spec.ts`)

**Covered scenarios:**
• Check notification history filters as System Administrator (Type, Channel, User, Customer filters)

### ❌ Negative Validation (`negativeValidation.spec.ts`)

**Covered scenarios:**
• Check validation errors for empty required fields in "Add notification" modal

**Verifications (Send Single/Multi Notifications):**
• Login as System Administrator
• Select customer from dropdown
• Navigate to Notification Management page
• Create new notification with unique title and text
• Select notification type (In-App) and channel (Warning/Alert/Info/Article)
• Save notification and verify success message
• Search for created notification in table
• Verify notification data in table (title, message, type, channel)
• Open "more" menu for notification
• Select "Send" action and verify modal
• Configure recipient using API to fetch user data dynamically (single) or select customers (multi)
• Send notification and verify success message
• Logout from sender account
• Login as recipient user(s)
• Verify notification icon appears
• Open notifications modal
• Verify notification content (title and text)
• Mark notification as read
• Verify notification icon disappears
• Cleanup: Delete all notifications after each test

**Key Features:**
• **Dynamic recipient selection** using API calls to fetch real user data
• **Comprehensive verification** of notification creation, sending, and receipt
• **All notification channels** covered (Warning, Alert, Info, Article)
• **End-to-end workflow** from creation to receipt and read status
• **Automatic cleanup** to ensure test isolation
• **Multi-recipient support** for sending to multiple users via customer selection

---

## 👨‍💼 "System Users" Section

### ➕ Adding System Users (`addSystemUser.spec.ts`)

**Covered scenarios:**
• Add system user with "Customer Success" role
• Add system user with "System Administrator" role

**Verifications:**
• Login as System Administrator
• Navigate to System Users page
• Open "Add system user" modal
• Fill user data (first name, last name, email)
• Select customer and system role (for Customer Success) or system role only (for System Administrator)
• Save user and verify success message
• Verify user was added in table with correct data
• Check "Inactive" status
• Verify invitation email was sent
• Activate user through email link
• Complete profile setup
• Verify user can login with new credentials
• Check navigation tabs visibility based on role
• Verify user status changes to "Active"

---

## 🏢 "Customer Management" Section

### 👤 Adding Customer Manager (`addCustomerManager.spec.ts`)

**Covered scenarios:**
• Create new customer manager with Basic role

**Verifications:**
• Create user via registration
• Activate user and verify login
• Login as System Administrator
• Navigate to Customer Management page
• Open "Add customer" modal
• Fill customer name
• Select customer administrator
• Verify email field is populated
• Select Basic subscription
• Select Customer Success Manager
• Save customer and verify success message

---

## 📊 Detailed Coverage Statistics

### By user types:

- **System Administrator**: 25 tests
- **Manager**: 2 tests
- **Standard User**: 2 tests
- **Customer Success**: 0 active tests (multiple skipped)

### By functionality:

- **Documentation**: 6 tests
- **User Management**: 5 tests
- **Role Settings**: 5 tests
- **Authorization**: 3 tests
- **Notification Management**: 13 tests
- **System Users**: 2 tests
- **Customer Management**: 0 active tests (1 skipped)

### By test types:

- **Positive tests**: 32 tests
- **Negative tests**: 2 tests

---

## 🎯 Conclusions

✅ **34 automated tests** cover all critical user paths

✅ **7 main sections** of the application are tested

✅ **Different user types** verified for permission compliance (System Administrator, Manager, Standard User)

✅ **End-to-end scenarios** include email notifications and activation

✅ **User impersonation** tested for Standard User and Manager roles

✅ **Notification system** comprehensively tested:
  - Single and multi-recipient notifications
  - All notification channels (Warning, Alert, Info, Article)
  - Notification editing and details
  - Notification history with filters
  - Negative validation

✅ **System users management** tested for Customer Success and System Administrator roles

✅ **Reliable cleanup** of data between tests

✅ **API integration** for creating test data and dynamic user selection

✅ **Access rights validation** at all levels (users, categories, articles, notifications)

---

## 🚀 Running Tests

### 📋 Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Copy the example environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```
   
   See [`.env.example`](.env.example) for required environment variables:
   - `BASE_URL` - Base URL of the application
   - `API_URL` - API endpoint URL
   - `SUPABASE_API_URL` - Supabase API URL
   - `SUPABASE_API_KEY` - Supabase API key
   - `ADMIN` - System Administrator email
   - `BASE_PASSWORD` - Base password for test users
   - `CUSTOMER` - Customer Success user email
   - `USER_FOR_ROLES` - User email for role testing
   - `MANAGER` - Manager user email
   - `STANDARD_USER` - Standard User email
   - `MAIL_GENERATOR` - Email generator service configuration

3. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

### 🏃 Running Tests

```bash
# Run all tests
npm run test

# Run tests for specific section
npm run test -- src/tests/userManagement
npm run test -- src/tests/documentation
npm run test -- src/tests/roleSettings
npm run test -- src/tests/authorization
npm run test -- src/tests/notificationManagement
npm run test -- src/tests/systemUsers

# Run specific test file
npm run test -- src/tests/userManagement/impersonateUser.spec.ts

# Run tests with specific grep pattern
npm run test -- --grep "impersonateUser"

# Run tests in headed mode (see browser)
npm run test -- --headed

# Run tests with UI mode
npm run test -- --ui
```
