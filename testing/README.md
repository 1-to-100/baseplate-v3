# 📋 Automated Testing Report

**Total: 20 automated tests**
---

## 📚 "Documentation" Section

### 📁 Category Creation (`createCategory.spec.ts`)
**Covered scenarios:**
• Creating a new category as System Administrator
• Creating a new category as Customer Success
• Creating a new category as User with All Permissions

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
• Creating a new article as Customer Success
• Creating a new article as User with All Permissions

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
• Adding a single user as Customer Success
• Adding a single user as User with All Permissions

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
• Bulk adding new users as Customer Success
• Bulk adding new users as User with All Permissions

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
• Checking absence of impersonation button for inactive users as Customer Success
• Checking "Viewer" role permissions through impersonation as System Administrator
• Checking "Creator" role permissions through impersonation as System Administrator
• Checking "Editor" role permissions through impersonation as System Administrator
• Checking "Manager" role permissions through impersonation as System Administrator
• Checking "Viewer" role permissions through impersonation as Customer Success
• Checking "Creator" role permissions through impersonation as Customer Success
• Checking "Editor" role permissions through impersonation as Customer Success
• Checking "Manager" role permissions through impersonation as Customer Success

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
• Self-registration of new user as Customer Admin
• User registration with same work domain

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

## 📊 Detailed Coverage Statistics

### By user types:
- **System Administrator**: 8 tests
- **Customer Success**: 8 tests  
- **User with All Permissions**: 4 tests

### By functionality:
- **Documentation**: 6 tests
- **User Management**: 12 tests
- **Role Settings**: 5 tests
- **Authorization**: 2 tests

### By test types:
- **Positive tests**: 19 tests
- **Negative tests**: 1 test

---

## 🎯 Conclusions

✅ **20 automated tests** cover all critical user paths

✅ **4 main sections** of the application are tested

✅ **Different user types** verified for permission compliance

✅ **End-to-end scenarios** include email notifications and activation

✅ **User impersonation** fully tested for all roles

✅ **Reliable cleanup** of data between tests

✅ **API integration** for creating test data

✅ **Access rights validation** at all levels (users, categories, articles)

---

## 🚀 Running Tests

```bash
# Run all tests
npm run test

# Run tests for specific section
npm run test:userManagement
npm run test:documentation
npm run test:roleSettings
npm run test:authorization

# Run specific test
npm run test -- --grep "impersonateUser"
``` 