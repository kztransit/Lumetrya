# Используем Node.js
FROM node:20-alpine

WORKDIR /app

# 1. Копируем файлы зависимостей
COPY package*.json ./
COPY prisma ./prisma/

# 2. Устанавливаем зависимости
RUN npm ci --unsafe-perm

# 3. Копируем остальной исходный код (ВАЖНО сделать это ДО генерации клиента)
COPY . .

# 4. Принудительно даем права на бинарники
RUN chmod -R +x node_modules/.bin

# 5. Генерируем клиент Prisma (теперь он точно увидит все зависимости)
RUN npx prisma generate

# 6. Собираем TypeScript проект
RUN npm run build

# Пробрасываем порт
ENV PORT=8080
EXPOSE 8080

# ЗАПУСК: Мы запускаем сервер через npx, чтобы он подхватил сгенерированную схему
CMD ["node", "dist/index.js"]