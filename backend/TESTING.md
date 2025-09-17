# Unit Test Report

This document provides a detailed report of the unit tests for the services in this project.

## How to Run Tests

```bash
# unit tests
$ npm test
```

## Test Cases

### ArticleCategoriesService

- `should create a new article category successfully`
- `should return all categories for a customer`
- `should return empty array when no categories found`
- `should return all unique subcategories for a customer`
- `should return empty array when no subcategories found`
- `should update an article category successfully`
- `should delete an article category successfully`
- `should find and return a category by id and customerId`
- `should throw NotFoundException when category not found`

### ArticlesService

- `should be defined`
- `should create an article and send notification if published`
- `should create an article without sending notification if not published`
- `should return a paginated list of articles`
- `should filter articles by categoryId, status, and search`
- `should return a single article`
- `should throw NotFoundException if article not found`
- `should update an article and send notification if status changes to published`
- `should update an article without sending notification if status does not change to published`
- `should throw NotFoundException if article to update not found`
- `should remove an article`
- `should throw NotFoundException if article to remove not found`
- `should transform an article object correctly`
- `should handle null Category and Creator`

### CustomersService

- `should be defined`
- `should create a customer successfully`
- `should throw ConflictException when owner is not found`
- `should throw ConflictException when owner is superadmin`
- `should throw ConflictException when owner is customer success`
- `should throw ConflictException when subscription does not exist`
- `should throw ConflictException when customer success manager is not found`
- `should throw ConflictException when customer success is not a customer success role`
- `should throw ConflictException when customer success is already assigned`
- `should return paginated customers without filters`
- `should apply filters correctly`
- `should return customer by id`
- `should throw NotFoundException when customer not found`
- `should update customer successfully`
- `should throw NotFoundException when customer not found`
- `should throw ConflictException when subscription does not exist`
- `should update owner when ownerId is provided`
- `should return all customers for taxonomy when customerId is null`
- `should return specific customer for taxonomy when customerId is provided`
- `should throw ConflictException as delete is not supported`
- `should throw ConflictException when customer with same name exists`
- `should throw ConflictException when customer with same email exists`
- `should throw ConflictException when customer with same owner exists`
- `should throw ConflictException when customer with same domain exists`
- `should not throw when subscription exists`
- `should throw ConflictException when subscription does not exist`
- `should not throw when subscriptionId is undefined`
- `should not throw when manager exists and is customer success`
- `should throw ConflictException when manager is not found`
- `should throw ConflictException when manager is not customer success`
- `should throw ConflictException when manager is already assigned`
- `should not throw when managerId is undefined`
- `should not throw when owner exists and is valid`
- `should throw ConflictException when owner is not found`
- `should throw ConflictException when owner is superadmin`
- `should throw ConflictException when owner is customer success`

### NotificationsService

- `should be defined`
- `should create notifications for all users of a customer if only customerId is provided`
- `should create a single notification if userId is provided`
- `should throw ConflictException if no users found for customer`
- `should throw ConflictException if neither userId nor customerId is provided`
- `should return a notification if found`
- `should throw NotFoundException if notification not found`
- `should return a paginated list of notifications for a user`
- `should return a paginated list of notifications for admin`
- `should mark a notification as read`
- `should throw NotFoundException if notification not found`
- `should mark all unread notifications for a user as read`
- `should mark multiple notifications as read`
- `should return the count of unread notifications for a user`
- `should send an in-app notification if conditions are met`
- `should not send an in-app notification if userId is missing`
- `should not send an in-app notification if customerId is missing`
- `should not send an in-app notification if type is not IN_APP`
- `should send unread count notification`

### TemplatesService

- `should be defined`
- `should return a paginated list of notification templates`

### UsersService

- `should create a user successfully`
- `should throw ConflictException if user already exists`
- `should create user without sending invite when skipInvite is true`
- `should handle database errors during user creation`
- `should create a system admin user successfully`
- `should create a customer success user with customer ID`
- `should throw ConflictException for invalid system role`
- `should throw ConflictException if customer not found for customer success role`
- `should update a system user successfully`
- `should throw ConflictException if user not found`
- `should invite a user successfully`
- `should throw ConflictException if customer not found`
- `should resend invite email successfully`
- `should throw ConflictException if user is already active`
- `should return exists: true when email exists`
- `should return exists: false when email does not exist`
- `should return array of existing emails`
- `should return paginated users`
- `should return user with permissions`
- `should throw NotFoundException if user not found`
- `should update user successfully`
- `should throw ConflictException if user not found`
- `should create new user and customer for new domain`
- `should return existing user if uid already exists`
- `should send invite email successfully`
- `should throw ConflictException for active user`
- `should validate and void one-time code successfully`
- `should return false for invalid or expired code`
- `should send reset password email successfully`
- `should throw NotFoundException if user not found`
- `should throw ConflictException if user is not active`
- `should soft delete user successfully`
- `should throw ConflictException for superadmin user`
- `should throw NotFoundException if user not found`
- `should generate random string of specified length`
- `should generate different strings on multiple calls`
- `should apply order parameters correctly for name field`
- `should apply order parameters correctly for other fields`
- `should use default values when parameters are undefined`
- `should throw ConflictException for invalid order by field`
