# HealthLink Pro

A comprehensive health data exchange platform built for the VOIS Hackathon. HealthLink Pro provides a secure, patient-controlled environment where patients, healthcare providers, and insurance companies can share health records with granular consent management and full audit trails.

> **⚠️ Important**: This repository contains the **frontend application only**. A separate backend service is required to handle data persistence, authentication, and IBM Cloud integration. See [Backend Requirements](./docs/BACKEND_REQUIREMENTS.md) for details.

> **🎨 UX4G Compliance**: This platform follows Indian Government UX Guidelines (UX4G) with Noto Sans font, government color palette, accessibility features, and multi-language support. See [UX4G Documentation](./docs/UX4G_COMPONENTS.md) for details.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Backend API running (see Backend Requirements)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd vi-hackathon-main

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production
```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📱 Application Features

### Core Modules
- **Dashboard**: Real-time health statistics and quick actions
- **Medical Records**: Upload, view, download, and share medical documents
- **Appointments**: Schedule and manage healthcare appointments
- **Prescriptions**: Track medications and prescriptions
- **Lab Tests**: Order and view test results
- **Consent Management**: Control data sharing permissions
- **Audit Trail**: Complete access history and logging
- **Settings**: User preferences and account management

### Security Features
- JWT-based authentication
- Automatic token management
- Role-based access control
- End-to-end encryption
- Comprehensive audit logging
- Privacy consent management

### User Experience
- Responsive design (mobile, tablet, desktop)
- Dark/light theme support
- Government-compliant UI (UX4G)
- Accessibility features (WCAG compliant)
- Multi-language support
- Toast notifications for user feedback
- Error boundaries for crash prevention

## 🚀 Deployment

### Environment Variables
Create a `.env.local` file with:
```env
# Backend API URL
NEXT_PUBLIC_API_URL=https://your-backend-api-url

# Optional: Google Genkit for AI features
GOOGLE_GENAI_API_KEY=your-google-api-key
```

### Production Build
```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## ✅ Project Status

**Current Status**: ✅ **PRODUCTION READY**

### Completed Features
- ✅ Complete authentication system (login/signup)
- ✅ Full dashboard with real-time statistics
- ✅ Medical records management (CRUD operations)
- ✅ Appointments, prescriptions, lab tests modules
- ✅ Consent management with revocation
- ✅ Comprehensive audit trail
- ✅ Error handling and user feedback
- ✅ Responsive design and accessibility
- ✅ Government UX4G compliance
- ✅ TypeScript type safety
- ✅ Production build optimization

### Build Status
- ✅ TypeScript compilation: No errors
- ✅ Production build: Successful (15 routes)
- ✅ Bundle optimization: Optimized chunks
- ✅ Static generation: All pages prerendered

### API Integration
- ✅ Backend URL: `https://super-duper-spork-r4779p5vp5552xx69-4000.app.github.dev/api`
- ✅ JWT authentication with auto-token management
- ✅ Comprehensive API client with error handling
- ✅ All endpoints implemented and tested

## 👥 Contributing

### Development Guidelines
- Follow TypeScript strict mode
- Use shadcn/ui components for consistency
- Maintain UX4G compliance for government features
- Add proper error handling and user feedback
- Test all features before committing

### Code Quality
- ESLint configuration for code standards
- TypeScript for type safety
- Prettier for code formatting
- Husky pre-commit hooks (recommended)

## 📄 License

This project is developed for the VOIS Hackathon. See LICENSE file for details.

## 🙏 Acknowledgments

- **VOIS Hackathon** for the opportunity
- **Indian Government UX4G Guidelines** for design standards
- **Next.js, React, and TypeScript** communities
- **shadcn/ui** for the component library
- **IBM Cloud** for backend infrastructure

---

**Built with ❤️ for India's Digital Healthcare Future** 🏥🇮🇳

## 🏗️ Technology Stack

### Frontend (This Repository)
- Next.js 15.3.3 with TypeScript
- Radix UI + Tailwind CSS
- shadcn/ui + UX4G components
- React Hook Form + Zod validation
- Google Genkit for AI features (optional)
- Noto Sans font (Government standard)

### Backend (Separate Repository)
- RESTful API with authentication
- **IBM Cloudant**: NoSQL database for metadata
- **IBM Cloud Object Storage**: Secure file storage
- JWT-based authentication
- Role-based access control

## 🎨 UX4G Components

This project uses custom UX4G-compliant components:

- **Accessibility Bar**: Mandatory government accessibility features
- **Government Navbar**: Navigation with national branding
- **Government Footer**: Footer with ministry links and compliance info
- **UX4G Buttons**: Government-styled buttons with semantic variants
- **UX4G Cards**: Elevation-based card components
- **UX4G Badges & Chips**: Status indicators
- **UX4G Alerts**: Notification system

See [UX4G Components Documentation](./docs/UX4G_COMPONENTS.md) for usage examples.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18+ and npm/yarn
- Git

You'll also need:
- Access to the backend API (see backend repository)
- Google Cloud account (optional, for AI features)

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone [repository-url]
cd vi-hackathon-main
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your backend API URL:

```env
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_API_VERSION=v1

# Google Cloud Configuration (optional, for AI features)
GOOGLE_CLOUD_PROJECT_ID=your_google_project_id
GOOGLE_GENAI_API_KEY=your_gemini_api_key

# Application Configuration
NEXT_PUBLIC_APP_NAME=HealthLink Pro
NEXT_PUBLIC_APP_URL=http://localhost:9002

# Environment
NODE_ENV=development
```

### 4. Start Development Server

```bash
# Start Next.js development server
npm run dev

# (Optional) In a separate terminal, start the AI development server
npm run genkit:dev
```

The application will be available at `http://localhost:9002`.

### 5. Backend Setup

**Important**: This frontend application requires a separate backend service to function. 

Please refer to the backend repository for:
- Backend API setup instructions
- Database configuration
- IBM Cloud services setup
- Authentication configuration

Ensure the backend API is running before starting the frontend application.

## 📚 Project Structure

```
vi-hackathon-main/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── login/             # Authentication pages
│   │   ├── signup/
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── theme-provider.tsx
│   │   └── user-nav.tsx
│   ├── lib/                   # Utility functions
│   │   ├── cloudant.ts       # IBM Cloudant client
│   │   ├── ibm-cos.ts        # IBM COS client
│   │   └── utils.ts
│   ├── ai/                    # AI/Genkit configuration
│   │   ├── genkit.ts
│   │   └── dev.ts
│   └── hooks/                 # Custom React hooks
├── docs/
│   └── blueprint.md           # Project blueprint
├── public/                    # Static assets
├── package.json
└── README.md
```

## 🔑 Key Features

### Medical Records Management
- Upload PDFs, DICOM files, images, and more
- Automatic tagging and categorization
- Version control for document updates
- Full-text search across records

### Consent Management
- Granular access control (view, download, edit)
- Purpose-based permissions
- Time-bound access with automatic expiration
- Quick approval/revocation workflow

### Audit Trail
- Comprehensive logging of all data access
- Real-time activity monitoring
- Historical audit reports
- Anomaly detection for unusual access patterns

### AI-Powered Features
- Automatic document categorization
- Medical condition extraction
- Smart search with natural language
- Analytics and insights

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 🚀 Deployment

### Deploy to IBM Cloud Code Engine

```bash
# Build the application
npm run build

# Deploy using IBM Cloud CLI
ibmcloud ce application create --name healthlink-pro \
  --image [your-container-image] \
  --port 3000 \
  --env-from-secret healthlink-secrets
```

### Environment Variables for Production

Ensure all environment variables are set in your production environment:
- Use IBM Cloud Secrets Manager for sensitive credentials
- Enable HTTPS/TLS
- Set `NODE_ENV=production`

## 📖 Documentation

- [**Architecture Overview**](./docs/ARCHITECTURE.md) - Frontend-backend separation guide
- [**API Documentation**](./docs/API_DOCUMENTATION.md) - Complete API endpoint reference
- [**Backend Requirements**](./docs/BACKEND_REQUIREMENTS.md) - Backend implementation specifications
- [**Project Blueprint**](./docs/blueprint.md) - Comprehensive project documentation
- User Guide - End-user documentation (coming soon)

## 🤝 Contributing

This is a hackathon project. For contributions:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is created for the VOIS Hackathon.

## 👥 Team

- **Technical Lead**: [Name]
- **Frontend Developer**: [Name]
- **AI/ML Engineer**: [Name]
- **Product Manager**: [Name]

## 🙏 Acknowledgments

- VOIS Hackathon organizers
- IBM Cloud for enterprise infrastructure
- Google for Genkit AI capabilities
- shadcn/ui for beautiful components

## 📞 Support

For questions or issues:
- Create an issue in the repository
- Contact: [your-email]

---

**Built with ❤️ for the VOIS Hackathon**
