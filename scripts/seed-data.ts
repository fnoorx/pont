// Fictional demo data for `npm run seed`. All schools, people and numbers are made up.
// Anglophone names and notes in NW/SW, francophone elsewhere.

export type Role = "headteacher" | "teacher" | "partner" | "community";
export type Language = "en" | "fr";
export type Channel = "whatsapp" | "sms";
export type EnrollmentBand = "lt100" | "100_300" | "300_600" | "gt600";
export type BuildingCondition = "good" | "needs_repair" | "unsafe";
export type PowerSource = "grid_reliable" | "grid_unreliable" | "solar" | "generator" | "none";
export type Connectivity = "good" | "weak" | "none";
export type Devices = "none" | "few" | "enough";
export type TopNeed = "building" | "furniture" | "supplies" | "power" | "computers" | "internet" | "training" | "other";

export interface SeedReporter {
  /** Fictional Cameroon number in a reserved-looking range. */
  phone: string;
  channel: Channel;
  language: Language;
  role: Role;
}

export interface SeedAssessment {
  daysAgo: number;
  reporter: number; // index into REPORTERS
  enrollment: EnrollmentBand;
  building: BuildingCondition;
  power: PowerSource;
  connectivity: Connectivity;
  devices: Devices;
  need: TopNeed;
  notes?: string;
  verified: boolean;
  /** Attach a placeholder building photo to this assessment. */
  photo?: boolean;
}

export interface SeedSchool {
  name: string;
  region: string;
  town: string;
  /** Town centre. The seed adds a small deterministic offset for the exact pin. */
  lat: number;
  lng: number;
  assessments: SeedAssessment[];
}

export const REPORTERS: SeedReporter[] = [
  { phone: "+237699000001", channel: "whatsapp", language: "en", role: "partner" },
  { phone: "+237699000002", channel: "sms", language: "en", role: "headteacher" },
  { phone: "+237699000003", channel: "whatsapp", language: "en", role: "teacher" },
  { phone: "+237699000004", channel: "whatsapp", language: "fr", role: "partner" },
  { phone: "+237699000005", channel: "sms", language: "fr", role: "headteacher" },
  { phone: "+237699000006", channel: "whatsapp", language: "fr", role: "community" },
  { phone: "+237699000007", channel: "whatsapp", language: "fr", role: "teacher" },
  { phone: "+237699000008", channel: "whatsapp", language: "fr", role: "headteacher" },
  { phone: "+237699000009", channel: "sms", language: "en", role: "community" },
  { phone: "+237699000010", channel: "whatsapp", language: "fr", role: "partner" },
];

export const SCHOOLS: SeedSchool[] = [
  // Northwest (sensitive, anglophone)
  {
    name: "Morning Star Community School", region: "NW", town: "Bamenda", lat: 5.96, lng: 10.15,
    assessments: [
      { daysAgo: 41, reporter: 0, enrollment: "300_600", building: "unsafe", power: "none", connectivity: "weak", devices: "none", need: "building", notes: "Roof blown off in the last storm. Classes are held under a tarpaulin.", verified: true, photo: true },
      { daysAgo: 19, reporter: 1, enrollment: "300_600", building: "unsafe", power: "none", connectivity: "weak", devices: "none", need: "building", notes: "Parents brought some iron sheets but it is not enough for two classrooms.", verified: true },
      { daysAgo: 3, reporter: 0, enrollment: "300_600", building: "unsafe", power: "none", connectivity: "weak", devices: "none", need: "building", verified: false },
    ],
  },
  {
    name: "Blue Hibiscus Primary School", region: "NW", town: "Kumbo", lat: 6.20, lng: 10.68,
    assessments: [
      { daysAgo: 12, reporter: 2, enrollment: "100_300", building: "needs_repair", power: "none", connectivity: "weak", devices: "none", need: "furniture", notes: "Pupils share benches, three per bench in Class 1.", verified: false },
    ],
  },
  {
    name: "Hilltop Weaverbird School", region: "NW", town: "Wum", lat: 6.38, lng: 10.07,
    assessments: [
      { daysAgo: 30, reporter: 0, enrollment: "lt100", building: "unsafe", power: "none", connectivity: "none", devices: "none", need: "building", verified: true },
      { daysAgo: 8, reporter: 8, enrollment: "lt100", building: "unsafe", power: "none", connectivity: "none", devices: "none", need: "building", notes: "School reopened last month. Walls are cracked.", verified: false },
    ],
  },
  // Southwest (sensitive, anglophone)
  {
    name: "Mountain Mist Primary School", region: "SW", town: "Buea", lat: 4.16, lng: 9.24,
    assessments: [
      { daysAgo: 22, reporter: 2, enrollment: "gt600", building: "good", power: "grid_unreliable", connectivity: "good", devices: "few", need: "training", notes: "Teachers want training on using the few tablets we have.", verified: true },
    ],
  },
  {
    name: "Palm Grove Nursery and Primary", region: "SW", town: "Kumba", lat: 4.64, lng: 9.45,
    assessments: [
      { daysAgo: 35, reporter: 1, enrollment: "100_300", building: "needs_repair", power: "solar", connectivity: "weak", devices: "none", need: "computers", verified: true },
      { daysAgo: 6, reporter: 1, enrollment: "300_600", building: "needs_repair", power: "solar", connectivity: "weak", devices: "none", need: "computers", notes: "Solar panel installed by the community. We have power now but no devices.", verified: false, photo: true },
    ],
  },
  {
    name: "Seabreeze Bilingual School", region: "SW", town: "Limbe", lat: 4.02, lng: 9.20,
    assessments: [
      { daysAgo: 15, reporter: 8, enrollment: "300_600", building: "good", power: "grid_reliable", connectivity: "good", devices: "enough", need: "training", verified: false },
    ],
  },
  // Far North (sensitive, francophone)
  {
    name: "École Publique du Baobab Doré", region: "EN", town: "Maroua", lat: 10.59, lng: 14.32,
    assessments: [
      { daysAgo: 28, reporter: 9, enrollment: "gt600", building: "unsafe", power: "none", connectivity: "weak", devices: "none", need: "building", notes: "Deux salles de classe sans toit. Les élèves étudient dehors.", verified: true },
      { daysAgo: 4, reporter: 4, enrollment: "gt600", building: "unsafe", power: "none", connectivity: "weak", devices: "none", need: "furniture", notes: "Le toit est réparé en partie, mais il manque des tables-bancs.", verified: false },
    ],
  },
  {
    name: "École des Rochers Bleus", region: "EN", town: "Mokolo", lat: 10.74, lng: 13.80,
    assessments: [
      { daysAgo: 17, reporter: 6, enrollment: "100_300", building: "needs_repair", power: "solar", connectivity: "none", devices: "none", need: "supplies", notes: "Il manque des livres de lecture pour le CE1 et le CE2.", verified: false },
    ],
  },
  {
    name: "École Publique du Fleuve Calme", region: "EN", town: "Kousseri", lat: 12.08, lng: 15.03,
    assessments: [
      { daysAgo: 9, reporter: 9, enrollment: "300_600", building: "unsafe", power: "none", connectivity: "weak", devices: "none", need: "furniture", verified: true },
    ],
  },
  // Centre
  {
    name: "Lycée des Sept Collines", region: "CE", town: "Yaoundé", lat: 3.87, lng: 11.52,
    assessments: [
      { daysAgo: 50, reporter: 7, enrollment: "gt600", building: "good", power: "grid_reliable", connectivity: "good", devices: "few", need: "computers", verified: true },
      { daysAgo: 10, reporter: 7, enrollment: "gt600", building: "good", power: "grid_reliable", connectivity: "good", devices: "enough", need: "training", notes: "Nous avons reçu des ordinateurs. Les enseignants ont besoin de formation.", verified: true },
    ],
  },
  {
    name: "École Publique du Soleil Levant", region: "CE", town: "Mbalmayo", lat: 3.52, lng: 11.50,
    assessments: [
      { daysAgo: 14, reporter: 3, enrollment: "300_600", building: "needs_repair", power: "grid_unreliable", connectivity: "weak", devices: "none", need: "computers", verified: false },
    ],
  },
  // Littoral
  {
    name: "Complexe Scolaire Les Palmiers Bleus", region: "LT", town: "Douala", lat: 4.05, lng: 9.70,
    assessments: [
      { daysAgo: 60, reporter: 3, enrollment: "gt600", building: "needs_repair", power: "grid_unreliable", connectivity: "good", devices: "few", need: "internet", verified: true },
      { daysAgo: 33, reporter: 5, enrollment: "gt600", building: "good", power: "grid_reliable", connectivity: "good", devices: "few", need: "internet", notes: "Le bâtiment a été rénové par la mairie.", verified: true },
      { daysAgo: 2, reporter: 3, enrollment: "gt600", building: "good", power: "grid_reliable", connectivity: "good", devices: "enough", need: "training", verified: false },
    ],
  },
  {
    name: "École Publique de la Rivière Chantante", region: "LT", town: "Edéa", lat: 3.80, lng: 10.13,
    assessments: [
      { daysAgo: 20, reporter: 4, enrollment: "100_300", building: "needs_repair", power: "generator", connectivity: "weak", devices: "few", need: "power", notes: "Le groupe électrogène coûte trop cher en carburant.", verified: false },
    ],
  },
  // West
  {
    name: "École des Hautes Terres", region: "OU", town: "Dschang", lat: 5.45, lng: 10.05,
    assessments: [
      { daysAgo: 25, reporter: 6, enrollment: "300_600", building: "good", power: "solar", connectivity: "weak", devices: "none", need: "computers", verified: true, photo: true },
      { daysAgo: 5, reporter: 6, enrollment: "300_600", building: "good", power: "solar", connectivity: "good", devices: "none", need: "computers", notes: "Le réseau mobile s'est amélioré. Nous sommes prêts pour des ordinateurs.", verified: false },
    ],
  },
  {
    name: "École Publique du Tambour d'Or", region: "OU", town: "Foumban", lat: 5.73, lng: 10.90,
    assessments: [
      { daysAgo: 11, reporter: 5, enrollment: "100_300", building: "needs_repair", power: "grid_unreliable", connectivity: "weak", devices: "none", need: "supplies", verified: false },
    ],
  },
  // Adamawa
  {
    name: "École Publique du Plateau Venteux", region: "AD", town: "Ngaoundéré", lat: 7.32, lng: 13.58,
    assessments: [
      { daysAgo: 18, reporter: 9, enrollment: "300_600", building: "needs_repair", power: "solar", connectivity: "weak", devices: "few", need: "computers", verified: true },
    ],
  },
  // North
  {
    name: "École Publique de l'Étoile du Nord", region: "NO", town: "Garoua", lat: 9.30, lng: 13.40,
    assessments: [
      { daysAgo: 38, reporter: 9, enrollment: "gt600", building: "unsafe", power: "none", connectivity: "weak", devices: "none", need: "building", verified: true, photo: true },
      { daysAgo: 7, reporter: 8, enrollment: "gt600", building: "unsafe", power: "none", connectivity: "weak", devices: "none", need: "building", notes: "Une salle de classe s'est effondrée pendant les pluies. Personne n'a été blessé.", verified: false },
    ],
  },
  // East
  {
    name: "École Publique de la Forêt Claire", region: "ES", town: "Bertoua", lat: 4.58, lng: 13.68,
    assessments: [
      { daysAgo: 16, reporter: 4, enrollment: "100_300", building: "needs_repair", power: "none", connectivity: "weak", devices: "none", need: "power", verified: false },
    ],
  },
  {
    name: "École Publique du Grand Fromager", region: "ES", town: "Batouri", lat: 4.43, lng: 14.36,
    assessments: [
      { daysAgo: 13, reporter: 5, enrollment: "lt100", building: "unsafe", power: "generator", connectivity: "none", devices: "none", need: "building", notes: "Les murs en terre s'abîment à chaque saison des pluies.", verified: false },
    ],
  },
  // Dependency examples: good buildings with no electricity.
  {
    name: "École Publique du Lac Bleu", region: "AD", town: "Meiganga", lat: 6.52, lng: 14.29,
    assessments: [
      { daysAgo: 6, reporter: 9, enrollment: "300_600", building: "good", power: "none", connectivity: "weak", devices: "none", need: "computers", notes: "Le bâtiment est solide, mais il n'y a pas d'électricité.", verified: false },
    ],
  },
  {
    name: "École Publique des Manguiers", region: "SU", town: "Ebolowa", lat: 2.90, lng: 11.15,
    assessments: [
      { daysAgo: 9, reporter: 7, enrollment: "100_300", building: "good", power: "none", connectivity: "good", devices: "enough", need: "internet", notes: "Nous avons reçu 15 ordinateurs portables, mais pas d'électricité pour les charger.", verified: true },
    ],
  },
  // South
  {
    name: "École Publique des Vagues Douces", region: "SU", town: "Kribi", lat: 2.94, lng: 9.91,
    assessments: [
      { daysAgo: 21, reporter: 7, enrollment: "100_300", building: "good", power: "solar", connectivity: "good", devices: "none", need: "computers", verified: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Prototype mock data for Match (C) and Deliver/Prove (D). All fictional.
// ---------------------------------------------------------------------------

export type PartnerType = "ngo" | "community_org" | "contractor" | "supplier";
export type TrustLevel = "new" | "referred" | "proven";
export type Service = Exclude<TopNeed, "other">;

export interface SeedPartner {
  key: string;
  name: string;
  type: PartnerType;
  /** null = works nationwide */
  region: string | null;
  town: string | null;
  services: Service[];
  trust: TrustLevel;
  projectsCompleted: number;
  referredBy?: string;
  joinedDaysAgo: number;
}

export const PARTNERS: SeedPartner[] = [
  // Nationwide
  { key: "solarbridge", name: "SolarBridge Cooperative", type: "supplier", region: null, town: null, services: ["power", "computers"], trust: "proven", projectsCompleted: 9, joinedDaysAgo: 400 },
  { key: "pages", name: "Pages for All Book Network", type: "ngo", region: null, town: null, services: ["supplies", "training"], trust: "proven", projectsCompleted: 12, joinedDaysAgo: 380 },
  { key: "openclass", name: "OpenClass Teacher Collective", type: "ngo", region: null, town: null, services: ["training", "computers", "internet"], trust: "referred", projectsCompleted: 3, referredBy: "pages", joinedDaysAgo: 200 },
  { key: "classrooms", name: "Classrooms Rising Foundation", type: "ngo", region: null, town: null, services: ["building", "furniture"], trust: "referred", projectsCompleted: 2, referredBy: "solarbridge", joinedDaysAgo: 150 },
  // Regional
  { key: "bamenda_builders", name: "Bamenda Builders Union", type: "contractor", region: "NW", town: "Bamenda", services: ["building", "furniture"], trust: "proven", projectsCompleted: 6, joinedDaysAgo: 320 },
  { key: "kumbo_parents", name: "Kumbo Parents Network", type: "community_org", region: "NW", town: "Kumbo", services: ["furniture", "supplies"], trust: "referred", projectsCompleted: 1, referredBy: "bamenda_builders", joinedDaysAgo: 90 },
  { key: "fako_action", name: "Fako Community Action", type: "community_org", region: "SW", town: "Buea", services: ["building", "supplies"], trust: "proven", projectsCompleted: 4, joinedDaysAgo: 290 },
  { key: "limbe_hub", name: "Limbe Digital Hub", type: "ngo", region: "SW", town: "Limbe", services: ["computers", "internet", "training"], trust: "referred", projectsCompleted: 1, referredBy: "fako_action", joinedDaysAgo: 120 },
  { key: "sahel_ecoles", name: "Sahel Écoles Solidaires", type: "ngo", region: "EN", town: "Maroua", services: ["building", "furniture", "supplies"], trust: "proven", projectsCompleted: 5, joinedDaysAgo: 350 },
  { key: "maroua_menuiserie", name: "Coopérative Menuiserie du Diamaré", type: "contractor", region: "EN", town: "Maroua", services: ["furniture"], trust: "new", projectsCompleted: 0, referredBy: "sahel_ecoles", joinedDaysAgo: 30 },
  { key: "yaounde_tech", name: "Tech pour Tous Centre", type: "ngo", region: "CE", town: "Yaoundé", services: ["computers", "internet", "training"], trust: "proven", projectsCompleted: 7, joinedDaysAgo: 410 },
  { key: "douala_batisseurs", name: "Bâtisseurs Associés du Wouri", type: "contractor", region: "LT", town: "Douala", services: ["building", "power"], trust: "referred", projectsCompleted: 2, referredBy: "classrooms", joinedDaysAgo: 140 },
  { key: "hauts_plateaux", name: "Hauts Plateaux Énergie", type: "supplier", region: "OU", town: "Dschang", services: ["power", "computers"], trust: "new", projectsCompleted: 0, referredBy: "solarbridge", joinedDaysAgo: 25 },
  { key: "benoue", name: "Bénoué Éducation Communautaire", type: "community_org", region: "NO", town: "Garoua", services: ["building", "supplies"], trust: "referred", projectsCompleted: 1, referredBy: "sahel_ecoles", joinedDaysAgo: 100 },
  { key: "foret_claire", name: "Coopérative de la Forêt Claire", type: "community_org", region: "ES", town: "Bertoua", services: ["building", "furniture"], trust: "new", projectsCompleted: 0, joinedDaysAgo: 40 },
];

export type ProjectStatus = "planned" | "in_progress" | "completed";
export type Tier = "tier0" | "tier1" | "tier2";

export interface SeedMilestone {
  title: string;
  done: boolean;
  /** Days from today; negative is in the past. */
  dueInDays: number;
  completedDaysAgo?: number;
  /** Attach a placeholder photo (building or delivery, never people). */
  photo?: boolean;
  verified?: boolean;
}

export interface SeedProject {
  school: string; // must match a SCHOOLS name
  partner: string; // PARTNERS key
  title: string;
  intervention: Service;
  tier: Tier;
  status: ProjectStatus;
  budgetUsd: number;
  startedDaysAgo?: number;
  completedDaysAgo?: number;
  milestones: SeedMilestone[];
}

export const PROJECTS: SeedProject[] = [
  {
    school: "Lycée des Sept Collines", partner: "yaounde_tech", title: "Computer lab with 20 laptops", intervention: "computers", tier: "tier2",
    status: "completed", budgetUsd: 14000, startedDaysAgo: 75, completedDaysAgo: 42,
    milestones: [
      { title: "Laptops purchased", done: true, dueInDays: -70, completedDaysAgo: 68, verified: true },
      { title: "Delivered to school", done: true, dueInDays: -60, completedDaysAgo: 58, photo: true, verified: true },
      { title: "Lab installed and tested", done: true, dueInDays: -50, completedDaysAgo: 47, photo: true, verified: true },
      { title: "Handover to headteacher", done: true, dueInDays: -42, completedDaysAgo: 42, verified: true },
    ],
  },
  {
    school: "École Publique du Baobab Doré", partner: "sahel_ecoles", title: "Roof repair for two classrooms", intervention: "building", tier: "tier0",
    status: "completed", budgetUsd: 6500, startedDaysAgo: 40, completedDaysAgo: 12,
    milestones: [
      { title: "Materials purchased", done: true, dueInDays: -35, completedDaysAgo: 36, verified: true },
      { title: "Roof frame rebuilt", done: true, dueInDays: -22, completedDaysAgo: 20, photo: true, verified: true },
      { title: "Roof sheets installed", done: true, dueInDays: -14, completedDaysAgo: 12, photo: true, verified: false },
    ],
  },
  {
    school: "Morning Star Community School", partner: "bamenda_builders", title: "Emergency roof and wall repair", intervention: "building", tier: "tier0",
    status: "in_progress", budgetUsd: 8200, startedDaysAgo: 16,
    milestones: [
      { title: "Materials purchased", done: true, dueInDays: -12, completedDaysAgo: 11, photo: true, verified: true },
      { title: "Walls reinforced", done: false, dueInDays: 5 },
      { title: "New roof installed", done: false, dueInDays: 20 },
      { title: "Final inspection with photo", done: false, dueInDays: 28 },
    ],
  },
  {
    school: "Palm Grove Nursery and Primary", partner: "limbe_hub", title: "Offline learning kit: content server and 10 tablets", intervention: "computers", tier: "tier1",
    status: "in_progress", budgetUsd: 4800, startedDaysAgo: 20,
    milestones: [
      { title: "Tablets and server purchased", done: true, dueInDays: -15, completedDaysAgo: 14, verified: true },
      { title: "Delivered to school", done: true, dueInDays: -6, completedDaysAgo: 5, photo: true, verified: false },
      { title: "Teachers trained", done: false, dueInDays: 10 },
    ],
  },
  {
    school: "Complexe Scolaire Les Palmiers Bleus", partner: "openclass", title: "Teacher training on digital tools", intervention: "training", tier: "tier2",
    status: "in_progress", budgetUsd: 2500, startedDaysAgo: 10,
    milestones: [
      { title: "Trainer confirmed", done: true, dueInDays: -8, completedDaysAgo: 9, verified: true },
      { title: "Session 1 held", done: false, dueInDays: 4 },
      { title: "Session 2 held", done: false, dueInDays: 18 },
      { title: "Follow-up visit", done: false, dueInDays: 45 },
    ],
  },
  {
    school: "École des Hautes Terres", partner: "solarbridge", title: "Offline learning kit: content server and 10 tablets", intervention: "computers", tier: "tier1",
    status: "planned", budgetUsd: 4800,
    milestones: [
      { title: "Tablets and server purchased", done: false, dueInDays: 14 },
      { title: "Delivered to school", done: false, dueInDays: 30 },
      { title: "Teachers trained", done: false, dueInDays: 40 },
    ],
  },
  {
    school: "École Publique du Baobab Doré", partner: "maroua_menuiserie", title: "120 desks (tables-bancs)", intervention: "furniture", tier: "tier0",
    status: "planned", budgetUsd: 3600,
    milestones: [
      { title: "Order placed", done: false, dueInDays: 7 },
      { title: "Desks delivered", done: false, dueInDays: 35 },
      { title: "Final check with photo", done: false, dueInDays: 40 },
    ],
  },
  {
    school: "École Publique de l'Étoile du Nord", partner: "benoue", title: "Rebuild collapsed classroom", intervention: "building", tier: "tier0",
    status: "planned", budgetUsd: 9500,
    milestones: [
      { title: "Site assessment", done: false, dueInDays: 10 },
      { title: "Materials purchased", done: false, dueInDays: 25 },
      { title: "Classroom rebuilt", done: false, dueInDays: 75 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Resources (prototype mock data): what PS43 could deploy. All providers are fictional.
// ---------------------------------------------------------------------------

export type ResourceKind = "equipment" | "funding" | "expertise";

export interface SeedResource {
  name: string;
  kind: ResourceKind;
  /** null = any need (unrestricted funding). */
  need: TopNeed | null;
  quantity?: number;
  unit?: string;
  valueUsd?: number;
  location: string;
  provider: string;
}

export const RESOURCES: SeedResource[] = [
  { name: "Refurbished laptops", kind: "equipment", need: "computers", quantity: 40, unit: "laptops", valueUsd: 6000, location: "Toronto (to ship)", provider: "Maplewood Tech Recyclers (fictional)" },
  { name: "Tablets with offline lessons", kind: "equipment", need: "computers", quantity: 30, unit: "tablets", valueUsd: 4500, location: "Douala warehouse", provider: "Kribi Digital Supplies (fictional)" },
  { name: "Solar classroom kits", kind: "equipment", need: "power", quantity: 5, unit: "kits", valueUsd: 17500, location: "Douala", provider: "Soleil Wouri Énergie (fictional)" },
  { name: "Desk-benches", kind: "equipment", need: "furniture", quantity: 200, unit: "desk-benches", valueUsd: 6000, location: "Yaoundé workshop", provider: "Atelier Mfoundi (fictional)" },
  { name: "Solar fund", kind: "funding", need: "power", valueUsd: 10000, location: "PS43", provider: "Northern Lights Family Foundation (fictional)" },
  { name: "Book drive", kind: "funding", need: "supplies", valueUsd: 3000, location: "PS43", provider: "Toronto community book drive (fictional)" },
  { name: "Unrestricted fund", kind: "funding", need: null, valueUsd: 25000, location: "PS43", provider: "PS43 general donations" },
  { name: "Volunteer teacher trainers", kind: "expertise", need: "training", quantity: 6, unit: "trainers", location: "Centre and Littoral", provider: "Bilingual Teachers Network (fictional)" },
  { name: "Solar installer team", kind: "expertise", need: "power", quantity: 1, unit: "team", location: "Douala", provider: "Soleil Wouri Énergie (fictional)" },
];
