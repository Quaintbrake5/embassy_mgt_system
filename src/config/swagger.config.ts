import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Embassy Management System API',
    version: '1.0.0',
    description: 'RESTful API for embassy consular services including visa processing, document legalization, emergency assistance, diplomatic pouch management, and financial reconciliation.',
    contact: {
      name: 'EMS Development Team',
    },
  },
  servers: [
    {
      url: process.env.API_BASE_URL ?? 'http://localhost:3010',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'password'],
        properties: {
          firstName: { type: 'string', maxLength: 100 },
          lastName: { type: 'string', maxLength: 100 },
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8, maxLength: 128, description: 'Must contain upper, lower, number, and special character' },
          phone: { type: 'string', description: 'E.164 format' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              userid: { type: 'string', format: 'uuid' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string', format: 'email' },
              phone: { type: 'string' },
              roleId: { type: 'string', format: 'uuid' },
              status: { type: 'string', enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] },
              emailVerified: { type: 'boolean' },
            },
          },
        },
      },
      PaginationParams: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
      CreateEmbassyInput: {
        type: 'object',
        required: ['name', 'code', 'country', 'city', 'address'],
        properties: {
          name: { type: 'string', maxLength: 200 },
          code: { type: 'string', minLength: 3, maxLength: 10, description: 'Uppercase letters only' },
          country: { type: 'string', maxLength: 100 },
          city: { type: 'string', maxLength: 100 },
          address: { type: 'string', maxLength: 300 },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
          operatingHours: { type: 'string' },
        },
      },
      CreateVisaApplicationInput: {
        type: 'object',
        required: ['visaType', 'embassyId'],
        properties: {
          visaType: { type: 'string', enum: ['TOURIST', 'BUSINESS', 'WORK', 'STUDENT', 'DIPLOMATIC', 'TRANSIT', 'MEDIA', 'MEDICAL', 'FAMILY_REUNION'] },
          embassyId: { type: 'string', format: 'uuid' },
        },
      },
      CreateAppointmentInput: {
        type: 'object',
        required: ['serviceRequestId', 'embassyId', 'slotDate', 'slotTime'],
        properties: {
          serviceRequestId: { type: 'string', format: 'uuid' },
          embassyId: { type: 'string', format: 'uuid' },
          slotDate: { type: 'string', format: 'date' },
          slotTime: { type: 'string', description: 'HH:mm format' },
        },
      },
      CreateEmergencyCaseInput: {
        type: 'object',
        required: ['caseType', 'embassyId'],
        properties: {
          caseType: { type: 'string' },
          description: { type: 'string' },
          urgency: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          location: { type: 'string' },
          embassyId: { type: 'string', format: 'uuid' },
        },
      },
      CreateDiplomaticPouchInput: {
        type: 'object',
        required: ['originEmbassyId', 'destinationEmbassyId'],
        properties: {
          originEmbassyId: { type: 'string', format: 'uuid' },
          destinationEmbassyId: { type: 'string', format: 'uuid', description: 'Must differ from origin' },
          dispatchDate: { type: 'string', format: 'date' },
        },
      },
      RecordTransactionInput: {
        type: 'object',
        required: ['amount', 'currency', 'userId'],
        properties: {
          serviceRequestId: { type: 'string', format: 'uuid' },
          visaApplicationId: { type: 'string', format: 'uuid' },
          amount: { type: 'number', minimum: 0 },
          currency: { type: 'string', minLength: 3, maxLength: 3 },
          paymentMethod: { type: 'string' },
          transactionId: { type: 'string' },
          userId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Authentication and account management' },
    { name: 'Users', description: 'User administration' },
    { name: 'Roles', description: 'Role management' },
    { name: 'Permissions', description: 'Permission management' },
    { name: 'Audit', description: 'Audit log access' },
    { name: 'Embassies', description: 'Embassy and department management' },
    { name: 'Service Types', description: 'Service type catalog' },
    { name: 'Service Requests', description: 'Service request lifecycle' },
    { name: 'Profile', description: 'Citizen profile management' },
    { name: 'Visa Applications', description: 'Visa application processing' },
    { name: 'Visa Documents', description: 'Visa document uploads' },
    { name: 'Visa Decisions', description: 'Visa adjudication' },
    { name: 'Appointments', description: 'Appointment booking and queue management' },
    { name: 'Legalization', description: 'Document legalization' },
    { name: 'Emergency', description: 'Emergency case management and alerts' },
    { name: 'Diplomatic', description: 'Diplomatic pouch and staff clearance management' },
    { name: 'Financial', description: 'Payment processing and reconciliation' },
    { name: 'Health', description: 'Service health and metrics' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' }, uptime: { type: 'number' }, service: { type: 'string' } } } } },
          },
        },
      },
    },
    '/metrics': {
      get: {
        tags: ['Health'],
        summary: 'Prometheus metrics',
        responses: {
          '200': { description: 'Prometheus metrics in text format' },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } } } },
        responses: { '201': { description: 'User registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } }, '409': { description: 'Email already exists' } },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } } },
        responses: { '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } }, '401': { description: 'Invalid credentials' } },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } }, required: ['refreshToken'] } } } },
        responses: { '200': { description: 'Token refreshed' } },
      },
    },
    '/api/v1/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' } }, required: ['email'] } } } },
        responses: { '200': { description: 'Reset email sent if account exists' } },
      },
    },
    '/api/v1/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, newPassword: { type: 'string' } }, required: ['token', 'newPassword'] } } } },
        responses: { '200': { description: 'Password reset' } },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout (invalidate refresh token)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Logged out' } },
      },
    },
    '/api/v1/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change password',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } }, required: ['currentPassword', 'newPassword'] } } } },
        responses: { '200': { description: 'Password changed' } },
      },
    },
    '/api/v1/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get current user profile',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Current user data' } },
      },
      put: {
        tags: ['Users'],
        summary: 'Update own profile',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string', format: 'email' }, phone: { type: 'string' } } } } } },
        responses: { '200': { description: 'Profile updated' } },
      },
    },
    '/api/v1/users': {
      post: {
        tags: ['Users'],
        summary: 'Create user (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'User created' } },
      },
      get: {
        tags: ['Users'],
        summary: 'List users (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Paginated user list' } },
      },
    },
    '/api/v1/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'User data' }, '404': { description: 'User not found' } },
      },
      put: {
        tags: ['Users'],
        summary: 'Update user (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'User updated' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'User deleted' } },
      },
    },
    '/api/v1/users/{id}/role': {
      put: {
        tags: ['Users'],
        summary: 'Assign role to user',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { roleId: { type: 'string', format: 'uuid' } } } } } },
        responses: { '200': { description: 'Role assigned' } },
      },
    },
    '/api/v1/users/{id}/status': {
      patch: {
        tags: ['Users'],
        summary: 'Change user status',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Status updated' } },
      },
    },
    '/api/v1/roles': {
      post: {
        tags: ['Roles'],
        summary: 'Create role',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string', maxLength: 100 }, slug: { type: 'string', maxLength: 50 }, description: { type: 'string', maxLength: 500 } }, required: ['name', 'slug'] } } } },
        responses: { '201': { description: 'Role created' } },
      },
      get: {
        tags: ['Roles'],
        summary: 'List all roles',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Role list' } },
      },
    },
    '/api/v1/roles/{id}': {
      get: {
        tags: ['Roles'],
        summary: 'Get role by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Role data' } },
      },
      put: {
        tags: ['Roles'],
        summary: 'Update role',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Role updated' } },
      },
      delete: {
        tags: ['Roles'],
        summary: 'Delete role',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Role deleted' } },
      },
    },
    '/api/v1/roles/{id}/permissions': {
      post: {
        tags: ['Roles'],
        summary: 'Assign permissions to role',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { permissionIds: { type: 'array', items: { type: 'string', format: 'uuid' } } }, required: ['permissionIds'] } } } },
        responses: { '200': { description: 'Permissions assigned' } },
      },
    },
    '/api/v1/permissions': {
      post: {
        tags: ['Permissions'],
        summary: 'Create permission',
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'Permission created' } },
      },
      get: {
        tags: ['Permissions'],
        summary: 'List all permissions',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Permission list' } },
      },
    },
    '/api/v1/permissions/{id}': {
      get: {
        tags: ['Permissions'],
        summary: 'Get permission by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Permission data' } },
      },
      put: {
        tags: ['Permissions'],
        summary: 'Update permission',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Permission updated' } },
      },
      delete: {
        tags: ['Permissions'],
        summary: 'Delete permission',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Permission deleted' } },
      },
    },
    '/api/v1/audit': {
      get: {
        tags: ['Audit'],
        summary: 'List audit logs',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Paginated audit log' } },
      },
    },
    '/api/v1/audit/export': {
      get: {
        tags: ['Audit'],
        summary: 'Export audit logs',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Audit log export' } },
      },
    },
    '/api/v1/audit/{id}': {
      get: {
        tags: ['Audit'],
        summary: 'Get audit log by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Audit log entry' } },
      },
    },
    '/api/v1/embassies': {
      post: {
        tags: ['Embassies'],
        summary: 'Create embassy',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateEmbassyInput' } } } },
        responses: { '201': { description: 'Embassy created' } },
      },
      get: {
        tags: ['Embassies'],
        summary: 'List embassies',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Embassy list' } },
      },
    },
    '/api/v1/embassies/{id}': {
      get: {
        tags: ['Embassies'],
        summary: 'Get embassy by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Embassy data' }, '404': { description: 'Not found' } },
      },
      put: {
        tags: ['Embassies'],
        summary: 'Update embassy',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Embassy updated' } },
      },
      delete: {
        tags: ['Embassies'],
        summary: 'Delete embassy',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Embassy deleted' } },
      },
    },
    '/api/v1/embassies/{embassyId}/departments': {
      get: {
        tags: ['Embassies'],
        summary: 'List departments for embassy',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'embassyId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Department list' } },
      },
      post: {
        tags: ['Embassies'],
        summary: 'Create department under embassy',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'embassyId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '201': { description: 'Department created' } },
      },
    },
    '/api/v1/embassies/departments/{id}': {
      put: {
        tags: ['Embassies'],
        summary: 'Update department',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Department updated' } },
      },
      delete: {
        tags: ['Embassies'],
        summary: 'Delete department',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Department deleted' } },
      },
    },
    '/api/v1/service-types': {
      post: {
        tags: ['Service Types'],
        summary: 'Create service type',
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'Service type created' } },
      },
      get: {
        tags: ['Service Types'],
        summary: 'List all service types',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Service type list' } },
      },
    },
    '/api/v1/service-types/category/{category}': {
      get: {
        tags: ['Service Types'],
        summary: 'List service types by category',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'category', in: 'path', required: true, schema: { type: 'string', enum: ['PASSPORT', 'CIVIL_REGISTRY', 'EMERGENCY_ASSISTANCE', 'DOCUMENT_LEGALIZATION', 'VISA', 'NOTARIAL', 'CONSULAR_REPORT'] } }],
        responses: { '200': { description: 'Filtered service types' } },
      },
    },
    '/api/v1/service-types/{id}': {
      get: { tags: ['Service Types'], summary: 'Get service type by ID', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Service type data' } } },
      put: { tags: ['Service Types'], summary: 'Update service type', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Service type updated' } } },
      delete: { tags: ['Service Types'], summary: 'Delete service type', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Service type deleted' } } },
    },
    '/api/v1/service-requests': {
      post: { tags: ['Service Requests'], summary: 'Create service request', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Service request created' } } },
      get: { tags: ['Service Requests'], summary: 'List service requests', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Service request list' } } },
    },
    '/api/v1/service-requests/{id}': {
      get: { tags: ['Service Requests'], summary: 'Get service request by ID', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Service request data' } } },
    },
    '/api/v1/service-requests/{id}/status': {
      put: { tags: ['Service Requests'], summary: 'Update service request status', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Status updated' } } },
    },
    '/api/v1/profile/me': {
      get: { tags: ['Profile'], summary: 'Get own profile', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Profile data' } } },
      put: { tags: ['Profile'], summary: 'Update own profile', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Profile updated' } } },
      delete: { tags: ['Profile'], summary: 'Delete own profile (GDPR erasure)', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Profile deleted' } } },
    },
    '/api/v1/profile': {
      post: { tags: ['Profile'], summary: 'Create profile', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Profile created' } } },
    },
    '/api/v1/profile/{id}': {
      get: { tags: ['Profile'], summary: 'Get profile by user ID', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Profile data' } } },
    },
    '/api/v1/visa': {
      post: { tags: ['Visa Applications'], summary: 'Create visa application', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateVisaApplicationInput' } } } }, responses: { '201': { description: 'Visa application created' } } },
      get: { tags: ['Visa Applications'], summary: 'List visa applications', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Visa application list' } } },
    },
    '/api/v1/visa/{id}': {
      get: { tags: ['Visa Applications'], summary: 'Get visa application by ID', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Visa application data' } } },
    },
    '/api/v1/visa/{id}/submit': {
      post: { tags: ['Visa Applications'], summary: 'Submit visa application', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Application submitted' } } },
    },
    '/api/v1/visa/documents': {
      post: { tags: ['Visa Documents'], summary: 'Upload visa document', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Document uploaded' } } },
    },
    '/api/v1/visa/documents/application/{visaApplicationId}': {
      get: { tags: ['Visa Documents'], summary: 'List documents for application', security: [{ BearerAuth: [] }], parameters: [{ name: 'visaApplicationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Document list' } } },
    },
    '/api/v1/visa/documents/{id}': {
      get: { tags: ['Visa Documents'], summary: 'Get document by ID', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Document data' } } },
      delete: { tags: ['Visa Documents'], summary: 'Delete document', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Document deleted' } } },
    },
    '/api/v1/visa/decisions/applications/{id}/decision': {
      post: { tags: ['Visa Decisions'], summary: 'Submit visa decision', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Decision recorded' } } },
      get: { tags: ['Visa Decisions'], summary: 'Get decision for application', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Decision data' } } },
    },
    '/api/v1/visa/decisions/decisions/officer/me': {
      get: { tags: ['Visa Decisions'], summary: 'Get my decisions', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Officer decision list' } } },
    },
    '/api/v1/appointments/slots': {
      get: { tags: ['Appointments'], summary: 'Get available appointment slots', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Available slots' } } },
    },
    '/api/v1/appointments/book': {
      post: { tags: ['Appointments'], summary: 'Book appointment', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAppointmentInput' } } } }, responses: { '201': { description: 'Appointment booked' } } },
    },
    '/api/v1/appointments/my': {
      get: { tags: ['Appointments'], summary: 'Get my appointments', security: [{ BearerAuth: [] }], responses: { '200': { description: 'User appointment list' } } },
    },
    '/api/v1/appointments/queue': {
      get: { tags: ['Appointments'], summary: 'Get appointment queue', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Queue data' } } },
    },
    '/api/v1/appointments/queue/next': {
      post: { tags: ['Appointments'], summary: 'Call next in queue', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Next appointment' } } },
    },
    '/api/v1/appointments/{id}/cancel': {
      put: { tags: ['Appointments'], summary: 'Cancel appointment', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Appointment cancelled' } } },
    },
    '/api/v1/appointments/{id}/checkin': {
      post: { tags: ['Appointments'], summary: 'Check in to appointment', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Checked in' } } },
    },
    '/api/v1/appointments/{id}/complete': {
      put: { tags: ['Appointments'], summary: 'Mark appointment completed', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Completed' } } },
    },
    '/api/v1/appointments/{id}/no-show': {
      put: { tags: ['Appointments'], summary: 'Mark appointment no-show', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'No-show recorded' } } },
    },
    '/api/v1/legalization': {
      post: { tags: ['Legalization'], summary: 'Create legalization request', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Legalization request created' } } },
      get: { tags: ['Legalization'], summary: 'List legalization requests', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Legalization list' } } },
    },
    '/api/v1/legalization/{id}': {
      get: { tags: ['Legalization'], summary: 'Get legalization by ID', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Legalization data' } } },
    },
    '/api/v1/legalization/{id}/process': {
      put: { tags: ['Legalization'], summary: 'Process legalization (verify/seal/complete)', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Legalization processed' } } },
    },
    '/api/v1/emergency/cases': {
      post: { tags: ['Emergency'], summary: 'Create emergency case', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateEmergencyCaseInput' } } } }, responses: { '201': { description: 'Emergency case created' } } },
      get: { tags: ['Emergency'], summary: 'List emergency cases', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Emergency case list' } } },
    },
    '/api/v1/emergency/cases/{id}': {
      get: { tags: ['Emergency'], summary: 'Get emergency case by ID', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Case data' } } },
    },
    '/api/v1/emergency/cases/{id}/status': {
      put: { tags: ['Emergency'], summary: 'Update emergency case status', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Status updated' } } },
    },
    '/api/v1/emergency/evacuation-list': {
      get: { tags: ['Emergency'], summary: 'Get evacuation priority list', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Evacuation list' } } },
    },
    '/api/v1/emergency/alerts': {
      post: { tags: ['Emergency'], summary: 'Broadcast emergency alert', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Alert broadcast' } } },
    },
    '/api/v1/diplomatic/pouches': {
      post: { tags: ['Diplomatic'], summary: 'Create diplomatic pouch', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateDiplomaticPouchInput' } } } }, responses: { '201': { description: 'Pouch created' } } },
      get: { tags: ['Diplomatic'], summary: 'List diplomatic pouches', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Pouch list' } } },
    },
    '/api/v1/diplomatic/pouches/{id}': {
      get: { tags: ['Diplomatic'], summary: 'Get pouch by ID', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Pouch data' } } },
    },
    '/api/v1/diplomatic/pouches/{id}/handoff': {
      put: { tags: ['Diplomatic'], summary: 'Record pouch handoff', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Handoff recorded' } } },
    },
    '/api/v1/diplomatic/clearances': {
      post: { tags: ['Diplomatic'], summary: 'Create staff clearance', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Clearance created' } } },
      get: { tags: ['Diplomatic'], summary: 'List staff clearances', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Clearance list' } } },
    },
    '/api/v1/diplomatic/clearances/{id}': {
      get: { tags: ['Diplomatic'], summary: 'Get clearance by ID', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Clearance data' } } },
      put: { tags: ['Diplomatic'], summary: 'Update clearance', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Clearance updated' } } },
    },
    '/api/v1/financial/transactions': {
      post: { tags: ['Financial'], summary: 'Record payment transaction', security: [{ BearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RecordTransactionInput' } } } }, responses: { '201': { description: 'Transaction recorded' } } },
      get: { tags: ['Financial'], summary: 'List transactions', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Transaction list' } } },
    },
    '/api/v1/financial/transactions/{id}': {
      get: { tags: ['Financial'], summary: 'Get transaction by ID', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Transaction data' } } },
    },
    '/api/v1/financial/reconciliation/daily': {
      get: { tags: ['Financial'], summary: 'Daily reconciliation', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Daily reconciliation data' } } },
    },
    '/api/v1/financial/reports/monthly': {
      get: { tags: ['Financial'], summary: 'Monthly financial report', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Monthly report' } } },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;