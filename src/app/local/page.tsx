'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ApiResponse, UserDto } from '@/types/dga'
import {
  FiActivity,
  FiLoader,
  FiAlertCircle,
  FiCheckCircle,
  FiTerminal,
  FiDatabase,
} from 'react-icons/fi'
import { BiTestTube } from 'react-icons/bi'

// ประกาศ type ให้ window.czpSdk ตาม Doc Javascript SDK
declare global {
  interface Window {
    czpSdk?: {
      getAppId?: () => string
      getToken?: () => string
      setTitle?: (title: string, isShowBackButton: boolean) => void
      setBackButtonVisible?: (visible: boolean) => void
    }
  }
}

// appId เริ่มต้นไว้สำหรับ Test
const DEFAULT_APP_ID = '1dfbf47f-92a7-48ac-a404-490818bcb75a'

const getAppIdAndMTokenFromSDKorURL = (): { appId: string; mToken: string } | null => {
  if (typeof window === 'undefined') return null

  let appId: string | null = null
  let mToken: string | null = null

  const sdk = window.czpSdk

  // 1) จาก SDK
  if (sdk?.getAppId && sdk?.getToken) {
    try {
      appId = sdk.getAppId()
      mToken = sdk.getToken()
    } catch {
      // ignore
    }
  }

  // 2) fallback จาก URL
  if (!appId || !mToken) {
    const params = new URLSearchParams(window.location.search)
    appId = appId || params.get('appId')
    mToken = mToken || params.get('mToken')
  }

  if (!appId || !mToken) return null
  return { appId, mToken }
}

export default function HomePage() {
  const [result, setResult] = useState<UserDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---- ฟอร์ม Dev ----
  const [appId, setAppId] = useState<string>(DEFAULT_APP_ID)
  const [mToken, setMToken] = useState<string>('')

  useEffect(() => {
    const pair = getAppIdAndMTokenFromSDKorURL()
    if (pair) {
      // ถ้า pair.appId ไม่มี ใช้ DEFAULT_APP_ID แทน
      setAppId(pair.appId || DEFAULT_APP_ID)
      setMToken(pair.mToken)
    }
    // ถ้า pair ไม่เจอเลย appId จะยังเป็น DEFAULT_APP_ID ตามค่า initial state
  }, [])

  // ====== ฟังก์ชันยิง API ======
  const callAPI = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    if (!appId || !mToken) {
      setError('กรุณาใส่ appId และ mToken')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/dga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, mToken }),
      })

      const data: ApiResponse = await response.json()

      if (!response.ok) {
        setError(`HTTP error: ${response.status}`)
        return
      }

      if (!data.ok) {
        setError(data.error)
        return
      }

      setResult(data.saved)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6">
        {/* Header + ปุ่มกลับ Production */}
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-800">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800">
                <BiTestTube className="h-3 w-3 text-emerald-400" />
              </span>
              <span>Dev · Local Test Mode</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                DGA Miniapp Demo (App Router + Prisma)
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                <FiTerminal className="h-4 w-4 text-emerald-400" />
                <span>
                  Dev Mode – ทดสอบบน <code className="rounded bg-slate-900 px-1 py-0.5 text-xs text-sky-300">localhost</code>{' '}
                  โดยใส่ <code className="rounded bg-slate-900 px-1 py-0.5 text-xs text-sky-300">appId</code> และ{' '}
                  <code className="rounded bg-slate-900 px-1 py-0.5 text-xs text-sky-300">mToken</code> เอง หรือดึงจาก SDK/URL
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 md:inline">
              ไปหน้า Production:
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 shadow hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950 transition-colors"
            >
              <FiActivity className="h-4 w-4 text-emerald-400" />
              <span>Production · SDK Mode</span>
            </Link>
          </div>
        </header>

        {/* ฟอร์ม Dev + สถานะ + ผลลัพธ์ */}
        <main className="grid flex-1 gap-6 md:grid-cols-[1.2fr,1fr]">
          {/* ฟอร์ม Dev */}
          <section className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/40">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <FiTerminal className="h-4 w-4 text-sky-300" />
              <span>Dev Mode Input</span>
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              กำหนดค่า <code className="rounded bg-slate-900 px-1 py-0.5 text-[11px] text-sky-300">appId</code> /{' '}
              <code className="rounded bg-slate-900 px-1 py-0.5 text-[11px] text-sky-300">mToken</code> เพื่อทดสอบ Flow
              validate → deproc → DB
            </p>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-200">
                  App ID
                </label>
                <input
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="ใส่ appId"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Default: <code className="text-emerald-300">{DEFAULT_APP_ID}</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200">
                  MToken
                </label>
                <input
                  value={mToken}
                  onChange={(e) => setMToken(e.target.value)}
                  placeholder="ใส่ mToken"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={callAPI}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiActivity className="h-4 w-4" />
                <span>Fetch Data</span>
              </button>
            </div>

            {/* Status ย่อยใน card เดียวกัน */}
            <div className="mt-6 rounded-xl bg-slate-950/60 p-3 text-xs text-slate-200 ring-1 ring-slate-800/70">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-slate-100">สถานะการเรียก API</span>

                {/* badge สถานะ */}
                <div>
                  {loading && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-200">
                      <FiLoader className="h-3 w-3 animate-spin text-emerald-400" />
                      <span>กำลังประมวลผล</span>
                    </span>
                  )}
                  {!loading && error && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-300 ring-1 ring-red-500/40">
                      <FiAlertCircle className="h-3 w-3" />
                      <span>เกิดข้อผิดพลาด</span>
                    </span>
                  )}
                  {!loading && !error && result && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/40">
                      <FiCheckCircle className="h-3 w-3" />
                      <span>สำเร็จแล้ว</span>
                    </span>
                  )}
                  {!loading && !error && !result && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300">
                      <FiActivity className="h-3 w-3 text-slate-400" />
                      <span>ยังไม่มีการเรียก API</span>
                    </span>
                  )}
                </div>
              </div>

              {/* detail ข้อความ status */}
              {loading && (
                <p>
                  ส่งคำขอแล้ว…{' '}
                  <span className="text-slate-400">
                    (validate → deproc → บันทึก DB)
                  </span>
                </p>
              )}

              {error && (
                <p className="whitespace-pre-wrap text-red-300">
                  {error}
                </p>
              )}

              {!loading && !error && !result && (
                <p className="text-slate-300">
                  กดปุ่ม <span className="font-semibold">Fetch Data</span> เพื่อเริ่มทดสอบ Flow
                </p>
              )}

              {!loading && !error && result && (
                <p className="text-emerald-300">
                  เรียก API สำเร็จ และบันทึกข้อมูลผู้ใช้ลงฐานข้อมูลแล้ว
                </p>
              )}
            </div>
          </section>

          {/* ผลลัพธ์ DB */}
          <section className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/40">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <FiDatabase className="h-4 w-4 text-emerald-300" />
                <span>Last Saved User (from Postgres)</span>
              </h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                ใช้สำหรับตรวจสอบ / debug
              </span>
            </div>

            <pre className="mt-3 max-h-80 flex-1 overflow-auto rounded-lg bg-black/80 p-4 font-mono text-xs text-emerald-300">
              {result ? JSON.stringify(result, null, 2) : 'No result'}
            </pre>
          </section>
        </main>
      </div>
    </div>
  )
}
