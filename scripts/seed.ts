import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import {
  articleEvents,
  articles,
  revisions,
  sectionWriters,
  sections,
  sessions,
  users,
  type ArticleStatus,
} from "../lib/db/schema";

// Node 20.12+ can load the env file without dotenv.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local is optional for the seed script.
}

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const db = drizzle(client);

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const ago = (days: number, hours = 0) =>
  new Date(now - days * DAY - hours * 60 * 60 * 1000);
const ahead = (days: number, hours = 0) =>
  new Date(now + days * DAY + hours * 60 * 60 * 1000);

const USER_IDS = {
  maya: "u-maya",
  daniel: "u-daniel",
  ravi: "u-ravi",
  lena: "u-lena",
} as const;

const SECTION_IDS = {
  politics: "s-politics",
  culture: "s-culture",
  tech: "s-tech",
  business: "s-business",
} as const;

type SeedArticle = {
  id: string;
  sectionId: string;
  authorId: string;
  title: string;
  body: string;
  status: ArticleStatus;
  publishAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  alertDismissedAt?: Date | null;
  revision?: { id: string; title: string; body: string; status: ArticleStatus };
  comments?: Array<{ actorId: string; message: string; at: Date }>;
};

const SEED_ARTICLES: SeedArticle[] = [
  {
    id: "a-transit-levy",
    sectionId: SECTION_IDS.politics,
    authorId: USER_IDS.ravi,
    title: "Council approves transit levy after late debate",
    body: "The council voted 7-4 to approve the levy after a session that ran past midnight. The money is earmarked for bus frequency and two new tram stops. Opponents argued the burden falls on households without a car, while supporters pointed to the cost of doing nothing.",
    status: "published",
    publishAt: ago(49),
    createdAt: ago(56),
    updatedAt: ago(49),
    comments: [
      {
        actorId: USER_IDS.maya,
        message: "Great detail on the vote split. Added the corrected figure to the second paragraph.",
        at: ago(50),
      },
    ],
  },
  {
    id: "a-cinema",
    sectionId: SECTION_IDS.culture,
    authorId: USER_IDS.lena,
    title: "The quiet return of the neighbourhood cinema",
    body: "Three single-screen cinemas reopened this year, all run by volunteers. Their programming is deliberately local: school screenings in the morning, repertory films at night, and a Sunday matinee that has become a community fixture.",
    status: "published",
    publishAt: ago(42),
    createdAt: ago(48),
    updatedAt: ago(42),
  },
  {
    id: "a-data-team",
    sectionId: SECTION_IDS.tech,
    authorId: USER_IDS.ravi,
    title: "Why the city's data team moved off spreadsheets",
    body: "After a budgeting error traced to a stale spreadsheet, the data team rebuilt its pipeline around a single source of truth. The migration took four months and cost less than the error it was meant to prevent.",
    status: "published",
    publishAt: ago(35),
    createdAt: ago(40),
    updatedAt: ago(35),
  },
  {
    id: "a-budget-vote",
    sectionId: SECTION_IDS.politics,
    authorId: USER_IDS.ravi,
    title: "Budget vote: what actually changed",
    body: "The amended budget adds funding for two libraries and cuts a planned vehicle purchase. Here is a line-by-line comparison of the original proposal and the version that passed.",
    status: "published",
    publishAt: ago(28),
    createdAt: ago(33),
    updatedAt: ago(28),
    comments: [
      {
        actorId: USER_IDS.maya,
        message: "The comparison table is the most useful thing we have published this month.",
        at: ago(27),
      },
    ],
  },
  {
    id: "a-muralists",
    sectionId: SECTION_IDS.culture,
    authorId: USER_IDS.lena,
    title: "A studio tour with the muralists of East Row",
    body: "Six artists share a former warehouse and a rotating set of walls. Their work is less about a signature style than about who else is in the room.",
    status: "published",
    publishAt: ago(21),
    createdAt: ago(26),
    updatedAt: ago(21),
  },
  {
    id: "a-repair-startup",
    sectionId: SECTION_IDS.tech,
    authorId: USER_IDS.ravi,
    title: "The startup betting on repair over replacement",
    body: "A small team is building a repair network for household appliances, starting with the machines that are cheapest to fix and hardest to recycle.",
    status: "published",
    publishAt: ago(14),
    createdAt: ago(19),
    updatedAt: ago(14),
  },
  {
    id: "a-night-market",
    sectionId: SECTION_IDS.culture,
    authorId: USER_IDS.lena,
    title: "Portraits from the night market",
    body: "Twelve vendors, one alley, and the hours between dusk and midnight. A photo essay about the people who make the market work.",
    status: "published",
    publishAt: ago(7),
    createdAt: ago(11),
    updatedAt: ago(7),
  },
  {
    id: "a-zoning",
    sectionId: SECTION_IDS.business,
    authorId: USER_IDS.lena,
    title: "How the new zoning rules affect small landlords",
    body: "The rules allow two additional units on lots above a certain size. For owners of small buildings, the practical question is financing, not permission.",
    status: "published",
    publishAt: ago(3),
    createdAt: ago(6),
    updatedAt: ago(3),
  },
  {
    id: "a-batteries",
    sectionId: SECTION_IDS.tech,
    authorId: USER_IDS.ravi,
    title: "Inside the lab testing cheaper batteries",
    body: "The lab's sodium-ion prototypes are not going to power a car. They might make grid storage cheap enough to matter.",
    status: "published",
    publishAt: ago(2),
    createdAt: ago(5),
    updatedAt: ago(2),
    revision: {
      id: "r-batteries",
      title: "Inside the lab testing cheaper batteries",
      body: "The lab's sodium-ion prototypes are not going to power a car. They might make grid storage cheap enough to matter. Updated with the latest cycle-life numbers from the second test batch.",
      status: "draft",
    },
  },
  {
    id: "a-election-night",
    sectionId: SECTION_IDS.politics,
    authorId: USER_IDS.ravi,
    title: "Election night: five races to watch",
    body: "A guide to the contests that will decide the balance of the council, with the numbers that matter in each one.",
    status: "scheduled",
    publishAt: ahead(3),
    createdAt: ago(4),
    updatedAt: ago(1),
  },
  {
    id: "a-archive",
    sectionId: SECTION_IDS.culture,
    authorId: USER_IDS.lena,
    title: "The archive nobody catalogued",
    body: "A basement of tapes, photographs and letters has been sitting unlisted for thirty years. The volunteers trying to fix that are running out of time.",
    status: "scheduled",
    publishAt: ago(2),
    createdAt: ago(9),
    updatedAt: ago(2),
  },
  {
    id: "a-fibre",
    sectionId: SECTION_IDS.tech,
    authorId: USER_IDS.ravi,
    title: "What the fibre rollout missed",
    body: "The map says the city is covered. The streets say otherwise. We checked the addresses that the rollout skipped.",
    status: "scheduled",
    publishAt: ago(5),
    createdAt: ago(12),
    updatedAt: ago(5),
    alertDismissedAt: ago(4),
  },
  {
    id: "a-council-voice",
    sectionId: SECTION_IDS.politics,
    authorId: USER_IDS.ravi,
    title: "A new voice in the council chamber",
    body: "The newest councillor ran on a promise to publish every committee vote. Six months in, the record is mixed.",
    status: "in_review",
    publishAt: null,
    createdAt: ago(2),
    updatedAt: ago(1),
    comments: [
      {
        actorId: USER_IDS.maya,
        message: "Can we get a response from the council press office before this goes up?",
        at: ago(1),
      },
    ],
  },
  {
    id: "a-gallery",
    sectionId: SECTION_IDS.culture,
    authorId: USER_IDS.lena,
    title: "The gallery reopens with a smaller collection",
    body: "After two years of renovation, the gallery has reopened with half the works on display and a new focus on rotation.",
    status: "in_review",
    publishAt: null,
    createdAt: ago(3),
    updatedAt: ago(1),
  },
  {
    id: "a-ferry",
    sectionId: SECTION_IDS.politics,
    authorId: USER_IDS.ravi,
    title: "Why the ferry timetable keeps slipping",
    body: "The timetable has changed four times in eighteen months. The reasons are part maintenance, part procurement, and part optimism.",
    status: "approved",
    publishAt: null,
    createdAt: ago(7),
    updatedAt: ago(2),
  },
  {
    id: "a-port-strike",
    sectionId: SECTION_IDS.politics,
    authorId: USER_IDS.ravi,
    title: "Notes from the port strike",
    body: "Reporting notes and interviews from the picket line. Not yet structured into a story.",
    status: "draft",
    publishAt: null,
    createdAt: ago(1),
    updatedAt: ago(1),
  },
  {
    id: "a-slow-software",
    sectionId: SECTION_IDS.tech,
    authorId: USER_IDS.ravi,
    title: "The case for slower software",
    body: "Draft argument about maintenance, upgrades and the hidden cost of always shipping.",
    status: "draft",
    publishAt: null,
    createdAt: ago(1),
    updatedAt: ago(0, 6),
  },
];

async function main() {
  // Reset so the seed can be re-run safely.
  await db.delete(articleEvents);
  await db.delete(revisions);
  await db.delete(articles);
  await db.delete(sectionWriters);
  await db.delete(sections);
  await db.delete(sessions);
  await db.delete(users);

  await db.insert(users).values([
    {
      id: USER_IDS.maya,
      email: "editor@newsroom.test",
      name: "Maya Iyer",
      role: "editor",
      passwordHash: hashPassword("editor123"),
      createdAt: ago(90),
    },
    {
      id: USER_IDS.daniel,
      email: "editor2@newsroom.test",
      name: "Daniel Okafor",
      role: "editor",
      passwordHash: hashPassword("editor123"),
      createdAt: ago(90),
    },
    {
      id: USER_IDS.ravi,
      email: "writer@newsroom.test",
      name: "Ravi Sharma",
      role: "writer",
      passwordHash: hashPassword("writer123"),
      createdAt: ago(80),
    },
    {
      id: USER_IDS.lena,
      email: "writer2@newsroom.test",
      name: "Lena Fischer",
      role: "writer",
      passwordHash: hashPassword("writer123"),
      createdAt: ago(80),
    },
  ]);

  await db.insert(sections).values([
    {
      id: SECTION_IDS.politics,
      name: "Politics",
      description: "Council, elections and the machinery of the city.",
      ownerEditorId: USER_IDS.maya,
      createdAt: ago(85),
      updatedAt: ago(85),
    },
    {
      id: SECTION_IDS.culture,
      name: "Culture",
      description: "Art, film, music and the people making it.",
      ownerEditorId: USER_IDS.maya,
      createdAt: ago(85),
      updatedAt: ago(85),
    },
    {
      id: SECTION_IDS.tech,
      name: "Tech",
      description: "Infrastructure, startups and the systems underneath.",
      ownerEditorId: USER_IDS.daniel,
      createdAt: ago(85),
      updatedAt: ago(85),
    },
    {
      id: SECTION_IDS.business,
      name: "Business",
      description: "Small business, labour and the local economy. Retired from the default views.",
      ownerEditorId: USER_IDS.maya,
      archivedAt: ago(4),
      createdAt: ago(85),
      updatedAt: ago(4),
    },
  ]);

  await db.insert(sectionWriters).values([
    { sectionId: SECTION_IDS.politics, userId: USER_IDS.ravi },
    { sectionId: SECTION_IDS.tech, userId: USER_IDS.ravi },
    { sectionId: SECTION_IDS.culture, userId: USER_IDS.lena },
    { sectionId: SECTION_IDS.tech, userId: USER_IDS.lena },
    { sectionId: SECTION_IDS.business, userId: USER_IDS.lena },
  ]);

  await db.insert(articles).values(
    SEED_ARTICLES.map((article) => ({
      id: article.id,
      sectionId: article.sectionId,
      authorId: article.authorId,
      title: article.title,
      body: article.body,
      status: article.status,
      publishAt: article.publishAt,
      alertDismissedAt: article.alertDismissedAt ?? null,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    })),
  );

  for (const article of SEED_ARTICLES) {
    if (!article.revision) continue;
    await db.insert(revisions).values({
      id: article.revision.id,
      articleId: article.id,
      authorId: article.authorId,
      title: article.revision.title,
      body: article.revision.body,
      status: article.revision.status,
      createdAt: new Date(article.updatedAt.getTime() + 60 * 60 * 1000),
      updatedAt: new Date(article.updatedAt.getTime() + 60 * 60 * 1000),
    });
  }

  for (const article of SEED_ARTICLES) {
    const events: Array<{
      id: string;
      articleId: string;
      type: "created" | "status_changed" | "revision_opened" | "revision_published" | "comment";
      actorId: string;
      fromStatus?: ArticleStatus | null;
      toStatus?: ArticleStatus | null;
      revisionId?: string | null;
      message?: string | null;
      createdAt: Date;
    }> = [];

    events.push({
      id: randomUUID(),
      articleId: article.id,
      type: "created",
      actorId: article.authorId,
      toStatus: "draft",
      createdAt: article.createdAt,
    });

    const submittedAt = new Date(article.createdAt.getTime() + 6 * 60 * 60 * 1000);
    const approvedAt = new Date(submittedAt.getTime() + 18 * 60 * 60 * 1000);

    if (article.status !== "draft") {
      events.push({
        id: randomUUID(),
        articleId: article.id,
        type: "status_changed",
        actorId: article.authorId,
        fromStatus: "draft",
        toStatus: "in_review",
        createdAt: submittedAt,
      });
    }

    if (
      article.status === "approved" ||
      article.status === "scheduled" ||
      article.status === "published"
    ) {
      events.push({
        id: randomUUID(),
        articleId: article.id,
        type: "status_changed",
        actorId: USER_IDS.maya,
        fromStatus: "in_review",
        toStatus: "approved",
        createdAt: approvedAt,
      });
    }

    if (article.status === "scheduled" && article.publishAt) {
      events.push({
        id: randomUUID(),
        articleId: article.id,
        type: "status_changed",
        actorId: USER_IDS.daniel,
        fromStatus: "approved",
        toStatus: "scheduled",
        message: "Scheduled for a future publish time",
        createdAt: new Date(article.publishAt.getTime() - 2 * DAY),
      });
    }

    if (article.status === "published" && article.publishAt) {
      events.push({
        id: randomUUID(),
        articleId: article.id,
        type: "status_changed",
        actorId: USER_IDS.daniel,
        fromStatus: "approved",
        toStatus: "published",
        createdAt: article.publishAt,
      });
    }

    for (const comment of article.comments ?? []) {
      events.push({
        id: randomUUID(),
        articleId: article.id,
        type: "comment",
        actorId: comment.actorId,
        message: comment.message,
        createdAt: comment.at,
      });
    }

    if (article.revision) {
      events.push({
        id: randomUUID(),
        articleId: article.id,
        type: "revision_opened",
        actorId: article.authorId,
        revisionId: article.revision.id,
        toStatus: "draft",
        message: "Revision opened",
        createdAt: new Date(article.updatedAt.getTime() + 60 * 60 * 1000),
      });
    }

    await db.insert(articleEvents).values(events);
  }

  const counts = await db.select({ id: articles.id }).from(articles);
  console.log(
    `Seeded ${counts.length} articles, ${SEED_ARTICLES.length} timelines, 4 users and 4 sections.`,
  );
  console.log("editor@newsroom.test / editor123");
  console.log("writer@newsroom.test / writer123");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
