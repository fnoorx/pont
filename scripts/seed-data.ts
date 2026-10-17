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
  // South
  {
    name: "École Publique des Vagues Douces", region: "SU", town: "Kribi", lat: 2.94, lng: 9.91,
    assessments: [
      { daysAgo: 21, reporter: 7, enrollment: "100_300", building: "good", power: "solar", connectivity: "good", devices: "none", need: "computers", verified: true },
    ],
  },
];
