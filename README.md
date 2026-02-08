
# 🎴 CardForge – Rapid Card-Game Prototyping

*Forge digital card games at lightning speed.*

CardForge turns your ideas (and spreadsheets) into playable prototypes without breaking a sweat. Define your data, design gorgeous cards, and iterate live — all right in your browser.

## Why CardForge?

**CardForge started in a basement full of spreadsheets, command‑line scripts, and half‑finished decks.**  
I built it to slash the grunt work, so anyone with a spark of an idea can print a test deck tonight, gather play‑test notes tomorrow, and iterate before sinking hours into final art. If you’re stepping into tabletop design—or ditching your own tangled prototyping setup—CardForge is your launchpad.

- **Template Designer** — build layouts visually or edit raw JSON.
- **Live Card Editor** — edit on the left, watch it render on the right.
- **Project Dashboard** — juggle multiple game ideas with ease.
- **One-click import/export** — JSON & CSV in, JSON & CSV out.
- **100 % local** — everything lives in your browser until you say otherwise.
- **Made by a fellow card‑game tinkerer** — forged from my own prototype pains, so you skip the headaches.

## 🚀 Quick Start

1. **Clone & Install**  

   ```bash
   git clone https://github.com/your-org/cardforge.git
   cd cardforge
   npm install
   ```

2. **Run**  

   ```bash
   npm run dev
   # open http://localhost:3000
   ```

3. **Follow the in‑app tour** — the *Getting Started* page builds your first deck in five minutes flat.

## 🛠️ Core Workflow

Here’s the exact loop I follow whenever a new concept grabs me—steal it and make it yours.

1. **Forge Templates**  
   Build reusable card blueprints in the **Template Designer**. Pick fields like `name`, `cost`, or `effectText`, then arrange them visually.
2. **Create a Project**  
   On the **Dashboard**, click **New Project**, pick your templates, and give your game a snazzy name.
3. **Add Cards & Iterate**  
   Open the **Live Card Editor** to fill out data and preview every tweak instantly.
4. **Share or Export**  
   Export your deck as JSON or CSV for play‑testing, printing, or feeding into your engine.

Deck grid view is currently getting a makeover and will return soon.

## 🧩 Feature Deep Dive

### Project Dashboard

- Snapshot of every prototype with editable thumbnails.
- Archive or delete experiments you’ve outgrown.

### Template Library & Designer

- Global template bank with cross‑project reuse.
- Dual‑mode builder: friendly GUI or raw JSON.
- Placeholder image generator for speedy mocks.
- Pixel‑perfect preview with optional grid overlay.

### Live Card Editor

- Accordion list of cards grouped by template.
- Real‑time rendered preview via `DynamicCardRenderer`.

### Data Import / Export

- Drop in JSON or CSV to bulk‑create cards.
- Download your deck anytime — perfect for version control.

### Persistence

Everything is stored in **localStorage**, so your work stays put between sessions.

## ⚙️ Tech Stack

| Layer      | Technology                       | Why We Love It                        |
|------------|----------------------------------|---------------------------------------|
| Framework  | **Next.js (App Router)**         | Fast dev & file‑based routing         |
| Language   | **TypeScript**                   | Type‑safe templates & components      |
| UI         | **ShadCN UI** + **Tailwind CSS** | Accessible components & utility CSS   |
| State      | **React Context**                | Simple global store                   |
| Storage    | **localStorage**                 | Zero‑setup persistence                |

## 📂 Project Blueprint

```text
src/
 ├─ app/                       # Pages & routes
 │   ├─ page.tsx                       – dashboard
 │   ├─ getting-started/               – tutorial
 │   ├─ templates/                     – template library
 │   └─ project/[projectId]/editor/    – live editor
 ├─ components/
 │   ├─ template-designer/             – designer panels
 │   └─ editor/                        – card editor widgets
 ├─ contexts/                          – React providers
 ├─ lib/                               – core logic & types
 └─ ai/                                – Genkit flows
```

*(A full tree lives in `docs/architecture.md` if you’re curious.)*

## Creator’s Note

CardForge doubles as my personal sandbox for levelling up as a product‑and‑UX human. Every feature ships only after a round of real‑world play‑testing (with friends who are brutally honest).  
If something feels clunky, open an issue or tweet at me—I’m probably already scheming a fix during a late‑night prototyping sprint.

## 🌱 Roadmap

- [ ] Cloud sync (Firebase or Supabase)  
- [ ] Advanced deck validation  
- [ ] AI image & effect generation  
- [ ] Print‑ready PDF export  

---

Built with ❤️ and far too many play‑tests.
