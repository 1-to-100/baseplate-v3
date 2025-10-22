import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { UsersService } from '@/users/users.service';
import { CustomersService } from '@/customers/customers.service';
import { ArticlesService } from '@/articles/articles.service';
import { ArticleCategoriesService } from '@/article-categories/article-categories.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { TemplatesService } from '@/notifications/templates.service';
import { SubscriptionSeederService } from '../services/subscription-seeder.service';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { OutputArticleCategoryDto } from '@/article-categories/dto/output-article-category.dto';
import { UserSystemRoles } from '@/common/constants/user-system-roles';
import { NotificationTypes } from '@/notifications/constants/notification-types';
import { NotificationChannel } from '@/notifications/constants/notification-channel';

@Injectable()
export class SeedCommand {
  private readonly logger = new Logger(SeedCommand.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly usersService: UsersService,
    private readonly customersService: CustomersService,
    private readonly articlesService: ArticlesService,
    private readonly articleCategoriesService: ArticleCategoriesService,
    private readonly notificationsService: NotificationsService,
    private readonly templatesService: TemplatesService,
    private readonly subscriptionSeederService: SubscriptionSeederService,
  ) {}

  async execute(): Promise<void> {
    this.logger.log('Starting test data seeding...');

    try {
      // Check if test customer already exists
      const existingCustomer = await this.database.findFirst('customers', {
        where: { name: 'Test Customer Inc.' },
      });

      if (existingCustomer) {
        this.logger.warn(
          'Test customer already exists. Use cleanup command first.',
        );
        return;
      }

      // Seed basic subscriptions first
      await this.subscriptionSeederService.seedBasicSubscriptions();

      // Get the Professional subscription for the test customer (or Free if Professional doesn't exist)
      let subscription =
        await this.subscriptionSeederService.getSubscriptionByName(
          'Professional',
        );
      if (!subscription) {
        subscription =
          await this.subscriptionSeederService.getSubscriptionByName('Free');
      }

      // Create customer owner (superadmin user)
      const owner = await this.createOwner();

      // Create customer
      const customer = await this.createCustomer(owner.id, subscription!.id);

      // Create customer success user
      const customerSuccess = await this.createCustomerSuccess(customer.id);

      // Create regular users
      const users = await this.createUsers(customer.id);

      // Create article categories
      const categories = await this.createArticleCategories(
        customer.id,
        users[0].id,
      );

      // Create articles (documents) - created by customer owner
      const articles = await this.createArticles(
        customer.id,
        owner.id,
        categories,
      );

      // Create notifications
      await this.createNotifications(customer.id, users);

      // Create notification templates
      const templates = await this.createNotificationTemplates(customer.id);

      this.logger.log('Test data seeding completed successfully!');
      this.logger.log(
        `Created customer: ${customer.name} (ID: ${customer.id})`,
      );
      this.logger.log(`Created ${users.length} users`);
      this.logger.log(`Created ${categories.length} article categories`);
      this.logger.log(`Created ${articles.length} articles`);
      this.logger.log(`Created ${templates.length} notification templates`);
      this.logger.log(
        `Created customer success user: ${customerSuccess.email}`,
      );
    } catch (error) {
      this.logger.error('Error seeding test data:', error);
      throw error;
    }
  }

  private async createOwner() {
    this.logger.log('Creating customer owner...');
    return this.usersService.create(
      {
        email: 'owner@testcustomer.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'active',
      },
      true,
    ); // Skip invite email
  }

  private async createCustomer(ownerId: string, subscriptionId: string) {
    this.logger.log('Creating customer...');
    return this.customersService.create({
      name: 'Test Customer Inc.',
      subscriptionId,
      ownerId,
    });
  }

  private async createCustomerSuccess(customerId: string) {
    this.logger.log('Creating customer success user...');
    return this.usersService.createSystemUser(
      {
        email: 'success@testcustomer.com',
        firstName: 'Jane',
        lastName: 'Smith',
        status: 'active',
        systemRole: UserSystemRoles.CUSTOMER_SUCCESS,
        customerId,
      },
      true,
    ); // Skip invite email
  }

  private async createUsers(customerId: string): Promise<OutputUserDto[]> {
    this.logger.log('Creating regular users...');
    const users: OutputUserDto[] = [];

    const userData = [
      {
        email: 'user1@testcustomer.com',
        firstName: 'Alice',
        lastName: 'Johnson',
      },
      { email: 'user2@testcustomer.com', firstName: 'Bob', lastName: 'Wilson' },
      {
        email: 'user3@testcustomer.com',
        firstName: 'Carol',
        lastName: 'Brown',
      },
    ];

    for (const userInfo of userData) {
      const user = await this.usersService.create(
        {
          ...userInfo,
          customerId,
          status: 'active',
        },
        true,
      ); // Skip invite email
      users.push(user);
    }

    return users;
  }

  private async createArticleCategories(
    customerId: string,
    createdBy: string,
  ): Promise<OutputArticleCategoryDto[]> {
    this.logger.log('Creating article categories...');
    const categories: OutputArticleCategoryDto[] = [];

    const categoryData = [
      {
        name: 'Getting Started',
        subcategory: 'Basics',
        about: 'Basic information for new users',
      },
      {
        name: 'User Guide',
        subcategory: 'Tutorials',
        about: 'Step-by-step tutorials',
      },
      {
        name: 'API Documentation',
        subcategory: 'Technical',
        about: 'Technical API documentation',
      },
      {
        name: 'Troubleshooting',
        subcategory: 'Support',
        about: 'Common issues and solutions',
      },
    ];

    for (const categoryInfo of categoryData) {
      const category = await this.articleCategoriesService.create({
        ...categoryInfo,
        customerId,
        createdBy,
      });
      categories.push(category);
    }

    return categories;
  }

  private async createArticles(
    customerId: string,
    createdBy: string,
    categories: OutputArticleCategoryDto[],
  ) {
    this.logger.log('Creating articles...');
    const articles: any[] = [];

    const articleData = [
      {
        title: 'Welcome to Test Customer Platform',
        content:
          '<div class="article-content"><h1>Welcome to Test Customer Platform</h1><p>This is a comprehensive guide to get you started with our platform. You will learn about the basic features and how to navigate the system.</p><h2>Getting Started</h2><p>Our platform provides a complete solution for managing your business operations with enterprise-grade security and scalability.</p></div>',
        status: 'published',
        articleCategoryId: categories[0].id,
        subcategory: 'Introduction',
      },
      {
        title: 'Baseplate Framework Overview',
        content: `<div class="article-content">
          <h1>Baseplate Framework - Your Complete B2B SaaS Foundation</h1>
          
          <h2>What is Baseplate?</h2>
          <p>Baseplate is a code framework for rapidly building enterprise-grade, function-specific B2B SaaS solutions. The purpose is to accelerate the launch of new B2B Technology companies. By offering a standard application foundation, the solution frees product teams to focus on innovation rather than re-implementation of common functions.</p>
          
          <p>By utilizing a standardized backend (Next.js + PostgreSQL), frontend (React + Material UI) and hosting environment (Supabase - a standard Platform as a Service platform) - it provides the out of the box functions needed to rapidly create and deploy business focused SaaS applications.</p>
          
          <h2>Key Features</h2>
          
          <h3>🏗️ Full-Stack Architecture</h3>
          <ul>
            <li><strong>Next.js Frontend</strong> - Modern React-based user interface</li>
            <li><strong>NestJS Backend</strong> - Scalable Node.js API server</li>
            <li><strong>Supabase Integration</strong> - Authentication, database, and storage</li>
            <li><strong>Docker Deployment</strong> - Containerized for easy deployment</li>
          </ul>
          
          <h3>🔐 Enterprise Security</h3>
          <ul>
            <li>Multi-provider OAuth support (Google, LinkedIn, Microsoft)</li>
            <li>JWT-based authentication</li>
            <li>Role-based access control (RBAC)</li>
            <li>Customer isolation and data protection</li>
          </ul>
          
          <h3>📊 Built-in Features</h3>
          <ul>
            <li>User management and customer onboarding</li>
            <li>Subscription management with multiple tiers</li>
            <li>Document management system</li>
            <li>Notification system (email and in-app)</li>
            <li>API logging and monitoring</li>
            <li>Comprehensive admin dashboard</li>
          </ul>
          
          <h2>Target Users</h2>
          <p>The primary users for Baseplate are development teams building business focused SaaS applications. Baseplate assumes the teams are made up of a mix of Product Managers, Full Stack Developers and Quality Assurance Automation Engineers.</p>
          
          <h2>Business Goals</h2>
          <ul>
            <li><strong>Speed to Market</strong>: Launch new SaaS products far more quickly</li>
            <li><strong>Consistency and Reliability</strong>: Uniform user experience in a secure and scalable fashion</li>
            <li><strong>Cost-Effectiveness</strong>: Reducing repeated development efforts significantly cuts costs</li>
            <li><strong>Scalability</strong>: Highly scalable environment that can handle growth</li>
            <li><strong>Accelerated Innovation</strong>: Focus on market-differentiating features</li>
          </ul>
          
          <h2>Documentation & Support</h2>
          <p>For more information, visit our official documentation at <a href="https://1to100.com/baseplate/" target="_blank">https://1to100.com/baseplate/</a></p>
        </div>`,
        status: 'published',
        articleCategoryId: categories[0].id,
        subcategory: 'Platform Overview',
      },
      {
        title: 'Baseplate Technical Implementation Guide',
        content: `<div class="article-content">
          <h1>Baseplate Technical Implementation Guide</h1>
          
          <h2>Technology Stack</h2>
          
          <h3>Frontend Technologies</h3>
          <ul>
            <li><strong>Next.js 14+</strong> - React framework with App Router</li>
            <li><strong>TypeScript</strong> - Type-safe development</li>
            <li><strong>Tailwind CSS</strong> - Utility-first styling</li>
            <li><strong>Supabase Client</strong> - Real-time data synchronization</li>
          </ul>
          
          <h3>Backend Technologies</h3>
          <ul>
            <li><strong>NestJS</strong> - Enterprise Node.js framework</li>
            <li><strong>Prisma ORM</strong> - Type-safe database access</li>
            <li><strong>PostgreSQL</strong> - Robust relational database</li>
            <li><strong>JWT Authentication</strong> - Secure token-based auth</li>
          </ul>
          
          <h3>Infrastructure</h3>
          <ul>
            <li><strong>Docker & Docker Compose</strong> - Containerized deployment</li>
            <li><strong>Supabase</strong> - Backend-as-a-Service</li>
            <li><strong>GitHub Actions</strong> - CI/CD pipeline ready</li>
          </ul>
          
          <h2>Getting Started</h2>
          
          <h3>Prerequisites</h3>
          <ul>
            <li>Docker + Docker Compose</li>
            <li>Node.js (v22)</li>
            <li>Git</li>
            <li>Supabase account</li>
          </ul>
          
          <h3>Quick Setup</h3>
          <pre><code># Clone the repository
git clone https://github.com/1-to-100/baseplate.git
cd baseplate/

# Clone sub-repositories
git clone -b dev https://github.com/1-to-100/stock-app.git
git clone -b dev https://github.com/1-to-100/stock-app-api.git

# Configure environment
cp .env.app.template ./stock-app/.env
cp .env.api.template ./stock-app-api/.env

# Start with Docker
docker compose up</code></pre>
          
          <h2>Development Environment</h2>
          
          <h3>Running Without Docker</h3>
          <ol>
            <li><strong>Install Node.js 22 using NVM</strong></li>
            <li><strong>Install pnpm</strong>: <code>npm install -g pnpm</code></li>
            <li><strong>Start Frontend</strong>: <code>cd stock-app && pnpm install && pnpm dev</code></li>
            <li><strong>Start Backend</strong>: <code>cd stock-app-api && npm install && npm run prisma:generate && npx prisma migrate deploy && npm run start:dev</code></li>
          </ol>
          
          <h2>API Documentation</h2>
          <p>The backend provides Swagger documentation available at <a href="http://localhost:3001/api" target="_blank">http://localhost:3001/api</a> when running locally.</p>
          
          <h2>Database Management</h2>
          <p>Run database migration with:</p>
          <pre><code>docker compose exec stock-app-api npx prisma migrate deploy</code></pre>
          
          <h2>Services</h2>
          <ul>
            <li><strong>Frontend</strong>: <a href="http://localhost:3000" target="_blank">http://localhost:3000</a></li>
            <li><strong>Backend API</strong>: <a href="http://localhost:3001" target="_blank">http://localhost:3001</a></li>
          </ul>
          
          <h2>GitHub Repository</h2>
          <p>For the complete source code and technical details, visit our <a href="https://github.com/1-to-100/baseplate" target="_blank">GitHub repository</a>.</p>
        </div>`,
        status: 'published',
        articleCategoryId: categories[2].id,
        subcategory: 'Technical Guide',
      },
      {
        title: 'How to Create Your First Document',
        content:
          '<div class="article-content"><h1>How to Create Your First Document</h1><p>Learn how to create, edit, and manage documents in our system. This tutorial covers all the essential features you need to know.</p><h2>Step-by-Step Guide</h2><ol><li>Navigate to the Documents section</li><li>Click the "Create New Document" button</li><li>Choose your document template</li><li>Add your content using our rich text editor</li><li>Set permissions and visibility</li><li>Publish your document</li></ol></div>',
        status: 'published',
        articleCategoryId: categories[1].id,
        subcategory: 'Tutorial',
      },
      {
        title: 'API Authentication Guide',
        content:
          '<div class="article-content"><h1>API Authentication Guide</h1><p>Complete guide on how to authenticate with our API using various methods including API keys, OAuth, and JWT tokens.</p><h2>Authentication Methods</h2><h3>JWT Tokens</h3><p>Use JWT tokens for secure API access. Include the token in the Authorization header.</p><h3>OAuth 2.0</h3><p>Support for Google, LinkedIn, and Microsoft OAuth providers.</p><h3>API Keys</h3><p>Generate API keys from your account settings for programmatic access.</p></div>',
        status: 'draft',
        articleCategoryId: categories[2].id,
        subcategory: 'Authentication',
      },
      {
        title: 'Common Login Issues',
        content:
          '<div class="article-content"><h1>Common Login Issues</h1><p>Troubleshooting guide for common login problems including password reset, account lockout, and two-factor authentication issues.</p><h2>Password Issues</h2><p>If you cannot log in, try resetting your password using the "Forgot Password" link.</p><h2>Account Lockout</h2><p>Multiple failed login attempts may temporarily lock your account. Wait 15 minutes before trying again.</p><h2>Two-Factor Authentication</h2><p>Ensure you have access to your authenticator app or backup codes.</p></div>',
        status: 'published',
        articleCategoryId: categories[3].id,
        subcategory: 'Login',
      },
      {
        title: 'Advanced User Management',
        content:
          '<div class="article-content"><h1>Advanced User Management</h1><p>Learn about advanced user management features including role assignment, permissions, and bulk operations.</p><h2>Role Management</h2><p>Assign roles to users based on their responsibilities and access needs.</p><h2>Permission System</h2><p>Fine-tune access control with granular permissions for different features.</p><h2>Bulk Operations</h2><p>Perform bulk user operations for efficient management of large user bases.</p></div>',
        status: 'published',
        articleCategoryId: categories[1].id,
        subcategory: 'Advanced',
      },
    ];

    for (const articleInfo of articleData) {
      const article = await this.articlesService.create({
        ...articleInfo,
        customerId,
        createdBy,
      });
      articles.push(article);
    }

    return articles;
  }

  private async createNotifications(
    customerId: string,
    users: OutputUserDto[],
  ) {
    this.logger.log('Creating notifications...');

    // Define notification types and their corresponding channels
    const notificationTypes = ['info', 'alert', 'warning', 'article'];
    const notificationTemplates = [
      {
        title: 'Welcome to Test Customer Platform',
        message: 'Welcome! Your account has been set up successfully.',
        type: NotificationTypes.IN_APP,
        channel: this.getRandomNotificationType(),
        customerId,
        generatedBy: 'system (seed)',
      },
      {
        title: 'New Feature Available',
        message: 'Check out our new document management features.',
        type: NotificationTypes.IN_APP,
        channel: this.getRandomNotificationType(),
        customerId,
        generatedBy: 'system (seed)',
      },
      {
        title: 'System Maintenance Scheduled',
        message:
          'We will be performing scheduled maintenance on Sunday at 2 AM.',
        type: NotificationTypes.IN_APP,
        channel: this.getRandomNotificationType(),
        customerId,
        generatedBy: 'system (seed)',
      },
      {
        title: 'Security Alert',
        message: 'Your account has been accessed from a new device.',
        type: NotificationTypes.IN_APP,
        channel: this.getRandomNotificationType(),
        customerId,
        generatedBy: 'system (seed)',
      },
    ];

    for (const notification of notificationTemplates) {
      await this.notificationsService.create(notification);
    }

    // Create user-specific notifications with random types
    for (const user of users) {
      const notificationTypes = ['info', 'alert', 'warning', 'article'];
      const randomType =
        notificationTypes[Math.floor(Math.random() * notificationTypes.length)];

      await this.notificationsService.create({
        title: 'Personal Welcome',
        message: `Welcome ${user.firstName}! We're excited to have you on board.`,
        type: NotificationTypes.IN_APP,
        channel: randomType,
        customerId,
        userId: user.id,
        generatedBy: 'system (seed)',
      });

      // Create additional random notifications for each user
      const additionalNotifications = [
        {
          title: 'Profile Update Reminder',
          message:
            'Please complete your profile information to get the most out of our platform.',
          type: NotificationTypes.IN_APP,
          channel: this.getRandomNotificationType(),
          customerId,
          userId: user.id,
          generatedBy: 'system (seed)',
        },
        {
          title: 'New Article Published',
          message: 'A new article has been published in your area of interest.',
          type: NotificationTypes.IN_APP,
          channel: this.getRandomNotificationType(),
          customerId,
          userId: user.id,
          generatedBy: 'system (seed)',
        },
      ];

      for (const notification of additionalNotifications) {
        await this.notificationsService.create(notification);
      }
    }
  }

  private getRandomNotificationType(): string {
    const notificationTypes = ['info', 'alert', 'warning', 'article'];
    return notificationTypes[
      Math.floor(Math.random() * notificationTypes.length)
    ];
  }

  private async createNotificationTemplates(customerId: string) {
    this.logger.log('Creating notification templates...');

    const templates = [
      {
        title: 'Welcome Template',
        message: 'Welcome to our platform! We are excited to have you here.',
        comment: 'Sent to new users upon registration',
        type: [NotificationTypes.EMAIL, NotificationTypes.IN_APP],
        channel: NotificationChannel.info,
      },
      {
        title: 'Article Published',
        message:
          'A new article has been published: {{articleTitle}}. Check it out!',
        comment: 'Notification when a new article is published',
        type: [NotificationTypes.IN_APP],
        channel: NotificationChannel.article,
      },
      {
        title: 'System Alert',
        message:
          'Important system update: {{message}}. Please review at your earliest convenience.',
        comment: 'Critical system notifications',
        type: [NotificationTypes.EMAIL, NotificationTypes.IN_APP],
        channel: NotificationChannel.alert,
      },
      {
        title: 'Weekly Digest',
        message:
          'Your weekly digest is ready! Check out the latest updates and articles.',
        comment: 'Weekly summary for users',
        type: [NotificationTypes.EMAIL],
        channel: NotificationChannel.info,
      },
      {
        title: 'Account Warning',
        message:
          'Warning: {{warningMessage}}. Please take action to resolve this issue.',
        comment: 'Account-related warnings',
        type: [NotificationTypes.EMAIL, NotificationTypes.IN_APP],
        channel: NotificationChannel.warning,
      },
    ];

    const createdTemplates: any[] = [];
    for (const templateData of templates) {
      try {
        const template = await this.templatesService.createTemplate(
          templateData,
          customerId,
        );
        createdTemplates.push(template);
        this.logger.log(`Created template: ${template.title}`);
      } catch (error) {
        this.logger.error(
          `Error creating template ${templateData.title}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Created ${createdTemplates.length} notification templates`,
    );
    return createdTemplates;
  }
}
