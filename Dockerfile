# ---------- 1. ติดตั้ง dependency ----------
FROM node:20-bullseye-slim AS deps
WORKDIR /app

# ติดตั้ง CA สำหรับ TLS (สำคัญสำหรับ Prisma Accelerate)
RUN apt-get update \
  && apt-get install -y ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ถ้ามี package-lock.json ใช้ npm ci จะเร็ว+เสถียรกว่า
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2. Build Next.js + Prisma ----------
FROM node:20-bullseye-slim AS builder
WORKDIR /app

# ติดตั้ง CA อีกครั้งใน stage นี้ (กัน build step อื่น ๆ ที่ต้องใช้ TLS)
RUN apt-get update \
  && apt-get install -y ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# generate Prisma Client (ไม่ต้องต่อ DB)
RUN npx prisma generate

# build Next app (จะใช้ NODE_ENV=production อัตโนมัติ)
RUN npm run build

# ---------- 3. Runtime image ----------
FROM node:20-bullseye-slim AS runner
WORKDIR /app

# ติดตั้ง CA ใน runtime (สำคัญที่สุด เพราะ npx prisma migrate deploy รันตรงนี้)
RUN apt-get update \
  && apt-get install -y ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# สร้าง user ที่ไม่ใช่ root เพื่อ security
RUN groupadd -r nextjs && useradd -r -g nextjs nextjs

# เอาไฟล์ที่จำเป็นจาก builder stage มาใช้
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs

# Next.js ใช้ port 3005 ข้างใน container
EXPOSE 3005

# ตอนรันจริงเราจะสั่งผ่าน docker-compose ให้รัน prisma migrate + next start
CMD ["npm", "start"]
