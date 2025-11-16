import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  ApiResponse,
  CitizenData,
  ValidateResponse,
  extractCitizenData,
  isValidateResponse,
  UserDto,
} from '@/types/dga'

interface EgovRequestBody {
  appId: string
  mToken: string
}

function toUserDto(user: {
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
  createdAt: Date
  updatedAt: Date
}): UserDto {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

// ป้องกัน caching เวลา dev
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const body = (await req.json()) as Partial<EgovRequestBody>
  const appId = body.appId
  const mToken = body.mToken

  if (typeof appId !== 'string' || typeof mToken !== 'string') {
    return NextResponse.json(
      {
        ok: false,
        error: 'appId and mToken (string) are required in body',
        step: 'db',
      },
      { status: 400 }
    )
  }

  const consumerKey = process.env.CONSUMER_KEY
  const consumerSecret = process.env.CONSUMER_SECRET
  const agentId = process.env.AGENT_ID

  if (!consumerKey || !consumerSecret || !agentId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing CONSUMER_KEY / CONSUMER_SECRET / AGENT_ID in environment',
        step: 'db',
      },
      { status: 500 }
    )
  }

  try {
    // Step 1: validate → get Token
    const validateUrl = `https://api.egov.go.th/ws/auth/validate?ConsumerSecret=${encodeURIComponent(
      consumerSecret
    )}&AgentID=${encodeURIComponent(agentId)}`

    const validateResp = await fetch(validateUrl, {
      method: 'GET',
      headers: {
        'Consumer-Key': consumerKey,
        'Content-Type': 'application/json',
      },
    })

    const validateJson: unknown = await validateResp.json().catch(() => null)

    if (!validateResp.ok || !isValidateResponse(validateJson)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to get Token from validate',
          step: 'validate',
        },
        { status: 502 }
      )
    }

    const apiToken: string = (validateJson as ValidateResponse).Result

    // Step 2: deproc
    const deprocUrl =
      'https://api.egov.go.th/ws/dga/czp/uat/v1/core/shield/data/deproc'

    const deprocResp = await fetch(deprocUrl, {
      method: 'POST',
      headers: {
        'Consumer-Key': consumerKey,
        'Content-Type': 'application/json',
        Token: apiToken,
      },
      body: JSON.stringify({
        Appid: appId,
        MToken: mToken,
      }),
    })

    const deprocJson: unknown = await deprocResp.json().catch(() => null)

    if (!deprocResp.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'deproc API returned non-OK status',
          step: 'deproc',
        },
        { status: 502 }
      )
    }

    const citizen: CitizenData | null = extractCitizenData(deprocJson)

    if (!citizen) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Could not parse citizen data from deproc response',
          step: 'deproc',
        },
        { status: 200 }
      )
    }

    // Step 3: Notification (ถ้าเปิด)
    if (citizen.notification) {
      const notificationUrl =
        'https://api.egov.go.th/ws/dga/czp/uat/v1/core/notification/push'

      const nowIso = new Date().toISOString()

      const notificationBody = {
        appid: appId,
        data: [
          {
            message: `สวัสดี ${citizen.firstName} ${citizen.lastName} นี่คือข้อความทดสอบจากระบบ`,
            userId: citizen.userId,
          },
        ],
        sendDateTime: nowIso,
      }

      const notificationResp = await fetch(notificationUrl, {
        method: 'POST',
        headers: {
          'Consumer-Key': consumerKey,
          'Content-Type': 'application/json',
          Token: apiToken,
        },
        body: JSON.stringify(notificationBody),
      })

      if (!notificationResp.ok) {
        console.warn('Notification API returned non-OK status')
      }
    }

    // Step 4: Save DB
    const savedUser = await prisma.user.upsert({
      where: { userId: citizen.userId },
      update: {
        citizenId: citizen.citizenId,
        firstName: citizen.firstName,
        middleName: citizen.middleName ?? null,
        lastName: citizen.lastName,
        dateOfBirthString: citizen.dateOfBirthString,
        mobile: citizen.mobile,
        email: citizen.email,
        notification: citizen.notification,
      },
      create: {
        userId: citizen.userId,
        citizenId: citizen.citizenId,
        firstName: citizen.firstName,
        middleName: citizen.middleName ?? null,
        lastName: citizen.lastName,
        dateOfBirthString: citizen.dateOfBirthString,
        mobile: citizen.mobile,
        email: citizen.email,
        notification: citizen.notification,
      },
    })

    const dto = toUserDto(savedUser)

    return NextResponse.json<ApiResponse>({ ok: true, saved: dto })
  } catch (error) {
    console.error(error)
    return NextResponse.json<ApiResponse>(
      {
        ok: false,
        error: String(error),
        step: 'db',
      },
      { status: 500 }
    )
  }
}
