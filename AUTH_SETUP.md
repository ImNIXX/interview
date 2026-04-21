# Authentication Setup Guide

## ✅ What Was Implemented

I've successfully added user authentication to your interview platform! Here's what's new:

### 🔐 Features Added

1. **User Registration** (`/register`)
   - Users can create accounts with name, email, and password
   - Passwords are securely hashed with bcrypt
   - Auto-login after registration
   - Email uniqueness validation

2. **User Login** (`/login`)
   - Email and password authentication
   - Secure session management
   - Error handling for invalid credentials

3. **Protected Routes**
   - Dashboard (`/`) requires authentication
   - All interview pages require authentication
   - All API routes are protected
   - Automatic redirect to login if not authenticated

4. **Multi-Tenant Data Isolation**
   - Users only see their own interviews
   - API routes filter by logged-in user
   - Ownership checks on all operations

5. **User Interface**
   - User info displayed in navbar (name + email)
   - Logout button
   - Clean, modern login/register forms

---

## 🚀 Setup Instructions

### 1. Update Environment Variables

Add these to your `.env` file:

```bash
# Generate a secret key (run this in terminal):
# openssl rand -base64 32

NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

**For Vercel deployment**, add these in your Vercel project settings:

- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your production URL (e.g., `https://yourapp.vercel.app`)

### 2. Run Database Migration

Your Prisma schema has been updated with a `User` model. Run this to update your database:

```bash
npm run migrate
```

Or if you prefer Prisma's migration system:

```bash
npx prisma migrate dev --name add-user-auth
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` - you'll be redirected to the login page!

---

## 📝 User Flow

### First Time User:

1. Visit your website
2. Redirected to `/login`
3. Click "Sign up" → Goes to `/register`
4. Enter name, email, password
5. Click "Create Account"
6. **Automatically logged in** → Redirected to dashboard
7. Start creating interviews!

### Returning User:

1. Visit your website
2. Login with email + password
3. See their own interviews only

---

## 🔒 Security Features

✅ **Password Security**

- Passwords hashed with bcrypt (10 rounds)
- Never stored in plain text
- Secure comparison during login

✅ **Session Management**

- JWT-based sessions
- HttpOnly cookies (can't be accessed by JavaScript)
- Automatic session refresh
- Secure by default

✅ **Route Protection**

- Middleware checks authentication on every request
- API routes validate user sessions
- Ownership checks prevent unauthorized access

✅ **Data Isolation**

- Each user has their own data space
- Users can't see or modify others' interviews
- Database queries filtered by `userId`

---

## 📊 Database Changes

### New Model: `User`

```prisma
model User {
  id        String      @id @default(cuid())
  name      String
  email     String      @unique
  password  String      // hashed
  createdAt DateTime    @default(now())
  interviews Interview[]
}
```

### Updated Model: `Interview`

```prisma
model Interview {
  // ... existing fields
  userId    String
  user      User @relation(fields: [userId], references: [id])
}
```

---

## 🌐 Deploying to Vercel

### Step 1: Push to Git

```bash
git add .
git commit -m "Add user authentication"
git push
```

### Step 2: Configure Environment Variables in Vercel

Go to your Vercel project settings → Environment Variables:

```
NEXTAUTH_SECRET = [generate with: openssl rand -base64 32]
NEXTAUTH_URL = https://your-app.vercel.app
DATABASE_URL = [your PostgreSQL connection string]
OPENROUTER_API_KEY = [your API key]
```

### Step 3: Deploy

Vercel will auto-deploy on push, or manually trigger:

```bash
vercel --prod
```

### Step 4: Run Database Migration on Production

Option A: Using Vercel's serverless function (recommended):

- The setup endpoint should handle this: visit `https://your-app.vercel.app/api/setup-db`

Option B: Manually with Prisma:

```bash
DATABASE_URL="your-production-db-url" npx prisma db push
```

---

## 🧪 Testing the Implementation

### Test Registration:

1. Go to `/register`
2. Create account: John Doe, john@test.com, password123
3. Should auto-login and redirect to dashboard

### Test Login:

1. Logout (click logout button in navbar)
2. Go to `/login`
3. Login with: john@test.com, password123
4. Should see dashboard with your interviews

### Test Data Isolation:

1. Create an interview while logged in as User A
2. Logout and create a new account (User B)
3. User B should see empty dashboard
4. Login back as User A - should see original interview

---

## 🎯 Key Files Created/Modified

### New Files:

- `src/auth.ts` - NextAuth configuration
- `src/app/api/auth/[...nextauth]/route.ts` - Auth API endpoint
- `src/app/api/auth/register/route.ts` - Registration endpoint
- `src/app/login/page.tsx` - Login page
- `src/app/register/page.tsx` - Registration page
- `src/middleware.ts` - Route protection
- `src/components/AuthProvider.tsx` - Session provider wrapper
- `src/types/next-auth.d.ts` - TypeScript definitions

### Modified Files:

- `prisma/schema.prisma` - Added User model
- `src/app/page.tsx` - Added user info + logout
- `src/app/layout.tsx` - Added AuthProvider
- `src/app/api/interviews/route.ts` - Added userId
- `src/app/api/interviews/list/route.ts` - Filter by userId
- `src/app/api/interviews/[id]/route.ts` - Check ownership
- `src/app/api/interviews/[id]/evaluate/route.ts` - Check ownership

---

## ⚠️ Important Notes

### No Email Verification (By Design)

- As requested, there's no email verification
- Users can register and use immediately
- Perfect for MVP testing
- Can add email verification later if needed

### Session Duration

- Sessions use JWT (stateless)
- Default expiration: 30 days
- Refresh automatically on activity
- Configure in `src/auth.ts` if needed

### Password Requirements

- Minimum 6 characters (configured in register form)
- You can add more rules in the registration API if needed

---

## 🔄 Future Enhancements (Optional)

If you want to add these later:

1. **Email Verification**
   - Add email sending service (SendGrid, Resend, etc.)
   - Add verified field to User model
   - Send verification emails on signup

2. **Password Reset**
   - Add forgot password functionality
   - Send reset emails with token
   - Add reset password page

3. **Social Login**
   - Add Google OAuth (1 line in NextAuth config!)
   - Add GitHub OAuth
   - Very easy to add later

4. **User Profile**
   - Add profile editing
   - Change password
   - Delete account

---

## 🆘 Troubleshooting

### "NEXTAUTH_SECRET is missing" Error

**Solution:** Add `NEXTAUTH_SECRET` to your `.env` file

```bash
openssl rand -base64 32
```

Copy the output to `.env`:

```
NEXTAUTH_SECRET="the-generated-value"
```

### Database Migration Fails

**Solution:** Make sure DATABASE_URL is set correctly in `.env`

```bash
# Check your connection string format:
DATABASE_URL="postgresql://user:password@host:5432/database"
```

### Can't Access Dashboard After Login

**Solution:** Check browser console for errors. Make sure cookies are enabled.

### Redirects to Login Even After Logging In

**Solution:**

1. Clear browser cookies
2. Check NEXTAUTH_URL matches your domain
3. In development, use `http://localhost:3000` (not 127.0.0.1)

---

## ✨ That's It!

Your interview platform now has secure, multi-tenant authentication! 🎉

Users can:

- ✅ Register with email/password
- ✅ Login securely
- ✅ Only see their own data
- ✅ Use the platform immediately (no email verification)

Perfect for your MVP! 🚀
