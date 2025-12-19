import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type LoginBody = { appId?: string; mToken?: string }
type NotifyBody = { appId?: string; userId?: string; message?: string }

function safeJsonParse(text: string) {
  if (!text || !text.trim()) return null
  try { return JSON.parse(text) } catch { return null }
}

async function readResp(resp: Response) {
  const text = await resp.text().catch(() => '')
  const json = safeJsonParse(text)
  return { text, json }
}

async function getGdxToken() {
  const consumerKey = process.env.CONSUMER_KEY
  const consumerSecret = process.env.CONSUMER_SECRET
  const agentId = process.env.AGENT_ID

  if (!consumerKey || !consumerSecret || !agentId) {
    throw new Error('Missing CONSUMER_KEY / CONSUMER_SECRET / AGENT_ID')
  }

  const url = `https://api.egov.go.th/ws/auth/validate?ConsumerSecret=${encodeURIComponent(
    consumerSecret
  )}&AgentID=${encodeURIComponent(agentId)}`

  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'Consumer-Key': consumerKey, 'Content-Type': 'application/json' },
    cache: 'no-store',
  })

  const r = await readResp(resp)
  if (!resp.ok || !r.json?.Result) {
    throw new Error(`validate failed HTTP ${resp.status}: ${r.text?.slice(0, 300)}`)
  }

  return r.json.Result as string
}

async function handleLogin(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as LoginBody
  const appId = body.appId
  const mToken = body.mToken

  if (!appId || !mToken) {
    return NextResponse.json({ status: 'error', message: 'Missing Data' }, { status: 400 })
  }

  const consumerKey = process.env.CONSUMER_KEY
  if (!consumerKey) throw new Error('Missing CONSUMER_KEY')

  // 1) validate token
  const token = await getGdxToken()

  // 2) deproc
  const deprocUrl = 'https://api.egov.go.th/ws/dga/czp/uat/v1/core/shield/data/deproc'
  const deprocResp = await fetch(deprocUrl, {
    method: 'POST',
    headers: {
      'Consumer-Key': consumerKey,
      'Content-Type': 'application/json',
      Token: token,
    },
    // ✅ สำคัญ: ใช้ AppId (I ใหญ่) ตาม logic ที่ใช้ได้
    body: JSON.stringify({ AppId: appId, MToken: mToken }),
  })

  const d = await readResp(deprocResp)
  if (!deprocResp.ok) {
    return NextResponse.json(
      { status: 'error', message: `deproc HTTP ${deprocResp.status}`, detail: d.text?.slice(0, 800) },
      { status: 502 }
    )
  }

  const pData = d.json?.result
  if (!pData) {
    return NextResponse.json(
      { status: 'error', message: 'Deproc returned NULL (Token Expired / invalid payload)', detail: d.text?.slice(0, 800) },
      { status: 502 }
    )
  }

  // 3) save db (ปรับให้ตรง schema ของคุณได้)
  const saved = await prisma.user.upsert({
    where: { userId: pData.userId },
    update: {
      citizenId: pData.citizenId ?? null,
      firstName: pData.firstName ?? null,
      lastName: pData.lastName ?? null,
      dateOfBirthString: pData.dateOfBirthString ?? null,
      mobile: pData.mobile ?? null,
      email: pData.email ?? null,
      notification: !!pData.notification,
    },
    create: {
      userId: pData.userId,
      citizenId: pData.citizenId ?? null,
      firstName: pData.firstName ?? null,
      lastName: pData.lastName ?? null,
      dateOfBirthString: pData.dateOfBirthString ?? null,
      mobile: pData.mobile ?? null,
      email: pData.email ?? null,
      notification: !!pData.notification,
    },
  })

  return NextResponse.json({
    status: 'success',
    message: 'Login successful',
    data: {
      firstName: saved.firstName,
      lastName: saved.lastName,
      userId: saved.userId,
      appId,
    },
  })
}

async function handleNotify(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as NotifyBody
  const { appId, userId, message } = body

  if (!appId || !userId) {
    return NextResponse.json({ success: false, message: 'Missing appId or userId' }, { status: 400 })
  }

  const consumerKey = process.env.CONSUMER_KEY
  if (!consumerKey) throw new Error('Missing CONSUMER_KEY')

  const token = await getGdxToken()

  const notificationUrl = 'https://api.egov.go.th/ws/dga/czp/uat/v1/core/notification/push'
  const nowIso = new Date().toISOString()

  const resp = await fetch(notificationUrl, {
    method: 'POST',
    headers: {
      'Consumer-Key': consumerKey,
      'Content-Type': 'application/json',
      Token: token,
    },
    body: JSON.stringify({
      appId,
      data: [{ message: message || 'ทดสอบแจ้งเตือนจากระบบ', userId }],
      sendDateTime: nowIso,
    }),
  })

  const r = await readResp(resp)
  if (!resp.ok) {
    return NextResponse.json(
      { success: false, message: `Notification HTTP ${resp.status}`, error: r.json ?? r.text },
      { status: 502 }
    )
  }

  return NextResponse.json({ success: true, message: 'ส่ง Notification สำเร็จ', result: r.json ?? r.text })
}

export async function POST(req: NextRequest) {
  const op = req.nextUrl.searchParams.get('op') // login | notify | null

  // ถ้าเรียกผ่าน rewrite /test2/auth/login -> op=login
  if (op === 'login') return handleLogin(req)
  if (op === 'notify') return handleNotify(req)

  // default (กรณียิง /test2/api/dga หรือ /api/dga) ให้ทำ login เหมือนเดิม
  return handleLogin(req)
}
