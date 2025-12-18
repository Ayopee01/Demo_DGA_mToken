# 1) Builder
FROM node:20-slim AS builder
WORKDIR /app

# (แนะนำ) ปิด next telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Install deps (ใช้ npm ci ถ้ามี package-lock.json)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Prisma: generate client ให้พร้อมก่อน build
# (ถ้าโปรเจกต์ไม่ได้ใช้ prisma จริง ๆ ก็ลบบรรทัดนี้ได้)
RUN npx prisma generate

# Build Next.js
RUN npm run build


# 2) Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3005
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# สำคัญสำหรับ Prisma runtime ใน container:
# 1) ให้มี prisma schema (บางเคสต้องใช้)
COPY --from=builder /app/prisma ./prisma
# 2) ให้มี prisma engines/client ที่ถูก generate แล้ว
# (ถ้า path นี้ไม่มี แปลว่าโปรเจกต์ไม่ได้ generate prisma client หรือไม่ได้ใช้ prisma)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3005

CMD ["node", "server.js"]
