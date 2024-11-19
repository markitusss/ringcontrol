# Billing Control System Project Specification

Create a modern billing control system using Next.js 13+ with the following specifications:

## Tech Stack
- Next.js 13+ with App Router
- Supabase for authentication and database
- TypeScript
- Tailwind CSS with shadcn/ui components
- XLSX for Excel file processing

## Core Features

### 1. Authentication
- Login page with email/password
- Protected routes using middleware
- Session management
- Automatic redirects for authenticated/unauthenticated users

### 2. Database Schema
```sql
-- Core Tables
- company_settings (id, company_name, logo_url, review_percentage)
- clients (id, alias, name)
- facturas (invoices) (id, numero_factura, fecha, alias, total, mes, anio, no_revisar)
- monthly_stats (id, mes, anio, total_facturas, various_amounts)
- historial_importacion (id, mes, anio, fecha_importacion)

-- Key Features
- UUID primary keys
- Timestamps for all tables
- Foreign key relationships
- Row Level Security (RLS)
- Automatic statistics updates via triggers
```

### 3. Main Features

#### Invoice Management
- Excel file import functionality
  - Parse Excel files with specific columns
  - Validate data format and content
  - Batch import with progress tracking
  - Historical import tracking

#### Monthly Analysis
- Filter by month and year
- Calculate and display:
  - Total invoices
  - Reviewable invoices
  - Total amounts
- Compare with previous month:
  - New clients
  - Missing clients
  - Significant changes (configurable percentage)

#### Client Management
- View all clients
- Search functionality
- Edit client details
- Automatic client creation during import

#### Settings
- Company logo management
  - Upload with size restrictions
  - Automatic storage in Supabase
- Review percentage configuration
- Dark/Light theme toggle

### 4. UI/UX Requirements
- Responsive design
- Loading states
- Error handling
- Toast notifications
- Progress indicators
- Modal dialogs
- Data tables
- Search functionality
- Filtering capabilities

### 5. Layout
- Header with logo and user info
- Sidebar navigation
- Main content area
- Dark/Light mode support

### 6. Security
- Protected API routes
- Row Level Security in Supabase
- Secure file uploads
- Session management
- Protected routes

### 7. Performance
- Client-side caching
- Optimized database queries
- Efficient Excel parsing
- Responsive UI

## Implementation Notes

### File Structure
```
app/
  ├── login/
  ├── clients/
  ├── facturacio/
  └── components/
      ├── layout/
      └── ui/
```

### Key Components
- Excel upload dialog
- Month/Year selector
- Statistics cards
- Invoice lists
- Client management
- Settings panel

### State Management
- React hooks for local state
- Supabase real-time updates
- Form state with react-hook-form
- Validation with Zod

### Styling
- Tailwind CSS
- CSS variables for theming
- Consistent spacing and colors
- Responsive design patterns

### Error Handling
- Form validation
- API error handling
- User feedback
- Loading states

## Development Guidelines
1. Modular component architecture
2. TypeScript for type safety
3. Consistent error handling
4. Comprehensive loading states
5. Responsive design
6. Accessibility compliance
7. Performance optimization
8. Code documentation
9. Security best practices
10. Testing considerations