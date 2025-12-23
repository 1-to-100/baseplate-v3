# Source & Snap API Documentation

This document describes the API layer for the Source & Snap feature, including data types, API functions, and usage examples.

## Overview

The Source & Snap API provides CRUD operations for:
- **Device Profile Options** (System-scoped): Device profiles for standardized web captures
- **Capture Requests** (Customer-scoped): User-initiated requests to capture web pages
- **Captures** (Customer-scoped): Processed capture artifacts with screenshots and source assets

## Data Types

### DeviceProfileOption

System-wide device profile configuration for capture viewports.

```typescript
interface DeviceProfileOption {
  options_device_profile_id: string;
  programmatic_name: string;
  display_name: string;
  viewport_width: number;
  viewport_height: number;
  device_pixel_ratio: number;
  user_agent: string | null;
  is_mobile: boolean;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### WebScreenshotCaptureRequest

Represents a user-initiated request to capture a web page.

```typescript
interface WebScreenshotCaptureRequest {
  web_screenshot_capture_request_id: string;
  customer_id: string;
  requested_by_user_id: string;
  requested_url: string;
  device_profile_id: string | null;
  full_page: boolean;
  include_source: boolean;
  block_tracking: boolean;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'canceled';
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  device_profile?: DeviceProfileOption | null;
}
```

### WebScreenshotCapture

Processed capture artifact containing screenshot and optional source assets.

```typescript
interface WebScreenshotCapture {
  web_screenshot_capture_id: string;
  customer_id: string;
  options_device_profile_id: string | null;
  page_title: string | null;
  screenshot_storage_path: string;
  screenshot_width: number | null;
  screenshot_height: number | null;
  screenshot_size_bytes: number | null;
  html_size_bytes: number | null;
  raw_html: string | null;
  raw_css: string | null;
  css_size_bytes: number | null;
  capture_meta: Record<string, unknown>;
  captured_at: string;
  created_at: string;
  updated_at: string;
  web_screenshot_capture_request_id: string;
  device_profile?: DeviceProfileOption | null;
  capture_request?: WebScreenshotCaptureRequest | null;
}
```

## API Functions

### Device Profile Options

#### `getDeviceProfileOptions(params?)`

Fetch all device profile options with optional filtering.

**Parameters:**
- `params.is_active?: boolean` - Filter by active status
- `params.is_mobile?: boolean` - Filter by mobile devices
- `params.sort_by?: 'sort_order' | 'display_name' | 'created_at'` - Sort field
- `params.order?: 'asc' | 'desc'` - Sort direction

**Returns:** `Promise<DeviceProfileOption[]>`

**Example:**
```typescript
const profiles = await getDeviceProfileOptions({ is_active: true, is_mobile: false });
```

#### `getDeviceProfileOptionById(id)`

Fetch a single device profile by ID.

**Parameters:**
- `id: string` - Device profile UUID

**Returns:** `Promise<DeviceProfileOption>`

#### `getDeviceProfileOptionByProgrammaticName(name)`

Fetch a device profile by its programmatic name.

**Parameters:**
- `name: string` - Programmatic name (e.g., "desktop_1440_900")

**Returns:** `Promise<DeviceProfileOption | null>`

#### `createDeviceProfileOption(payload)` (System Admin Only)

Create a new device profile option.

**Parameters:**
- `payload: CreateDeviceProfileOptionPayload`

**Returns:** `Promise<DeviceProfileOption>`

**Example:**
```typescript
const profile = await createDeviceProfileOption({
  programmatic_name: 'desktop_1920_1080',
  display_name: 'Desktop 1920x1080',
  viewport_width: 1920,
  viewport_height: 1080,
  device_pixel_ratio: 1,
  is_mobile: false,
});
```

#### `updateDeviceProfileOption(id, payload)` (System Admin Only)

Update an existing device profile option.

**Parameters:**
- `id: string` - Device profile UUID
- `payload: UpdateDeviceProfileOptionPayload`

**Returns:** `Promise<DeviceProfileOption>`

#### `deleteDeviceProfileOption(id)` (System Admin Only)

Delete a device profile option.

**Parameters:**
- `id: string` - Device profile UUID

**Returns:** `Promise<void>`

### Capture Requests

#### `getCaptureRequestsList(params?)`

Fetch a paginated list of capture requests for the current customer.

**Parameters:**
- `params.page?: number` - Page number (default: 1)
- `params.perPage?: number` - Items per page (default: 10)
- `params.status?: 'queued' | 'in_progress' | 'completed' | 'failed' | 'canceled'` - Filter by status
- `params.device_profile_id?: string | null` - Filter by device profile
- `params.requested_by_user_id?: string` - Filter by requester
- `params.orderBy?: string` - Sort field (default: "queued_at")
- `params.orderDirection?: 'asc' | 'desc'` - Sort direction (default: "desc")
- `params.search?: string` - Search in requested_url

**Returns:** `Promise<GetCaptureRequestsResponse>`

**Example:**
```typescript
const result = await getCaptureRequestsList({
  page: 1,
  perPage: 20,
  status: 'completed',
});
```

#### `getCaptureRequestById(id)`

Fetch a single capture request by ID.

**Parameters:**
- `id: string` - Capture request UUID

**Returns:** `Promise<WebScreenshotCaptureRequest>`

#### `createCaptureRequest(payload)`

Create a new capture request.

**Parameters:**
- `payload: CreateCaptureRequestPayload`
  - `requested_url: string` - URL to capture (required)
  - `device_profile_id?: string | null` - Device profile UUID (optional)
  - `full_page?: boolean` - Full-page screenshot (default: false)
  - `include_source?: boolean` - Include HTML/CSS (default: false)
  - `block_tracking?: boolean` - Block tracking scripts (default: false)

**Returns:** `Promise<WebScreenshotCaptureRequest>`

**Example:**
```typescript
const request = await createCaptureRequest({
  requested_url: 'https://example.com',
  device_profile_id: 'profile-uuid',
  full_page: true,
  include_source: true,
});
```

#### `updateCaptureRequest(id, payload)`

Update a capture request (typically used by workers to update status).

**Parameters:**
- `id: string` - Capture request UUID
- `payload: UpdateCaptureRequestPayload`

**Returns:** `Promise<WebScreenshotCaptureRequest>`

#### `deleteCaptureRequest(id)`

Delete a capture request (only by the user who created it).

**Parameters:**
- `id: string` - Capture request UUID

**Returns:** `Promise<void>`

### Captures

#### `getCapturesList(params?)`

Fetch a paginated list of captures for the current customer.

**Parameters:**
- `params.page?: number` - Page number (default: 1)
- `params.perPage?: number` - Items per page (default: 10)
- `params.device_profile_id?: string | null` - Filter by device profile
- `params.web_screenshot_capture_request_id?: string` - Filter by capture request
- `params.orderBy?: string` - Sort field (default: "captured_at")
- `params.orderDirection?: 'asc' | 'desc'` - Sort direction (default: "desc")
- `params.search?: string` - Search in page_title and screenshot_storage_path

**Returns:** `Promise<GetCapturesResponse>`

#### `getCaptureById(id)`

Fetch a single capture by ID.

**Parameters:**
- `id: string` - Capture UUID

**Returns:** `Promise<WebScreenshotCapture>`

#### `createCapture(payload)`

Create a new capture artifact (typically called by workers after capture completes).

**Parameters:**
- `payload: CreateCapturePayload`
  - `customer_id: string` - Customer UUID (required)
  - `screenshot_storage_path: string` - Path to screenshot (required)
  - `web_screenshot_capture_request_id: string` - Related request UUID (required)
  - Other fields optional

**Returns:** `Promise<WebScreenshotCapture>`

#### `updateCapture(id, payload)`

Update a capture artifact.

**Parameters:**
- `id: string` - Capture UUID
- `payload: UpdateCapturePayload`

**Returns:** `Promise<WebScreenshotCapture>`

#### `deleteCapture(id)`

Delete a capture artifact.

**Parameters:**
- `id: string` - Capture UUID

**Returns:** `Promise<void>`

## React Query Hooks

All API functions have corresponding React Query hooks for use in components.

### Device Profiles

- `useDeviceProfileOptions(params?)` - Fetch all device profiles
- `useDeviceProfileOption(id)` - Fetch single device profile
- `useDeviceProfileOptionByProgrammaticName(name)` - Fetch by programmatic name
- `useCreateDeviceProfileOption()` - Create mutation
- `useUpdateDeviceProfileOption()` - Update mutation
- `useDeleteDeviceProfileOption()` - Delete mutation

### Capture Requests

- `useCaptureRequestsList(params?)` - Fetch list of requests
- `useCaptureRequest(id)` - Fetch single request
- `useCreateCaptureRequest()` - Create mutation
- `useUpdateCaptureRequest()` - Update mutation
- `useDeleteCaptureRequest()` - Delete mutation

### Captures

- `useCapturesList(params?)` - Fetch list of captures
- `useCapture(id)` - Fetch single capture
- `useCreateCapture()` - Create mutation
- `useUpdateCapture()` - Update mutation
- `useDeleteCapture()` - Delete mutation

## Usage Examples

### Creating a Capture Request

```typescript
import { useCreateCaptureRequest } from '@/app/(features)/source-and-snap/lib/hooks';

function CaptureForm() {
  const createRequest = useCreateCaptureRequest();

  const handleSubmit = async (url: string) => {
    try {
      const request = await createRequest.mutateAsync({
        requested_url: url,
        full_page: true,
        include_source: true,
      });
      console.log('Capture request created:', request.web_screenshot_capture_request_id);
    } catch (error) {
      console.error('Failed to create capture request:', error);
    }
  };

  // ...
}
```

### Fetching Device Profiles

```typescript
import { useDeviceProfileOptions } from '@/app/(features)/source-and-snap/lib/hooks';

function DeviceProfileSelector() {
  const { data: profiles, isLoading } = useDeviceProfileOptions({
    is_active: true,
    sort_by: 'sort_order',
    order: 'asc',
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <select>
      {profiles?.map(profile => (
        <option key={profile.options_device_profile_id} value={profile.options_device_profile_id}>
          {profile.display_name}
        </option>
      ))}
    </select>
  );
}
```

### Fetching Capture History

```typescript
import { useCapturesList } from '@/app/(features)/source-and-snap/lib/hooks';

function CaptureHistory() {
  const { data, isLoading } = useCapturesList({
    page: 1,
    perPage: 20,
    orderBy: 'captured_at',
    orderDirection: 'desc',
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data?.data.map(capture => (
        <div key={capture.web_screenshot_capture_id}>
          <h3>{capture.page_title || 'Untitled'}</h3>
          <p>Captured: {new Date(capture.captured_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
```

## Error Handling

All API functions throw errors that should be caught and handled appropriately:

```typescript
try {
  const request = await createCaptureRequest({ requested_url: 'https://example.com' });
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
    // Handle specific error cases
    if (error.message.includes('not authenticated')) {
      // Redirect to login
    } else if (error.message.includes('permission')) {
      // Show permission error
    }
  }
}
```

## Authentication & Authorization

- All API functions require an authenticated user
- Customer-scoped operations automatically use the current user's customer context
- System-scoped operations (device profiles) require system administrator privileges
- RLS policies enforce access control at the database level

## Data Contracts

### Status Values

Capture request status can be one of:
- `queued` - Request is queued and waiting to be processed
- `in_progress` - Capture is currently being processed
- `completed` - Capture completed successfully
- `failed` - Capture failed with an error
- `canceled` - Capture was canceled

### Capture Metadata

The `capture_meta` field is a JSONB object that can contain:
- `user_agent`: User agent string used for capture
- `final_url`: Final URL after redirects
- `http_status`: HTTP status code
- `response_headers`: Summary of response headers
- `design_tokens`: Extracted design tokens (colors, fonts, etc.)

