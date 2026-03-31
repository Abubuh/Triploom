# ✈️ Triploom

> AI-powered travel organizer — plan smarter, travel better.

Triploom is a full-stack web application that helps you plan trips end-to-end: generate personalized itineraries with AI, track your budget in real time, store travel documents, and invite fellow travelers — all in one place.

---

## 🌐 Live Demo

🔗 [triploom.vercel.app](#) <!-- Reemplaza con tu URL cuando hagas deploy -->

---

## ✨ Features

- **AI Itinerary Generator** — Powered by Claude (Anthropic). Generates day-by-day itineraries tailored to each traveler's preferences, budget, and travel pace
- **Budget Tracker** — Track expenses per day, per category, and per currency. Visual progress bar against your personal budget
- **Document Storage** — Upload PDFs (tickets, insurance, visas) and save reservation links — all tied to your trip
- **Trip Invitations** — Invite travelers via shareable link. Smart warnings if not all members have joined or filled their preferences before generating the itinerary
- **Multi-traveler Preferences** — Each traveler sets their own budget, food preferences, activity interests, and travel pace
- **Editable Itinerary** — Edit activity titles and descriptions inline, and download the full itinerary as a `.txt` file

---

## 🛠️ Tech Stack

| Layer    | Technology                             |
| -------- | -------------------------------------- |
| Frontend | React 18 + TypeScript                  |
| Styling  | Tailwind CSS                           |
| Routing  | React Router v6                        |
| State    | Zustand                                |
| Backend  | Supabase (PostgreSQL + Auth + Storage) |
| AI       | Anthropic Claude API (Haiku)           |
| Build    | Vite                                   |

---

## 🗄️ Database Schema

```
trips
├── destinations
├── trip_members
│   └── member_preferences
├── itinerary_days
├── expenses
├── documents
└── trip_invitations
```

Row Level Security (RLS) enabled on all tables — users can only access data from trips they belong to.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key

### Installation

```bash
# Clone the repo
git clone https://github.com/Abubuh/Triploom.git
cd Triploom

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

Fill in your `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

```bash
# Start the dev server
npm run dev
```

### Supabase Setup

1. Create the tables using the SQL migrations in `/supabase` (coming soon)
2. Enable RLS on all tables
3. Create a `trip-documents` storage bucket (public)
4. Set up Auth with email/password

---

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components (ExpenseDrawer, DocumentDrawer)
├── constants/        # Trip options (food, activities, pace)
├── hooks/            # Custom hooks (useExpenses, useDocuments)
├── lib/              # Supabase client, Claude integration
├── pages/            # Route-level components
├── store/            # Zustand store (trip creation wizard)
└── types/            # TypeScript interfaces
```

---

## 📸 Screenshots

<!-- Agrega screenshots cuando tengas deploy -->

> Coming soon

---

## 🔮 Roadmap

- [ ] Deploy to Vercel
- [ ] SQL migration files
- [ ] Member voting on destinations/activities
- [ ] Email invitations
- [ ] PWA support for mobile

---

## 👨‍💻 Author

**Cristian** — [@Abubuh](https://github.com/Abubuh) · [LinkedIn](https://linkedin.com/in/cristian-hdz)

---

## 📄 License

MIT
