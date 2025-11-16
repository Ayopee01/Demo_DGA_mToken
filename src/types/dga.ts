export interface ValidateResponse {
  Result: string
}

export function isValidateResponse(data: unknown): data is ValidateResponse {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as { Result?: unknown }
  return typeof obj.Result === 'string'
}

export interface CitizenData {
  userId: string
  citizenId: string
  firstName: string
  middleName?: string | null
  lastName: string
  dateOfBirthString: string
  mobile: string
  email: string
  notification: boolean
}

export interface DeprocWrappedResult {
  result?: unknown
  data?: unknown
}

export function isCitizenData(data: unknown): data is CitizenData {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as { [key: string]: unknown }

  return (
    typeof obj.userId === 'string' &&
    typeof obj.citizenId === 'string' &&
    typeof obj.firstName === 'string' &&
    typeof obj.lastName === 'string' &&
    typeof obj.dateOfBirthString === 'string' &&
    typeof obj.mobile === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.notification === 'boolean'
  )
}

export function extractCitizenData(data: unknown): CitizenData | null {
  if (isCitizenData(data)) return data

  if (typeof data === 'object' && data !== null) {
    const obj = data as DeprocWrappedResult
    if (obj.result && isCitizenData(obj.result)) return obj.result
    if (obj.data && isCitizenData(obj.data)) return obj.data
  }

  return null
}

export interface NotificationResponse {
  result?: unknown
  messageCode?: number
  message?: string | null
}

export interface UserDto {
  id: number
  userId: string
  citizenId: string | null
  firstName: string | null
  middleName: string | null
  lastName: string | null
  dateOfBirthString: string | null
  mobile: string | null
  email: string | null
  notification: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiSuccessResponse {
  ok: true
  saved: UserDto
}

export interface ApiErrorResponse {
  ok: false
  error: string
  step?: 'validate' | 'deproc' | 'notification' | 'db'
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse
