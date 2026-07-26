# Quiz App

MVP веб-приложения для проведения квизов в реальном времени. Организатор создаёт
квиз, участники подключаются по коду комнаты, отвечают на вопросы в реальном
времени, в конце — лидерборд.

## Стек

**Backend:** Node.js + Express 5, Socket.IO, SQLite + Prisma ORM, JWT + bcrypt, multer
**Frontend:** React 19 + Vite, React Router, Zustand, socket.io-client, Tailwind + DaisyUI

## Требования

- Node.js 20+

## Установка и запуск

### 1. Backend

```bash
cd backend
npm install
```

Создать файл `backend/.env`:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-secret-change-me"
PORT=4000
```

Применить миграции и запустить сервер:

```bash
npx prisma migrate deploy
npm run dev
```

Backend поднимется на `http://localhost:4000` (REST `/api/...` + Socket.IO в одном процессе).

### 2. Frontend

В отдельном терминале:

```bash
cd frontend
npm install
```

Создать файл `frontend/.env`:

```
VITE_SERVER_URL=http://localhost:4000
```

Запустить:

```bash
npm run dev
```

Frontend поднимется на `http://localhost:5173`. Запросы к `/api` и `/uploads`
проксируются на backend (см. `vite.config.js`), поэтому CORS настраивать не нужно.

## Использование

1. Открыть `http://localhost:5173`, зарегистрироваться как организатор.
2. Создать квиз, добавить один или несколько вопросов (single/multiple choice,
   опционально — картинка).
3. Перейти в комнату — там будет виден код комнаты.
4. Во втором окне/браузере зарегистрироваться как участник и войти по коду комнаты.
5. Организатор нажимает «Начать квиз» — вопросы идут автоматически по таймеру,
   в конце показывается лидерборд.

## Полезные команды (backend)

- `npm run dev` — запуск с автоперезагрузкой (nodemon)
- `npm run prisma:studio` — GUI для просмотра/редактирования БД
- `npx prisma migrate dev --name <имя>` — новая миграция после изменения схемы
