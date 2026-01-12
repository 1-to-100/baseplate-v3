// Export all API functions
export {
  getDeviceProfileOptions,
  getDeviceProfileOptionById,
  getDeviceProfileOptionByProgrammaticName,
  createDeviceProfileOption,
  updateDeviceProfileOption,
  deleteDeviceProfileOption,
} from './device-profiles';

export {
  getCaptureRequestsList,
  getCaptureRequestById,
  createCaptureRequest,
  updateCaptureRequest,
  deleteCaptureRequest,
} from './capture-requests';

export {
  getCapturesList,
  getCaptureById,
  createCapture,
  updateCapture,
  deleteCapture,
} from './captures';

// Export types
export type {
  DeviceProfileOption,
  CreateDeviceProfileOptionPayload,
  UpdateDeviceProfileOptionPayload,
  GetDeviceProfileOptionsParams,
} from './device-profiles';

export type {
  WebScreenshotCaptureRequest,
  CreateCaptureRequestPayload,
  UpdateCaptureRequestPayload,
  GetCaptureRequestsParams,
  GetCaptureRequestsResponse,
} from './capture-requests';

export type {
  WebScreenshotCapture,
  CreateCapturePayload,
  UpdateCapturePayload,
  GetCapturesParams,
  GetCapturesResponse,
} from './captures';
